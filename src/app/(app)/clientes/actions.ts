"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { limpiarDni, formatTelefonoWhatsapp, capitalizarPalabras } from "@/lib/format";

export interface ClienteEditable {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  nacimiento: string | null;
  telefono: string;
  email: string;
  localidad: string;
  emerNombre: string;
  emerTelefono: string;
  emerParentesco: string;
  obraSocial: string;
  obraSocialNro: string;
}

/**
 * Busca un cliente ya cargado por DNI, dentro de la propia agencia — para
 * poder reutilizar sus datos al armar una reserva nueva en vez de tipearlos
 * de cero. `limpiarDni` normaliza puntos/espacios para que dé igual cómo se
 * haya guardado o se esté buscando.
 */
export async function buscarClientePorDni(dni: string): Promise<ClienteEditable | null> {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId) throw new Error("No autorizado");

  const dniLimpio = limpiarDni(dni);
  if (!dniLimpio) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select(
      "id, nombre, apellido, dni, nacimiento, telefono, email, localidad, emer_nombre, emer_telefono, emer_parentesco, obra_social, obra_social_nro",
    )
    .eq("agencia_id", usuario.agenciaId)
    .eq("dni", dniLimpio)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    nombre: data.nombre,
    apellido: data.apellido,
    dni: data.dni ?? "",
    nacimiento: data.nacimiento,
    telefono: data.telefono ?? "",
    email: data.email ?? "",
    localidad: data.localidad ?? "",
    emerNombre: data.emer_nombre ?? "",
    emerTelefono: data.emer_telefono ?? "",
    emerParentesco: data.emer_parentesco ?? "",
    obraSocial: data.obra_social ?? "",
    obraSocialNro: data.obra_social_nro ?? "",
  };
}

export async function actualizarCliente(input: ClienteEditable) {
  const usuario = await getCurrentUser();
  if (!usuario || !usuario.agenciaId) throw new Error("No autorizado");
  if (!input.nombre.trim() || !input.apellido.trim()) throw new Error("Nombre y apellido son obligatorios");

  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({
      nombre: capitalizarPalabras(input.nombre),
      apellido: capitalizarPalabras(input.apellido),
      dni: limpiarDni(input.dni),
      nacimiento: input.nacimiento || null,
      telefono: input.telefono.trim() ? formatTelefonoWhatsapp(input.telefono) : "",
      email: input.email.trim().toLowerCase(),
      localidad: capitalizarPalabras(input.localidad),
      emer_nombre: capitalizarPalabras(input.emerNombre),
      emer_telefono: input.emerTelefono.trim() ? formatTelefonoWhatsapp(input.emerTelefono) : "",
      emer_parentesco: input.emerParentesco,
      obra_social: input.obraSocial.trim(),
      obra_social_nro: input.obraSocialNro.trim(),
    })
    .eq("id", input.id)
    .eq("agencia_id", usuario.agenciaId);
  if (error) throw new Error(error.message);

  revalidatePath("/clientes");
}
