import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { USUARIOS } from "./mock-data";
import type { Pantalla, Usuario } from "./types";

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
  // Sin perfil, o desactivado por el superadmin: tratado como no logueado —
  // la sesión de Supabase Auth puede seguir viva, pero no debe alcanzar
  // para usar la app (ej. un ex-empleado al que le desactivaron el acceso).
  if (!data || !data.activo) return null;

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

/** Admin/superadmin ven todo; un vendedor solo si `pantalla` está en su `permisos`. */
export function tienePermiso(usuario: Usuario, pantalla: Pantalla): boolean {
  return usuario.rol === "superadmin" || usuario.rol === "admin" || usuario.permisos.includes(pantalla);
}

/**
 * Exige que el usuario logueado tenga acceso a `pantalla` (admin/superadmin
 * siempre lo tienen; un vendedor solo si está en su `permisos`). El NavBar ya
 * oculta los tabs sin acceso, pero eso es solo UI — esto es lo que realmente
 * bloquea entrar escribiendo la URL a mano. Llamar al principio de cada
 * page.tsx de una pantalla protegida.
 */
export async function requirePantalla(pantalla: Pantalla): Promise<Usuario> {
  const usuario = await getCurrentUser();
  if (!usuario) redirect("/login");
  if (tienePermiso(usuario, pantalla)) return usuario;

  const primeraPermitida = usuario.permisos[0];
  redirect(primeraPermitida ? `/${primeraPermitida}` : "/sin-acceso");
}
