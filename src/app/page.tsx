import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export default async function Home() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  // /tareas resuelve el permiso solo (requirePantalla redirige a la primera
  // pantalla habilitada si el usuario no tiene acceso a tareas).
  redirect(usuario.rol === "superadmin" ? "/superadmin" : "/tareas");
}
