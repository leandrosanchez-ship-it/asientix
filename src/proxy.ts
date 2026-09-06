import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` — same
// mechanics, this just runs before every matched route.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - image/font/svg files
     * - api/* (route handlers como /api/cron/keepalive resuelven su propia
     *   autorización — ej. CRON_SECRET — Vercel Cron no manda cookie de
     *   sesión, así que quedaría siempre redirigido a /login sin esto)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
