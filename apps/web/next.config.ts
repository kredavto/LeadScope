import type { NextConfig } from "next";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

const workspaceRoot = path.join(process.cwd(), "../..");
const rootEnvPath = path.join(workspaceRoot, ".env.local");

if (!process.env.VERCEL && !process.env.OPENAI_API_KEY && existsSync(rootEnvPath)) {
  const keyLine = readFileSync(rootEnvPath, "utf8").split(/\r?\n/).find((line) => line.startsWith("OPENAI_API_KEY="));
  if (keyLine) process.env.OPENAI_API_KEY = keyLine.slice("OPENAI_API_KEY=".length).trim();
}

const nextConfig: NextConfig = {
  output: process.env.E2E || process.env.VERCEL ? undefined : "standalone",
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: workspaceRoot,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
