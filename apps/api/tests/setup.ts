import { applyD1Migrations, env as rawEnv } from "cloudflare:test";
import type { Env } from "../src/env";

const env = rawEnv as unknown as Env & { TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1] };

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
