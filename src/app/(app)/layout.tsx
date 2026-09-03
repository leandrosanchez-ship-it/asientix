import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { NavBar } from "@/components/NavBar";
import { InactivityGuard } from "@/components/InactivityGuard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getCurrentUser();

  // El proxy ya protege estas rutas cuando hay Supabase conectado — este
  // chequeo es el segundo resguardo, nunca confiar solo en el proxy.
  if (!usuario) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-app">
      <InactivityGuard />
      <NavBar usuario={usuario} />
      {children}
    </div>
  );
}
