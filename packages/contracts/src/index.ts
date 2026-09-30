import { z } from "zod";

export const id = z.string().min(1);
export type Id = z.infer<typeof id>;

export const epochMs = z.number().int().nonnegative();
export type EpochMs = z.infer<typeof epochMs>;

export const cents = z.number().int();
export type Cents = z.infer<typeof cents>;

export const roleSchema = z.enum(["owner", "admin", "dentist", "receptionist"]);
export type Role = z.infer<typeof roleSchema>;

export const clinicSchema = z.object({
  id,
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "suspended", "trial"]),
  createdAt: epochMs,
});
export type Clinic = z.infer<typeof clinicSchema>;

export const userSchema = z.object({
  id,
  email: z.string(),
  name: z.string(),
  status: z.enum(["active", "invited", "disabled"]),
  createdAt: epochMs,
});
export type User = z.infer<typeof userSchema>;

export const membershipSchema = z.object({
  id,
  userId: id,
  clinicId: id,
  role: roleSchema,
  status: z.enum(["active", "invited", "disabled"]),
});
export type Membership = z.infer<typeof membershipSchema>;

export const patientSchema = z.object({
  id,
  clinicId: id,
  fullName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  document: z.string().nullable(),
  birthdate: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: epochMs,
});
export type Patient = z.infer<typeof patientSchema>;

export const doctorSchema = z.object({
  id,
  clinicId: id,
  name: z.string(),
  specialty: z.string().nullable(),
  bio: z.string().nullable(),
  photoUrl: z.string().nullable(),
  active: z.boolean(),
  serviceIds: z.array(id),
});
export type Doctor = z.infer<typeof doctorSchema>;

export const serviceSchema = z.object({
  id,
  clinicId: id,
  code: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  durationMin: z.number().int().positive(),
  priceCents: cents.nullable(),
  color: z.string(),
  active: z.boolean(),
});
export type Service = z.infer<typeof serviceSchema>;

export const operatorySchema = z.object({
  id,
  clinicId: id,
  name: z.string(),
  color: z.string(),
  sortOrder: z.number().int(),
  active: z.boolean(),
});
export type Operatory = z.infer<typeof operatorySchema>;

export const appointmentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const appointmentKindSchema = z.enum(["patient", "break", "lunch", "block"]);
export type AppointmentKind = z.infer<typeof appointmentKindSchema>;

export const appointmentSourceSchema = z.enum(["dashboard", "ai", "landing"]);
export type AppointmentSource = z.infer<typeof appointmentSourceSchema>;

export const appointmentSchema = z.object({
  id,
  clinicId: id,
  patientId: id.nullable(),
  doctorId: id.nullable(),
  serviceId: id.nullable(),
  operatoryId: id.nullable(),
  startsAt: epochMs,
  endsAt: epochMs,
  status: appointmentStatusSchema,
  kind: appointmentKindSchema,
  source: appointmentSourceSchema,
  notes: z.string().nullable(),
});
export type Appointment = z.infer<typeof appointmentSchema>;

export const treatmentPlanStatusSchema = z.enum(["planned", "accepted", "completed", "declined"]);
export type TreatmentPlanStatus = z.infer<typeof treatmentPlanStatusSchema>;

export const treatmentPlanItemSchema = z.object({
  id,
  clinicId: id,
  patientId: id,
  serviceId: id.nullable(),
  tooth: z.string().nullable(),
  surface: z.string().nullable(),
  feeCents: cents,
  status: treatmentPlanStatusSchema,
  notes: z.string().nullable(),
  sortOrder: z.number().int(),
});
export type TreatmentPlanItem = z.infer<typeof treatmentPlanItemSchema>;

export const toothConditionSchema = z.enum([
  "caries",
  "restoration",
  "crown",
  "missing",
  "implant",
  "endo",
]);
export type ToothCondition = z.infer<typeof toothConditionSchema>;

export const toothConditionRecordSchema = z.object({
  id,
  clinicId: id,
  patientId: id,
  tooth: z.string(),
  surface: z.string().nullable(),
  condition: toothConditionSchema,
  recordedBy: id.nullable(),
  recordedAt: epochMs,
});
export type ToothConditionRecord = z.infer<typeof toothConditionRecordSchema>;

export const clinicalNoteSchema = z.object({
  id,
  clinicId: id,
  patientId: id,
  doctorId: id.nullable(),
  noteDate: epochMs,
  body: z.string(),
  createdBy: id.nullable(),
});
export type ClinicalNote = z.infer<typeof clinicalNoteSchema>;

export const recallSchema = z.object({
  id,
  clinicId: id,
  patientId: id,
  serviceId: id.nullable(),
  dueAfter: z.string().nullable(),
  source: z.enum(["reception", "patient", "system"]),
  status: z.enum(["open", "scheduled", "cancelled"]),
  notes: z.string().nullable(),
});
export type Recall = z.infer<typeof recallSchema>;

export const waitingListItemSchema = z.object({
  id,
  clinicId: id,
  patientId: id,
  serviceId: id.nullable(),
  doctorId: id.nullable(),
  durationMin: z.number().int().positive(),
  status: z.enum(["open", "scheduled", "cancelled"]),
  notes: z.string().nullable(),
  createdAt: epochMs,
});
export type WaitingListItem = z.infer<typeof waitingListItemSchema>;

export const clinicSettingsSchema = z.object({
  clinicId: id,
  timezone: z.string(),
  locale: z.string(),
  contact: z.object({
    phone: z.string().nullable(),
    whatsapp: z.string().nullable(),
    email: z.string().nullable(),
    address: z.string().nullable(),
  }),
  openingHours: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      openMin: z.number().int(),
      closeMin: z.number().int(),
    }),
  ),
  slotMinutes: z.number().int().positive(),
  updatedAt: epochMs,
});
export type ClinicSettings = z.infer<typeof clinicSettingsSchema>;

/**
 * Proyección pública de un consultorio para la landing
 * (`GET /api/public/clinic/:slug`). Solo campos aptos para un visitante anónimo:
 * nada de ids internos de plataforma, sesiones ni configuración privada.
 */
export const publicClinicServiceSchema = z.object({
  id,
  name: z.string(),
  description: z.string().nullable(),
  durationMin: z.number().int().positive(),
  priceCents: cents.nullable(),
  color: z.string(),
});
export type PublicClinicService = z.infer<typeof publicClinicServiceSchema>;

export const publicClinicDoctorSchema = z.object({
  id,
  name: z.string(),
  specialty: z.string().nullable(),
  bio: z.string().nullable(),
  photoUrl: z.string().nullable(),
  serviceIds: z.array(id),
});
export type PublicClinicDoctor = z.infer<typeof publicClinicDoctorSchema>;

export const publicClinicSchema = z.object({
  slug: z.string(),
  name: z.string(),
  tagline: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  openingHours: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      openMin: z.number().int(),
      closeMin: z.number().int(),
    }),
  ),
  slotMinutes: z.number().int().positive().nullable(),
  obrasSociales: z.array(z.string()),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })),
  testimonials: z.array(z.object({ name: z.string(), text: z.string() })),
  services: z.array(publicClinicServiceSchema),
  doctors: z.array(publicClinicDoctorSchema),
});
export type PublicClinic = z.infer<typeof publicClinicSchema>;

export const aiInquirySchema = z.object({
  id,
  patientName: z.string(),
  topic: z.string(),
  channel: z.enum(["landing", "whatsapp"]),
  at: epochMs,
  status: z.enum(["new", "contacted", "booked"]),
});
export type AiInquiry = z.infer<typeof aiInquirySchema>;
