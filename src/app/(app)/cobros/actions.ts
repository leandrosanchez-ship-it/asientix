"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";

export async function registrarPago(input: { reservaPasajeroId: string; monto: number }) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "cobros")) throw new Error("No autorizado");
  if (!input.monto || input.monto <= 0) throw new Error("El monto tiene que ser mayor a 0");

  const supabase = await createClient();

  const { error: pagoError } = await supabase.from("pagos").insert({
    reserva_pasajero_id: input.reservaPasajeroId,
    monto: input.monto,
    medio_pago: "efectivo",
  });
  if (pagoError) throw new Error(pagoError.message);

  // Si con este pago se salda por completo, y el asiento estaba "pendiente"
  // (seña), pasa a "ocupado".
  const { data: rp } = await supabase
    .from("reserva_pasajeros")
    .select("reserva_id, asiento_id, precio")
    .eq("id", input.reservaPasajeroId)
    .single();
  if (rp) {
    const { data: pagos } = await supabase
      .from("pagos")
      .select("monto")
      .eq("reserva_pasajero_id", input.reservaPasajeroId);
    const totalPagado = (pagos ?? []).reduce((sum, p) => sum + Number(p.monto), 0);
    if (totalPagado >= Number(rp.precio)) {
      await supabase.from("asientos").update({ estado: "ocupado" }).eq("id", rp.asiento_id).eq("estado", "pendiente");
    }

    await supabase.from("eventos_reserva").insert({
      reserva_id: rp.reserva_id,
      usuario_id: usuario.id,
      accion: "pago_registrado",
      detalle: { monto: input.monto },
    });
  }

  revalidatePath("/cobros");
}
