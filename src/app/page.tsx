import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts ya redirige a /login si no hay sesión — este chequeo es un
  // segundo resguardo (nunca confiar solo en el proxy para autorización).
  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre, rol, agencia_id, agencias(nombre)")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-extrabold text-ink">
        Hola, {perfil?.nombre ?? user.email}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {perfil?.rol === "superadmin"
          ? "Panel de superadmin — próximamente."
          : `${perfil?.rol} en tu agencia — pantallas en construcción.`}
      </p>
    </div>
  );
}
