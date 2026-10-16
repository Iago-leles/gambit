import type { NextConfig } from "next";

const config: NextConfig = {
  // O core é importado como fonte TypeScript (ADR 003).
  transpilePackages: ["@gambit/core"],
};

export default config;
