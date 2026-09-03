import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MapaAsientosClient } from "./MapaAsientosClient";
import type {
  Asiento,
  AsistenciaViajero,
  Cliente,
  Hotel,
  Observacion,
  Pago,
  Reserva,
  ReservaPasajero,
  Servicio,
} from "@/lib/types";

export default async function ServicioPage({ params }: PageProps<"/servicios/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: s } = await supabase
    .from("servicios")
    .select(
      "id, agencia_id, origen, destino, fecha, hora, tipo_coche, unidad, precio_pasaje, incluye_hotel, hotel_id, tipos_habitacion_disponibles, incluye_asistencia, asistencia_id, observaciones_ids",
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
    precioPasaje: Number(s.precio_pasaje),
    incluyeHotel: s.incluye_hotel,
    hotelId: s.hotel_id,
    tiposHabitacionDisponibles: s.tipos_habitacion_disponibles ?? [],
    incluyeAsistencia: s.incluye_asistencia,
    asistenciaId: s.asistencia_id,
    observacionesIds: s.observaciones_ids ?? [],
  };

  const [{ data: asientosData }, { data: reservasData }, hotelRes, asistRes, obsRes] = await Promise.all([
    supabase.from("asientos").select("id, servicio_id, numero, piso, estado").eq("servicio_id", id),
    supabase
      .from("reservas")
      .select("id, agencia_id, servicio_id, habitacion_tipo, codigo_validacion")
      .eq("servicio_id", id),
    servicio.hotelId
      ? supabase.from("hoteles").select("id, agencia_id, nombre, contacto, telefono").eq("id", servicio.hotelId).single()
      : Promise.resolve({ data: null }),
    servicio.asistenciaId
      ? supabase
          .from("asistencias_viajero")
          .select("id, agencia_id, nombre, contacto, telefono")
          .eq("id", servicio.asistenciaId)
          .single()
      : Promise.resolve({ data: null }),
    servicio.observacionesIds.length > 0
      ? supabase.from("observaciones").select("id, agencia_id, titulo, texto").in("id", servicio.observacionesIds)
      : Promise.resolve({ data: [] }),
  ]);

  const asientos: Asiento[] = (asientosData ?? []).map((a) => ({
    id: a.id,
    servicioId: a.servicio_id,
    numero: a.numero,
    piso: a.piso,
    estado: a.estado,
  }));

  const reservas: Reserva[] = (reservasData ?? []).map((r) => ({
    id: r.id,
    agenciaId: r.agencia_id,
    servicioId: r.servicio_id,
    habitacionTipo: r.habitacion_tipo,
    codigoValidacion: r.codigo_validacion ?? "",
  }));

  const reservaIds = reservas.map((r) => r.id);
  const { data: rpData } =
    reservaIds.length > 0
      ? await supabase
          .from("reserva_pasajeros")
          .select("id, reserva_id, asiento_id, cliente_id, es_responsable, precio")
          .in("reserva_id", reservaIds)
      : { data: [] };

  const reservaPasajeros: ReservaPasajero[] = (rpData ?? []).map((rp) => ({
    id: rp.id,
    reservaId: rp.reserva_id,
    asientoId: rp.asiento_id,
    clienteId: rp.cliente_id,
    esResponsable: rp.es_responsable,
    precio: Number(rp.precio),
  }));

  const clienteIds = [...new Set(reservaPasajeros.map((rp) => rp.clienteId))];
  const rpIds = reservaPasajeros.map((rp) => rp.id);

  const [{ data: clientesData }, { data: pagosData }] = await Promise.all([
    clienteIds.length > 0
      ? supabase
          .from("clientes")
          .select(
            "id, agencia_id, nombre, apellido, dni, nacimiento, telefono, email, localidad, emer_nombre, emer_telefono, emer_parentesco, obra_social, obra_social_nro",
          )
          .in("id", clienteIds)
      : Promise.resolve({ data: [] }),
    rpIds.length > 0
      ? supabase.from("pagos").select("id, reserva_pasajero_id, monto, medio_pago, fecha").in("reserva_pasajero_id", rpIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clientes: Cliente[] = (clientesData ?? []).map((c) => ({
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

  const pagos: Pago[] = (pagosData ?? []).map((p) => ({
    id: p.id,
    reservaPasajeroId: p.reserva_pasajero_id,
    monto: Number(p.monto),
    medioPago: p.medio_pago,
    fecha: p.fecha,
  }));

  const hotel: Hotel | null = hotelRes.data
    ? {
        id: hotelRes.data.id,
        agenciaId: hotelRes.data.agencia_id,
        nombre: hotelRes.data.nombre,
        contacto: hotelRes.data.contacto ?? "",
        telefono: hotelRes.data.telefono ?? "",
      }
    : null;

  const asistencia: AsistenciaViajero | null = asistRes.data
    ? {
        id: asistRes.data.id,
        agenciaId: asistRes.data.agencia_id,
        nombre: asistRes.data.nombre,
        contacto: asistRes.data.contacto ?? "",
        telefono: asistRes.data.telefono ?? "",
      }
    : null;

  const observaciones: Observacion[] = (obsRes.data ?? []).map((o) => ({
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
