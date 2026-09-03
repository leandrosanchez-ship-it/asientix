import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente admin (service role) — SOLO para Server Actions/Route Handlers que
 * necesitan bypassear RLS o usar `auth.admin.*` (ej. crear usuarios desde el
 * panel de Superadmin). Nunca importar desde un componente cliente.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
