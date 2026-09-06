import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Supabase Free pausa el proyecto solo después de 7 días sin actividad —
// este endpoint existe para que nunca pase eso. Vercel Cron lo pega una vez
// por día (ver "crons" en vercel.json); el propio ping HTTP a Vercel también
// mantiene tibia la función serverless (evita cold starts largos).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("agencias").select("id").limit(1);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
