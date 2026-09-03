"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, tienePermiso } from "@/lib/current-user";
import { formatTelefonoWhatsapp } from "@/lib/format";

// "proveedores" (pantalla dedicada) o "salidas" (alta de servicio, que
// permite cargar un hotel/asistencia nuevo al vuelo sin salir del alta).
async function requireAgenciaId() {
  const usuario = await getCurrentUser();
  const autorizado = usuario && usuario.agenciaId && (tienePermiso(usuario, "proveedores") || tienePermiso(usuario, "salidas"));
  if (!usuario || !usuario.agenciaId || !autorizado) throw new Error("No autorizado");
  return usuario.agenciaId;
}

export async function crearHotel(input: { nombre: string; contacto: string; telefono: string }) {
  const agenciaId = await requireAgenciaId();
  if (!input.nombre.trim()) throw new Error("El nombre es obligatorio");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hoteles")
    .insert({
      agencia_id: agenciaId,
      nombre: input.nombre.trim(),
      contacto: input.contacto.trim(),
      telefono: input.telefono.trim() ? formatTelefonoWhatsapp(input.telefono) : "",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el hotel");

  revalidatePath("/proveedores");
  return data.id as string;
}

export async function crearAsistencia(input: { nombre: string; contacto: string; telefono: string }) {
  const agenciaId = await requireAgenciaId();
  if (!input.nombre.trim()) throw new Error("El nombre es obligatorio");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asistencias_viajero")
    .insert({
      agencia_id: agenciaId,
      nombre: input.nombre.trim(),
      contacto: input.contacto.trim(),
      telefono: input.telefono.trim() ? formatTelefonoWhatsapp(input.telefono) : "",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear la asistencia");

  revalidatePath("/proveedores");
  return data.id as string;
}

export async function crearObservacion(input: { titulo: string; texto: string }) {
  const agenciaId = await requireAgenciaId();
  if (!input.titulo.trim() || !input.texto.trim()) {
    throw new Error("Título y texto son obligatorios");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("observaciones").insert({
    agencia_id: agenciaId,
    titulo: input.titulo.trim(),
    texto: input.texto.trim(),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/proveedores");
}
