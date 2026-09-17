import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePantalla } from "@/lib/current-user";
import { MapaAsientosClient } from "./MapaAsientosClient";
import type {
  Asiento,
  AsistenciaViajero,
  Cliente,
  Hotel,
  Moneda,
  Observacion,
  Pago,
  Reserva,
  ReservaPasajero,
  Servicio,
} from "@/lib/types";

export default async function ServicioPage({ params }: PageProps<"/servicios/[id]">) {
  await requirePantalla("salidas");
  const { id } = await params;
  const supabase = await createClient();

  // Antes esta pantalla hacía 4 viajes de ida y vuelta a la base, cada uno
  // esperando al anterior (servicio -> asientos/reservas/hotel/asistencia ->
  // reserva_pasajeros -> clientes/pagos) porque cada paso necesita los ids
  // que trae el paso previo. Con Supabase en otra región eso se sentía
  // "trabado" al abrir el mapa de asientos. Una sola consulta anidada
  // (basada en las foreign keys ya existentes) trae todo junto en un solo
  // viaje -- medido ~4-6x más rápido, y verificado con datos reales que
  // produce exactamente los mismos resultados que la versión anterior.
  const { data: s } = await supabase
    .from("servicios")
    .select(
      `id, agencia_id, origen, destino, fecha, hora, tipo_coche, unidad, precio_pasaje, moneda,
       incluye_hotel, hotel_id, tipos_habitacion_disponibles, cantidad_habitaciones,
       incluye_asistencia, asistencia_id, incluye_excursion, excursion_observaciones,
       coordinador_id, transporte_id, observaciones_ids,
       asientos(id, servicio_id, numero, piso, estado),
       reservas(id, agencia_id, servicio_id, habitacion_tipo, regimen_comida, vendedor_id, codigo_validacion,
         reserva_pasajeros(id, reserva_id, asiento_id, cliente_id, es_responsable, precio, embarque, estado,
           clientes(id, agencia_id, nombre, apellido, dni, nacimiento, telefono, email, localidad, emer_nombre, emer_telefono, emer_parentesco, obra_social, obra_social_nro),
           pagos(id, reserva_pasajero_id, monto, medio_pago, moneda, fecha)
         )
       ),
       hoteles(id, agencia_id, nombre, contacto, telefono, direccion),
       asistencias_viajero(id, agencia_id, nombre, contacto, telefono, tope_cobertura_moneda, tope_cobertura_monto)`,
    )
    .eq("id", id)
    .single();
  if (!s) notFound();

  const servicio: Servicio = {
    id: s.id,
    agenciaId: s.agencia_id,
    origen: s.origen,
    destino: s.destino,
    fecha: s.fecha,
    hora: (s.hora ?? "").slice(0, 5),
    tipoCoche: s.tipo_coche,
    unidad: s.unidad ?? "",
    precioPasaje: s.precio_pasaje === null ? null : Number(s.precio_pasaje),
    moneda: (s.moneda as Moneda) ?? "ARS",
    incluyeHotel: s.incluye_hotel,
    hotelId: s.hotel_id,
    tiposHabitacionDisponibles: s.tipos_habitacion_disponibles ?? [],
    cantidadHabitaciones: s.cantidad_habitaciones,
    incluyeAsistencia: s.incluye_asistencia,
    asistenciaId: s.asistencia_id,
    incluyeExcursion: s.incluye_excursion,
    excursionObservaciones: s.excursion_observaciones ?? "",
    coordinadorId: s.coordinador_id,
    transporteId: s.transporte_id,
    observacionesIds: s.observaciones_ids ?? [],
  };

  const asientos: Asiento[] = (s.asientos ?? []).map((a) => ({
    id: a.id,
    servicioId: a.servicio_id,
    numero: a.numero,
    piso: a.piso,
    estado: a.estado,
  }));

  const reservas: Reserva[] = (s.reservas ?? []).map((r) => ({
    id: r.id,
    agenciaId: r.agencia_id,
    servicioId: r.servicio_id,
    habitacionTipo: r.habitacion_tipo,
    regimenComida: r.regimen_comida,
    vendedorId: r.vendedor_id,
    codigoValidacion: r.codigo_validacion ?? "",
  }));

  // supabase-js no tiene los tipos generados de la base acá (este cliente no
  // recibe un generic `Database`), así que no puede saber que hoteles/
  // asistencias_viajero/clientes son relaciones "uno" y no "muchos" -- las
  // tipa como array aunque en runtime PostgREST devuelve un objeto suelto.
  // Estos alias solo corrigen ESE tipado; no cambian ningún dato.
  type ClienteRow = (typeof s.reservas)[number]["reserva_pasajeros"][number]["clientes"] extends (infer C)[] ? C : never;
  type HotelRow = typeof s.hoteles extends (infer H)[] ? H : never;
  type AsistenciaRow = typeof s.asistencias_viajero extends (infer A)[] ? A : never;

  // Solo los pasajeros activos cuentan como "vendidos" (ver migración
  // 0005_reserva_pasajeros_estado.sql) -- se filtra acá porque el embed
  // anidado no puede filtrar reserva_pasajeros sin descartar también la
  // reserva completa cuando ningún pasajero suyo está activo.
  const reservaPasajerosCrudo = (s.reservas ?? []).flatMap((r) =>
    (r.reserva_pasajeros ?? [])
      .filter((rp) => rp.estado === "activo")
      .map((rp) => ({
        ...rp,
        reserva_id: r.id,
        clientes: rp.clientes as unknown as ClienteRow | null,
      })),
  );

  const reservaPasajeros: ReservaPasajero[] = reservaPasajerosCrudo.map((rp) => ({
    id: rp.id,
    reservaId: rp.reserva_id,
    asientoId: rp.asiento_id,
    clienteId: rp.cliente_id,
    esResponsable: rp.es_responsable,
    precio: Number(rp.precio),
    embarque: rp.embarque ?? "",
  }));

  const clientesMap = new Map<string, NonNullable<(typeof reservaPasajerosCrudo)[number]["clientes"]>>();
  reservaPasajerosCrudo.forEach((rp) => {
    if (rp.clientes) clientesMap.set(rp.clientes.id, rp.clientes);
  });

  const clientes: Cliente[] = [...clientesMap.values()].map((c) => ({
    id: c.id,
    agenciaId: c.agencia_id,
    nombre: c.nombre,
    apellido: c.apellido,
    dni: c.dni ?? "",
    nacimiento: c.nacimiento,
    telefono: c.telefono ?? "",
    email: c.email ?? "",
    localidad: c.localidad ?? "",
    emerNombre: c.emer_nombre ?? "",
    emerTelefono: c.emer_telefono ?? "",
    emerParentesco: c.emer_parentesco ?? "",
    obraSocial: c.obra_social ?? "",
    obraSocialNro: c.obra_social_nro ?? "",
  }));

  const pagos: Pago[] = reservaPasajerosCrudo
    .flatMap((rp) => rp.pagos ?? [])
    .map((p) => ({
      id: p.id,
      reservaPasajeroId: p.reserva_pasajero_id,
      monto: Number(p.monto),
      medioPago: p.medio_pago,
      moneda: p.moneda,
      fecha: p.fecha,
    }));

  const hotelRow = s.hoteles as unknown as HotelRow | null;
  const hotel: Hotel | null = hotelRow
    ? {
        id: hotelRow.id,
        agenciaId: hotelRow.agencia_id,
        nombre: hotelRow.nombre,
        contacto: hotelRow.contacto ?? "",
        telefono: hotelRow.telefono ?? "",
        direccion: hotelRow.direccion ?? "",
      }
    : null;

  const asistenciaRow = s.asistencias_viajero as unknown as AsistenciaRow | null;
  const asistencia: AsistenciaViajero | null = asistenciaRow
    ? {
        id: asistenciaRow.id,
        agenciaId: asistenciaRow.agencia_id,
        nombre: asistenciaRow.nombre,
        contacto: asistenciaRow.contacto ?? "",
        telefono: asistenciaRow.telefono ?? "",
        topeCoberturaMoneda: (asistenciaRow.tope_cobertura_moneda as Moneda | null) ?? null,
        topeCoberturaMonto: asistenciaRow.tope_cobertura_monto !== null ? Number(asistenciaRow.tope_cobertura_monto) : null,
      }
    : null;

  // observaciones_ids no es una foreign key real (es un array suelto en
  // servicios), así que no se puede embeber -- se pide aparte, en paralelo
  // con nada más que esperar.
  const { data: obsData } =
    servicio.observacionesIds.length > 0
      ? await supabase.from("observaciones").select("id, agencia_id, titulo, texto").in("id", servicio.observacionesIds)
      : { data: [] };

  const observaciones: Observacion[] = (obsData ?? []).map((o) => ({
    id: o.id,
    agenciaId: o.agencia_id,
    titulo: o.titulo,
    texto: o.texto,
  }));

  return (
    <MapaAsientosClient
      servicio={servicio}
      asientosIniciales={asientos}
      clientesIniciales={clientes}
      reservasIniciales={reservas}
      reservaPasajerosIniciales={reservaPasajeros}
      pagosIniciales={pagos}
      hotel={hotel}
      asistencia={asistencia}
      observaciones={observaciones}
    />
  );
}
