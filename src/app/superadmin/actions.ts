"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Pantalla, Rol } from "@/lib/types";

async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (data?.rol !== "superadmin") throw new Error("No autorizado");
}

export async function crearAgencia(input: { nombre: string; ciudad: string }) {
  await requireSuperadmin();
  if (!input.nombre.trim()) throw new Error("El nombre es obligatorio");

  const admin = createAdminClient();
  const { error } = await admin
    .from("agencias")
    .insert({ nombre: input.nombre.trim(), ciudad: input.ciudad.trim() || null });
  if (error) throw new Error(error.message);

  revalidatePath("/superadmin");
}

export async function crearUsuario(input: {
  agenciaId: string;
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  permisos: Pantalla[];
}) {
  await requireSuperadmin();
  if (!input.nombre.trim() || !input.email.trim() || !input.password) {
    throw new Error("Nombre, email y contraseña son obligatorios");
  }

  const admin = createAdminClient();

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
  });
  if (authError || !created.user) {
    throw new Error(authError?.message ?? "No se pudo crear el usuario");
  }

  const { error: insertError } = await admin.from("usuarios").insert({
    id: created.user.id,
    agencia_id: input.agenciaId,
    nombre: input.nombre.trim(),
    email: input.email.trim(),
    rol: input.rol,
    permisos: input.rol === "admin" ? [] : input.permisos,
  });
  if (insertError) {
    // Evita dejar un usuario de Auth huérfano sin perfil.
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(insertError.message);
  }

  revalidatePath("/superadmin");
}

export async function actualizarUsuario(input: {
  usuarioId: string;
  nombre: string;
  email: string;
  rol: Rol;
  permisos: Pantalla[];
}) {
  await requireSuperadmin();
  if (!input.nombre.trim() || !input.email.trim()) {
    throw new Error("Nombre y email son obligatorios");
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("usuarios")
    .select("email")
    .eq("id", input.usuarioId)
    .single();

  if (existing && existing.email !== input.email.trim()) {
    const { error: authError } = await admin.auth.admin.updateUserById(input.usuarioId, {
      email: input.email.trim(),
    });
    if (authError) throw new Error(authError.message);
  }

  const { error } = await admin
    .from("usuarios")
    .update({
      nombre: input.nombre.trim(),
      email: input.email.trim(),
      rol: input.rol,
      permisos: input.rol === "admin" ? [] : input.permisos,
    })
    .eq("id", input.usuarioId);
  if (error) throw new Error(error.message);

  revalidatePath("/superadmin");
}
