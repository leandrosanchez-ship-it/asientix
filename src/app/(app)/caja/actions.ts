"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";

function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function cerrarCaja(input: { efectivoEsperado: number; efectivoContado: number }) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "caja")) throw new Error("No autorizado");

  const supabase = await createClient();
  const diferencia = input.efectivoContado - input.efectivoEsperado;

  const { error } = await supabase.from("cierres_caja").upsert(
    {
      agencia_id: usuario.agenciaId,
      fecha: isoLocal(new Date()),
      efectivo_esperado: input.efectivoEsperado,
      efectivo_contado: input.efectivoContado,
      diferencia,
      usuario_id: usuario.id,
    },
    { onConflict: "agencia_id,fecha" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/caja");
}
