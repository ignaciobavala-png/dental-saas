import { sessionsRepo, type PlatformSession } from "../db/platform/repos";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
export const SESSION_COOKIE = "session";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

export async function createSession(
  d1: D1Database,
  userId: string,
): Promise<{ token: string; session: PlatformSession }> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const session = await sessionsRepo(d1).create({
    userId,
    tokenHash: await hashToken(token),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return { token, session };
}

export async function verifySessionToken(d1: D1Database, token: string): Promise<PlatformSession | null> {
  return sessionsRepo(d1).byTokenHash(await hashToken(token));
}

export async function destroySessionToken(d1: D1Database, token: string): Promise<void> {
  await sessionsRepo(d1).deleteByTokenHash(await hashToken(token));
}
