import type { NextConfig } from "next";
import path from "path";

// El origen real de Supabase (auth + REST) al que el browser client le pega
// directo — connect-src del CSP tiene que permitirlo explícitamente.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const supabaseWsOrigin = supabaseOrigin.replace(/^https:/, "wss:");

// React en modo desarrollo usa eval() para reconstruir stack traces (nunca en
// producción, por eso 'unsafe-eval' solo se suma acá) — sin esto, `next dev`
// queda con la app rota (hidratación falla en silencio) mientras que el build
// de producción real no lo necesita en absoluto.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Next.js necesita 'unsafe-inline' para el script de hidratación —
  // no cargamos scripts de terceros ni hay <script> propios en el código.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Pins the workspace root to this folder — avoids Next.js walking up and
  // picking a stray package-lock.json/.git elsewhere on the machine.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // pdfkit lee sus fuentes estándar (.afm) desde node_modules en tiempo de
  // ejecución vía fs — sin esto, el tracer de Vercel puede no incluirlas en
  // la función serverless y la generación de boletos rompería solo en prod.
  outputFileTracingIncludes: {
    "/*": ["node_modules/pdfkit/js/data/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
