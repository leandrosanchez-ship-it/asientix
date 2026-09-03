"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";

export async function guardarPlantilla(input: { tipo: "saldo" | "viaje" | "cumple" | "promo"; texto: string }) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId) throw new Error("No autorizado");
  if (!input.texto.trim()) throw new Error("El mensaje no puede estar vacío");

  const supabase = await createClient();
  const { error } = await supabase
    .from("mensajes_plantillas")
    .upsert(
      { agencia_id: usuario.agenciaId, tipo: input.tipo, texto: input.texto },
      { onConflict: "agencia_id,tipo" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/mensajes");
}
