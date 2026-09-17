import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Filtro rápido: rebota a /login a quien claramente no tiene sesión, antes
 * de renderizar nada. `/login` y `/verificar/[codigo]` (la página pública
 * del QR del boleto, sin cuenta) ni siquiera necesitan saber quién es el
 * usuario — se cortan antes de tocar Supabase para nada.
 *
 * A propósito NO usa `auth.getUser()` acá (eso pega contra el servidor de
 * Supabase, un viaje de red completo en CADA request) — `getSession()` lee
 * el JWT de la cookie localmente, que alcanza para este filtro. La
 * verificación de verdad (¿existe igual el usuario en la base? ¿sigue
 * activo?) ya la hace `getCurrentUser()` en cada pantalla protegida (ver
 * `current-user.ts`, usado en `(app)/layout.tsx` y en cada `requirePantalla`)
 * — antes esto llamaba a `getUser()`, o sea DOS viajes de red a Supabase por
 * página (uno acá, otro en `getCurrentUser()`) más la consulta a `usuarios`;
 * ahora es uno solo. Si esa verificación de abajo falla igual (token
 * vencido, usuario borrado/desactivado), redirige a /login de todos modos —
 * no es un agujero de seguridad, solo se corrió la validación fuerte un
 * paso más adentro, donde ya se hacía de cualquier forma.
 */
export async function updateSession(request: NextRequest) {
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/verificar");
  if (isPublicRoute) return NextResponse.next({ request });

  // Todavía no hay proyecto Supabase conectado (ver src/lib/current-user.ts):
  // no tiene sentido exigir sesión real si no hay dónde autenticarse. En
  // cuanto se agreguen las env vars, este bypass se desactiva solo.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
