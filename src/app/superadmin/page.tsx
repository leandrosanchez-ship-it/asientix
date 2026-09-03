import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { SuperadminClient } from "./SuperadminClient";
import type { Agencia, Usuario } from "@/lib/types";

export default async function SuperadminPage() {
  const usuario = await getCurrentUser();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "superadmin") redirect("/salidas");

  const admin = createAdminClient();

  const [{ data: agenciasData }, { data: usuariosData }] = await Promise.all([
    admin.from("agencias").select("id, nombre, ciudad, activo").order("nombre"),
    admin
      .from("usuarios")
      .select("id, agencia_id, nombre, email, rol, permisos, activo")
      .order("nombre"),
  ]);

  const agencias: Agencia[] = (agenciasData ?? []).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    ciudad: a.ciudad ?? "",
    activo: a.activo,
  }));

  const usuarios: Usuario[] = (usuariosData ?? []).map((u) => ({
    id: u.id,
    agenciaId: u.agencia_id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    permisos: u.permisos ?? [],
    activo: u.activo,
  }));

  return <SuperadminClient agencias={agencias} usuarios={usuarios} />;
}
