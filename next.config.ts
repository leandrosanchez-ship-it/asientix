import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pins the workspace root to this folder — avoids Next.js walking up and
  // picking a stray package-lock.json/.git elsewhere on the machine.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
