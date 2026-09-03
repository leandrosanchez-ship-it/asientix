import type { NextConfig } from "next";
import path from "path";

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
};

export default nextConfig;
