import { createClient } from "./supabase/server";
import { USUARIOS } from "./mock-data";
import type { Usuario } from "./types";

const SUPABASE_CONFIGURED = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Usuario actualmente logueado. Mientras no haya un proyecto Supabase
 * conectado, simula la sesión de un admin de Sequeira Tours para poder
 * construir y previsualizar las pantallas — ver USUARIOS en mock-data.ts
 * para cambiar de persona (ej. probar la vista de "vendedor" con permisos
 * acotados). TODO: una vez conectado Supabase, esto pasa a leer la sesión
 * real y el perfil desde la tabla `usuarios`.
 */
export async function getCurrentUser(): Promise<Usuario | null> {
  if (!SUPABASE_CONFIGURED) {
    return USUARIOS.find((u) => u.rol === "admin") ?? null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("id, agencia_id, nombre, email, rol, permisos, activo")
    .eq("id", user.id)
    .single();
  if (!data) return null;

  return {
    id: data.id,
    agenciaId: data.agencia_id,
    nombre: data.nombre,
    email: data.email,
    rol: data.rol,
    permisos: data.permisos ?? [],
    activo: data.activo,
  };
}
