export const TENANT_TABLES = {
  doctors: { pk: "id", softDelete: null },
  services: { pk: "id", softDelete: null },
  operatories: { pk: "id", softDelete: null },
  availability: { pk: "id", softDelete: null },
  patients: { pk: "id", softDelete: "deleted_at" },
  appointments: { pk: "id", softDelete: null },
  clinic_settings: { pk: "clinic_id", softDelete: null },
} as const;

export type TenantTable = keyof typeof TENANT_TABLES;
