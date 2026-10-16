import type { NextConfig } from "next";

const config: NextConfig = {
  // O core é importado como fonte TypeScript (ADR 003).
  transpilePackages: ["@gambit/core"],
  // Em desenvolvimento, 127.0.0.1 serve como "segundo jogador" (outro localStorage).
  allowedDevOrigins: ["127.0.0.1"],
};

export default config;
