import { env as rawEnv } from "cloudflare:test";
import { createTenantContext, TenantDb } from "@dental/core";
import type { Env } from "../src/env";

const env = rawEnv as unknown as Env;

export async function seedDemoClinic() {
  const clinicId = crypto.randomUUID();
  const slug = `arocena-${clinicId.slice(0, 8)}`;
  await env.DB.prepare("INSERT INTO clinics (id, name, slug, status, db_strategy, created_at) VALUES (?, ?, ?, 'active', 'shared', ?)")
    .bind(clinicId, "Odontología Arocena", slug, Date.now())
    .run();

  const ctx = createTenantContext({ clinicId, userId: null, role: "visitor" });
  const db = new TenantDb(ctx, env.DB);

  await db.insert("clinic_settings", {
    timezone: "America/Argentina/Buenos_Aires",
    locale: "es-AR",
    contact_json: null,
    theme_json: null,
    content_json: JSON.stringify({
      name: "Odontología Arocena",
      address: "Av. Rivadavia 4820, Caballito, CABA",
      phone: "+54 11 4633 7842",
      whatsapp: "+54 9 11 4633 7842",
      email: "hola@odontologiaarocena.com.ar",
      openingHours: [
        { weekday: 1, openMin: 540, closeMin: 1140 },
        { weekday: 2, openMin: 540, closeMin: 1140 },
        { weekday: 3, openMin: 540, closeMin: 1140 },
        { weekday: 4, openMin: 540, closeMin: 1140 },
        { weekday: 5, openMin: 540, closeMin: 1140 },
        { weekday: 6, openMin: 540, closeMin: 780 },
      ],
      slotMinutes: 30,
      obrasSociales: ["OSDE", "Swiss Medical"],
      faqs: [{ q: "¿Atienden urgencias?", a: "Sí." }],
    }),
    updated_at: Date.now(),
  } as never);

  const service = await db.insert<{ id: string }>("services", {
    code: "01",
    name: "Odontología general",
    description: "Control y limpieza.",
    duration_min: 45,
    price_cents: 1_800_000,
    color: "sky",
    active: 1,
    created_at: Date.now(),
  } as never);

  const doctor = await db.insert<{ id: string }>("doctors", {
    name: "Dra. Malena Ferreyra",
    specialty: "Odontología general",
    bio: null,
    photo_url: null,
    active: 1,
    created_at: Date.now(),
  } as never);

  await db.scoped({
    sql: "INSERT INTO doctor_services (clinic_id, doctor_id, service_id) VALUES (?, ?, ?)",
    args: [clinicId, doctor.id, service.id],
  });

  return { clinicId, slug, db, ctx, serviceId: service.id, doctorId: doctor.id };
}
