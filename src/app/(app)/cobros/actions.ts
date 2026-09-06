"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";
import type { MedioPago, Moneda } from "@/lib/types";

export async function registrarPago(input: {
  reservaId: string;
  monto: number;
  medioPago: MedioPago;
  moneda: Moneda | null;
}) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "cobros")) throw new Error("No autorizado");
  if (!input.monto || input.monto <= 0) throw new Error("El monto tiene que ser mayor a 0");

  const supabase = await createClient();

  // La deuda es de la reserva completa, no de un pasajero suelto — se
  // recalcula todo desde la base (no se confía en un total mandado por el
  // cliente) y el monto se reparte proporcional a lo que le falta a cada
  // pasajero de la reserva, con el resto del redondeo en el último para
  // que la suma cierre exacto.
  const { data: rps } = await supabase
    .from("reserva_pasajeros")
    .select("id, asiento_id, precio")
    .eq("reserva_id", input.reservaId)
    .eq("estado", "activo");
  if (!rps || rps.length === 0) throw new Error("No se encontró la reserva");

  const rpIds = rps.map((rp) => rp.id);
  const { data: pagosData } = await supabase.from("pagos").select("reserva_pasajero_id, monto").in("reserva_pasajero_id", rpIds);
  const pagadoPorRp = new Map<string, number>();
  (pagosData ?? []).forEach((p) => {
    pagadoPorRp.set(p.reserva_pasajero_id, (pagadoPorRp.get(p.reserva_pasajero_id) ?? 0) + Number(p.monto));
  });

  const pendientes = rps
    .map((rp) => ({ rp, debe: Number(rp.precio) - (pagadoPorRp.get(rp.id) ?? 0) }))
    .filter((x) => x.debe > 0.01);
  const totalPendiente = pendientes.reduce((s, x) => s + x.debe, 0);
  if (pendientes.length === 0) throw new Error("Esta reserva ya está saldada");
  if (input.monto > totalPendiente + 0.5) {
    throw new Error(`El monto no puede superar el saldo pendiente (${Math.round(totalPendiente).toLocaleString("es-AR")})`);
  }

  let repartido = 0;
  const pagosRows = pendientes
    .map((x, idx) => {
      const esUltimo = idx === pendientes.length - 1;
      const monto = esUltimo
        ? Math.round((input.monto - repartido) * 100) / 100
        : Math.round(input.monto * (x.debe / totalPendiente) * 100) / 100;
      repartido += monto;
      return {
        reserva_pasajero_id: x.rp.id,
        monto,
        medio_pago: input.medioPago,
        moneda: input.medioPago === "efectivo" ? input.moneda : null,
      };
    })
    .filter((p) => p.monto > 0);

  if (pagosRows.length > 0) {
    const { error: pagoError } = await supabase.from("pagos").insert(pagosRows);
    if (pagoError) throw new Error(pagoError.message);
  }

  // Si con esto se saldó la reserva completa, todos sus asientos
  // "pendiente" (seña) pasan a "ocupado".
  if (input.monto >= totalPendiente - 0.5) {
    const asientoIds = rps.map((rp) => rp.asiento_id);
    await supabase.from("asientos").update({ estado: "ocupado" }).in("id", asientoIds).eq("estado", "pendiente");
  }

  await supabase.from("eventos_reserva").insert({
    reserva_id: input.reservaId,
    usuario_id: usuario.id,
    accion: "pago_registrado",
    detalle: { monto: input.monto },
  });

  revalidatePath("/cobros");
}
