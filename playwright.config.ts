import { defineConfig, devices } from "@playwright/test";
import { SERVER_PORT, SERVER_URL, WEB_PORT } from "./e2e/env";

/**
 * E2E: dois navegadores jogando contra o Worker real.
 * Portas e armazenamento próprios, para não colidir com os servidores de desenvolvimento.
 */

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `pnpm --filter @gambit/server exec wrangler dev --port ${SERVER_PORT} --persist-to .wrangler/e2e`,
      port: SERVER_PORT,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @gambit/web build && pnpm --filter @gambit/web start --port ${WEB_PORT}`,
      port: WEB_PORT,
      env: { NEXT_PUBLIC_SERVER_URL: SERVER_URL },
      reuseExistingServer: !isCI,
      timeout: 300_000,
    },
  ],
});
