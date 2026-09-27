import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
  },
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations("../../packages/core/src/db/migrations");
      return {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
        },
      };
    }),
  ],
});
