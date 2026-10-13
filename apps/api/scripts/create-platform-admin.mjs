#!/usr/bin/env node
// Crea (o promueve) el usuario master de la plataforma en D1.
//
//   pnpm --filter @dental/api admin:create --email vos@dominio.com --name "Tu Nombre"            # D1 local
//   pnpm --filter @dental/api admin:create --email vos@dominio.com --name "Tu Nombre" --remote   # producción
//
// La contraseña se pide por consola (o PLATFORM_ADMIN_PASSWORD) para que no quede
// en el historial. Si el email ya existe, solo se lo marca como master y se
// conserva su contraseña. El hash es el mismo PBKDF2 de packages/core/src/auth/password.ts.
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  // pnpm pasa el `--` literal al script; se descarta.
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: { email: { type: "string" }, name: { type: "string" }, remote: { type: "boolean", default: false } },
});
const email = values.email?.trim().toLowerCase();
if (!email || !values.name) {
  console.error("Uso: admin:create -- --email <email> --name <nombre> [--remote]");
  process.exit(1);
}

let password = process.env.PLATFORM_ADMIN_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("Contraseña (mín. 8 caracteres): ");
  rl.close();
}
if (password.length < 8) {
  console.error("La contraseña tiene que tener al menos 8 caracteres.");
  process.exit(1);
}

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256);
const hash = `${toHex(salt)}:${toHex(new Uint8Array(bits))}`;

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const sql =
  `INSERT INTO users (id, email, password_hash, name, status, is_platform_admin, created_at) ` +
  `VALUES (${q(crypto.randomUUID())}, ${q(email)}, ${q(hash)}, ${q(values.name)}, 'active', 1, ${Date.now()}) ` +
  `ON CONFLICT(email) DO UPDATE SET is_platform_admin = 1, status = 'active';`;

execFileSync("pnpm", ["exec", "wrangler", "d1", "execute", "dental-saas", values.remote ? "--remote" : "--local", "--command", sql], {
  stdio: "inherit",
});
console.log(`\nListo: ${email} es master. Entrá por /login y vas a caer en /plataforma.`);
