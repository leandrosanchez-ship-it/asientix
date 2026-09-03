"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Antes "Salir" era un <Link href="/login"> que solo navegaba — la sesión de
 * Supabase Auth seguía viva (la cookie no se invalidaba). Este sí cierra la
 * sesión de verdad antes de mandar a /login.
 */
export function LogoutButton({ className }: { className?: string }) {
  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button type="button" onClick={salir} className={className}>
      Salir
    </button>
  );
}
