"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";
import type { PasajeroForm } from "./ReservationWizard";
import type { TipoHabitacion } from "@/lib/types";

export interface CrearReservaGrupalInput {
  servicioId: string;
  asientoIds: string[]; // mismo orden que `forms`
  forms: PasajeroForm[];
  responsableIdx: number;
  habitacionTipo: TipoHabitacion | null;
  precioPasaje: number;
  codigoValidacion: string;
}

export async function crearReservaGrupal(input: CrearReservaGrupalInput) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "salidas")) throw new Error("No autorizado");

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
        dni: f.dni,
        nacimiento: f.nacimiento || null,
        telefono: f.telefono,
        email: f.email,
        localidad: f.localidad,
        emer_nombre: f.emerNombre,
        emer_telefono: f.emerTelefono,
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

  const { error: asientosError } = await supabase
    .from("asientos")
    .update({ estado: "ocupado" })
    .in("id", input.asientoIds);
  if (asientosError) throw new Error(asientosError.message);

  await supabase.from("eventos_reserva").insert({
    reserva_id: reserva.id,
    usuario_id: usuario.id,
    accion: "creada",
    detalle: {
      pasajeros: input.forms.map((f) => `${f.apellido}, ${f.nombre}`),
    },
  });

  revalidatePath(`/servicios/${input.servicioId}`);
  revalidatePath("/salidas");

  return { reservaId: reserva.id as string, clienteIds, reservaPasajeroIds };
}

export async function marcarPagado(input: {
  servicioId: string;
  asientoId: string;
  reservaPasajeroId: string;
  monto: number;
}) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "salidas")) throw new Error("No autorizado");
  if (input.monto <= 0) return;

  const supabase = await createClient();

  const { error: pagoError } = await supabase.from("pagos").insert({
    reserva_pasajero_id: input.reservaPasajeroId,
    monto: input.monto,
    medio_pago: "efectivo",
  });
  if (pagoError) throw new Error(pagoError.message);

  // Si el asiento estaba marcado como "pendiente" (seña), al saldar pasa a "ocupado".
  await supabase.from("asientos").update({ estado: "ocupado" }).eq("id", input.asientoId).eq("estado", "pendiente");

  const { data: rp } = await supabase
    .from("reserva_pasajeros")
    .select("reserva_id")
    .eq("id", input.reservaPasajeroId)
    .single();
  if (rp) {
    await supabase.from("eventos_reserva").insert({
      reserva_id: rp.reserva_id,
      usuario_id: usuario.id,
      accion: "pago_registrado",
      detalle: { monto: input.monto },
    });
  }

  revalidatePath(`/servicios/${input.servicioId}`);
}
