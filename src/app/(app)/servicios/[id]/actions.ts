"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";
import { limpiarDni, formatTelefonoWhatsapp } from "@/lib/format";
import type { PasajeroForm } from "./ReservationWizard";
import type { CobroInicial, TipoHabitacion } from "@/lib/types";

export interface CrearReservaGrupalInput {
  servicioId: string;
  asientoIds: string[]; // mismo orden que `forms`
  forms: PasajeroForm[];
  responsableIdx: number;
  habitacionTipo: TipoHabitacion | null;
  precioPasaje: number;
  codigoValidacion: string;
  cobro: CobroInicial;
}

export async function crearReservaGrupal(input: CrearReservaGrupalInput) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "salidas")) throw new Error("No autorizado");
  if (!input.precioPasaje || input.precioPasaje <= 0) {
    throw new Error("El precio del pasaje tiene que ser mayor a 0");
  }

  const supabase = await createClient();

  const { data: reserva, error: reservaError } = await supabase
    .from("reservas")
    .insert({
      agencia_id: usuario.agenciaId,
      servicio_id: input.servicioId,
      habitacion_tipo: input.habitacionTipo,
      codigo_validacion: input.codigoValidacion,
    })
    .select("id")
    .single();
  if (reservaError || !reserva) throw new Error(reservaError?.message ?? "No se pudo crear la reserva");

  // Se insertan pasajero por pasajero (no en bloque) para poder devolver, en el
  // mismo orden que `input.asientoIds`, los IDs reales de cada cliente/reserva_pasajero
  // creado — así el cliente puede reemplazar sus IDs optimistas locales por los
  // reales sin depender de que un insert masivo devuelva las filas en orden.
  const clienteIds: string[] = [];
  const reservaPasajeroIds: string[] = [];

  for (let idx = 0; idx < input.asientoIds.length; idx++) {
    const f = input.forms[idx];
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .insert({
        agencia_id: usuario.agenciaId,
        nombre: f.nombre,
        apellido: f.apellido,
        dni: limpiarDni(f.dni),
        nacimiento: f.nacimiento || null,
        telefono: f.telefono ? formatTelefonoWhatsapp(f.telefono) : "",
        email: f.email,
        localidad: f.localidad,
        emer_nombre: f.emerNombre,
        emer_telefono: f.emerTelefono ? formatTelefonoWhatsapp(f.emerTelefono) : "",
        emer_parentesco: f.emerParentesco,
        obra_social: f.obraSocial,
        obra_social_nro: f.obraSocialNro,
      })
      .select("id")
      .single();
    if (clienteError || !cliente) throw new Error(clienteError?.message ?? "No se pudo crear el pasajero");

    const { data: rp, error: rpError } = await supabase
      .from("reserva_pasajeros")
      .insert({
        reserva_id: reserva.id,
        asiento_id: input.asientoIds[idx],
        cliente_id: cliente.id,
        es_responsable: idx === input.responsableIdx,
        precio: input.precioPasaje,
      })
      .select("id")
      .single();
    if (rpError || !rp) throw new Error(rpError?.message ?? "No se pudo crear la reserva del pasajero");

    clienteIds.push(cliente.id);
    reservaPasajeroIds.push(rp.id);
  }

  // El cobro es uno solo para toda la reserva grupal — se reparte
  // proporcionalmente entre los pasajeros, con el resto del redondeo en el
  // último para que la suma cierre exacto contra `cobro.montoAbonado`.
  if (input.cobro.montoAbonado > 0) {
    let montoRepartido = 0;
    const pagosRows = reservaPasajeroIds.map((rpId, idx) => {
      const esUltimo = idx === reservaPasajeroIds.length - 1;
      const monto = esUltimo
        ? Math.round((input.cobro.montoAbonado - montoRepartido) * 100) / 100
        : Math.round((input.cobro.montoAbonado / reservaPasajeroIds.length) * 100) / 100;
      montoRepartido += monto;
      return {
        reserva_pasajero_id: rpId,
        monto,
        medio_pago: input.cobro.medioPago,
        moneda: input.cobro.medioPago === "efectivo" ? input.cobro.moneda : null,
      };
    }).filter((p) => p.monto > 0);
    if (pagosRows.length > 0) {
      const { error: pagosError } = await supabase.from("pagos").insert(pagosRows);
      if (pagosError) throw new Error(pagosError.message);
    }
  }

  const precioTotalGrupo = input.precioPasaje * input.asientoIds.length;
  const saldoTotal = Math.max(precioTotalGrupo - input.cobro.montoAbonado, 0);
  const estadoAsiento = saldoTotal > 0 ? "pendiente" : "ocupado";

  const { error: asientosError } = await supabase
    .from("asientos")
    .update({ estado: estadoAsiento })
    .in("id", input.asientoIds);
  if (asientosError) throw new Error(asientosError.message);

  await supabase.from("eventos_reserva").insert({
    reserva_id: reserva.id,
    usuario_id: usuario.id,
    accion: "creada",
    detalle: {
      pasajeros: input.forms.map((f) => `${f.apellido}, ${f.nombre}`),
      cobro: input.cobro,
    },
  });

  revalidatePath(`/servicios/${input.servicioId}`);
  revalidatePath("/salidas");

  return { reservaId: reserva.id as string, clienteIds, reservaPasajeroIds };
}

export async function marcarPagado(input: { servicioId: string; reservaId: string }) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "salidas")) throw new Error("No autorizado");

  const supabase = await createClient();

  // La deuda de una reserva de varios asientos es del grupo entero, no de un
  // asiento suelto — se recalcula todo desde la base (no se confía en un
  // monto mandado por el cliente) y se salda lo que le falta a cada
  // pasajero de la reserva, no solo al que se tocó en el mapa.
  const { data: rps } = await supabase
    .from("reserva_pasajeros")
    .select("id, asiento_id, precio")
    .eq("reserva_id", input.reservaId)
    .eq("estado", "activo");
  if (!rps || rps.length === 0) return;

  const rpIds = rps.map((rp) => rp.id);
  const { data: pagosData } = await supabase.from("pagos").select("reserva_pasajero_id, monto").in("reserva_pasajero_id", rpIds);
  const pagadoPorRp = new Map<string, number>();
  (pagosData ?? []).forEach((p) => {
    pagadoPorRp.set(p.reserva_pasajero_id, (pagadoPorRp.get(p.reserva_pasajero_id) ?? 0) + Number(p.monto));
  });

  const pagosRows = rps
    .map((rp) => ({ reserva_pasajero_id: rp.id, monto: Math.round((Number(rp.precio) - (pagadoPorRp.get(rp.id) ?? 0)) * 100) / 100 }))
    .filter((p) => p.monto > 0)
    .map((p) => ({ ...p, medio_pago: "efectivo" as const }));

  if (pagosRows.length > 0) {
    const { error: pagoError } = await supabase.from("pagos").insert(pagosRows);
    if (pagoError) throw new Error(pagoError.message);
  }

  // Todos los asientos de la reserva que estaban "pendiente" (seña) pasan a "ocupado".
  const asientoIds = rps.map((rp) => rp.asiento_id);
  await supabase.from("asientos").update({ estado: "ocupado" }).in("id", asientoIds).eq("estado", "pendiente");

  await supabase.from("eventos_reserva").insert({
    reserva_id: input.reservaId,
    usuario_id: usuario.id,
    accion: "pago_registrado",
    detalle: { saldado_grupal: true, monto: pagosRows.reduce((s, p) => s + p.monto, 0) },
  });

  revalidatePath(`/servicios/${input.servicioId}`);
}
