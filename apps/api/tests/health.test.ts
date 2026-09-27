import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("GET /api/health", () => {
  it("responde 200 con ok", async () => {
    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("devuelve 404 en una ruta desconocida", async () => {
    const res = await app.request("/api/no-existe");

    expect(res.status).toBe(404);
  });
});
