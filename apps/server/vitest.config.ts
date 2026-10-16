import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "server",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // Os testes de integração sobem o Worker real com o wrangler.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
