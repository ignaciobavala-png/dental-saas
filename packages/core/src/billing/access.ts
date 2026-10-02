import type { PlatformClinic } from "../db/platform/repos";

const DAY_MS = 86_400_000;

/** Prueba gratuita por defecto. `TRIAL_DAYS` en el Worker la puede ajustar. */
export const DEFAULT_TRIAL_DAYS = 30;

/** Cada pago registrado por el master habilita este período. */
export const BILLING_PERIOD_DAYS = 30;

export type ClinicAccess = "ok" | "trial_expired" | "payment_due" | "suspended";

/**
 * Única fuente de la regla "¿este consultorio puede operar?". La usan el panel,
 * la landing pública, la secretaría y `/me`; no repetir la condición a mano.
 *
 * - `trial` vence en `trial_expires_at`.
 * - `active` (pago) vence en `paid_until`; `null` = sin vencimiento (cuentas
 *   activadas antes de que existiera la facturación).
 * - `suspended` queda bloqueado hasta que el master registre un pago.
 */
export function clinicAccess(
  clinic: Pick<PlatformClinic, "status" | "trial_expires_at" | "paid_until">,
  now = Date.now(),
): ClinicAccess {
  if (clinic.status === "suspended") return "suspended";
  if (clinic.status === "trial") {
    return clinic.trial_expires_at != null && clinic.trial_expires_at <= now ? "trial_expired" : "ok";
  }
  return clinic.paid_until != null && clinic.paid_until <= now ? "payment_due" : "ok";
}

export function trialDaysFrom(raw: string | undefined): number {
  const days = Number(raw);
  return Number.isInteger(days) && days > 0 && days <= 365 ? days : DEFAULT_TRIAL_DAYS;
}

export function daysFromNow(days: number, now = Date.now()): number {
  return now + days * DAY_MS;
}

/** Un pago extiende desde el vencimiento vigente, o desde hoy si ya venció. */
export function nextPaidUntil(paidUntil: number | null, periods = 1, now = Date.now()): number {
  return Math.max(now, paidUntil ?? 0) + periods * BILLING_PERIOD_DAYS * DAY_MS;
}
