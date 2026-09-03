import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export default async function Home() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  redirect(usuario.rol === "superadmin" ? "/superadmin" : "/salidas");
}
