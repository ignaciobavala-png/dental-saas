export const TENANT_TABLES = {
  doctors: { pk: "id", softDelete: null },
  services: { pk: "id", softDelete: null },
  operatories: { pk: "id", softDelete: null },
  availability: { pk: "id", softDelete: null },
  patients: { pk: "id", softDelete: "deleted_at" },
  appointments: { pk: "id", softDelete: null },
  clinic_settings: { pk: "clinic_id", softDelete: null },
  treatment_plan_items: { pk: "id", softDelete: null },
  tooth_conditions: { pk: "id", softDelete: null },
  clinical_notes: { pk: "id", softDelete: null },
  recalls: { pk: "id", softDelete: null },
  waiting_list: { pk: "id", softDelete: null },
  ai_inquiries: { pk: "id", softDelete: null },
  idempotency_keys: { pk: "id", softDelete: null },
} as const;

export type TenantTable = keyof typeof TENANT_TABLES;
