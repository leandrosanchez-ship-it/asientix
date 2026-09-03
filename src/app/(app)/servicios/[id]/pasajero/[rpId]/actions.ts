"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";

export async function cancelarPasajero(input: {
  reservaPasajeroId: string;
  motivo: string;
  reembolso: boolean;
}) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "salidas")) throw new Error("No autorizado");

  const supabase = await createClient();

  const { data: rp } = await supabase
    .from("reserva_pasajeros")
    .select("reserva_id, asiento_id, precio")
    .eq("id", input.reservaPasajeroId)
    .single();
  if (!rp) throw new Error("No se encontró la reserva de este pasajero");

  const { data: asiento } = await supabase
    .from("asientos")
    .select("numero, servicio_id")
    .eq("id", rp.asiento_id)
    .single();

  const { error: rpError } = await supabase
    .from("reserva_pasajeros")
    .update({ estado: "cancelado" })
    .eq("id", input.reservaPasajeroId);
  if (rpError) throw new Error(rpError.message);

  const { error: asientoError } = await supabase.from("asientos").update({ estado: "libre" }).eq("id", rp.asiento_id);
  if (asientoError) throw new Error(asientoError.message);

  let reembolsado = 0;
  if (input.reembolso) {
    const { data: pagos } = await supabase.from("pagos").select("monto").eq("reserva_pasajero_id", input.reservaPasajeroId);
    reembolsado = (pagos ?? []).reduce((s, p) => s + Number(p.monto), 0);
  }

  await supabase.from("eventos_reserva").insert({
    reserva_id: rp.reserva_id,
    usuario_id: usuario.id,
    accion: "cancelada",
    motivo: input.motivo,
    detalle: {
      asiento: asiento?.numero ?? null,
      reembolsado: input.reembolso ? reembolsado : 0,
    },
  });

  if (asiento) revalidatePath(`/servicios/${asiento.servicio_id}`);
  revalidatePath("/salidas");
}

export async function reprogramarPasajero(input: {
  reservaPasajeroId: string;
  nuevoServicioId: string;
}) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "salidas")) throw new Error("No autorizado");

  const supabase = await createClient();

  const { data: rp } = await supabase
    .from("reserva_pasajeros")
    .select("reserva_id, asiento_id, cliente_id, precio, es_responsable")
    .eq("id", input.reservaPasajeroId)
    .single();
  if (!rp) throw new Error("No se encontró la reserva de este pasajero");

  const { data: asientoActual } = await supabase
    .from("asientos")
    .select("numero, piso, servicio_id")
    .eq("id", rp.asiento_id)
    .single();
  if (!asientoActual) throw new Error("No se encontró el asiento actual");

  const { data: nuevoServicio } = await supabase
    .from("servicios")
    .select("id, origen, destino, fecha")
    .eq("id", input.nuevoServicioId)
    .single();
  if (!nuevoServicio) throw new Error("No se encontró el servicio elegido");

  // Busca un asiento libre en el nuevo servicio: preferentemente el mismo
  // número, si no cualquiera del mismo piso, si no cualquiera libre.
  const { data: libres } = await supabase
    .from("asientos")
    .select("id, numero, piso")
    .eq("servicio_id", input.nuevoServicioId)
    .eq("estado", "libre");
  if (!libres || libres.length === 0) {
    throw new Error("No hay asientos libres en el servicio elegido");
  }
  const nuevoAsiento =
    libres.find((a) => a.numero === asientoActual.numero) ??
    libres.find((a) => a.piso === asientoActual.piso) ??
    libres[0];

  // Nueva reserva individual en el servicio destino, con un código propio —
  // el resto del grupo original (si lo había) queda intacto en su reserva.
  const codigoValidacion = `AXT-RPG-${Date.now().toString(36).toUpperCase()}`;
  const { data: nuevaReserva, error: reservaError } = await supabase
    .from("reservas")
    .insert({
      agencia_id: usuario.agenciaId,
      servicio_id: input.nuevoServicioId,
      habitacion_tipo: null,
      codigo_validacion: codigoValidacion,
    })
    .select("id")
    .single();
  if (reservaError || !nuevaReserva) throw new Error(reservaError?.message ?? "No se pudo crear la nueva reserva");

  const { error: nuevoRpError } = await supabase.from("reserva_pasajeros").insert({
    reserva_id: nuevaReserva.id,
    asiento_id: nuevoAsiento.id,
    cliente_id: rp.cliente_id,
    es_responsable: true,
    precio: rp.precio,
    estado: "activo",
  });
  if (nuevoRpError) throw new Error(nuevoRpError.message);

  await supabase.from("asientos").update({ estado: "ocupado" }).eq("id", nuevoAsiento.id);

  await supabase
    .from("reserva_pasajeros")
    .update({ estado: "reprogramado" })
    .eq("id", input.reservaPasajeroId);
  await supabase.from("asientos").update({ estado: "libre" }).eq("id", rp.asiento_id);

  await supabase.from("eventos_reserva").insert({
    reserva_id: rp.reserva_id,
    usuario_id: usuario.id,
    accion: "reprogramada",
    detalle: {
      asiento: asientoActual.numero,
      destino: nuevoServicio.destino,
      fecha: nuevoServicio.fecha,
      nuevo_asiento: nuevoAsiento.numero,
    },
  });

  revalidatePath("/salidas");
  revalidatePath(`/servicios/${input.nuevoServicioId}`);
  revalidatePath(`/servicios/${asientoActual.servicio_id}`);
}
