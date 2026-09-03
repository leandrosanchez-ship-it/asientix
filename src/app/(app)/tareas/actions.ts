"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";
import type { EstadoTarea } from "./TareasClient";

export async function crearTarea(input: { titulo: string; fecha: string }) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "tareas")) throw new Error("No autorizado");
  if (!input.titulo.trim()) throw new Error("El título es obligatorio");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tareas")
    .insert({ agencia_id: usuario.agenciaId, titulo: input.titulo.trim(), fecha: input.fecha, estado: "pendiente" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear la tarea");

  revalidatePath("/tareas");
  return data.id as string;
}

export async function moverTarea(input: { id: string; estado: EstadoTarea }) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "tareas")) throw new Error("No autorizado");

  const supabase = await createClient();
  const { error } = await supabase.from("tareas").update({ estado: input.estado }).eq("id", input.id);
  if (error) throw new Error(error.message);

  revalidatePath("/tareas");
}

export async function limpiarFinalizadas(input: { ids: string[] }) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId || !tienePermiso(usuario, "tareas")) throw new Error("No autorizado");
  if (input.ids.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from("tareas").delete().in("id", input.ids);
  if (error) throw new Error(error.message);

  revalidatePath("/tareas");
}
