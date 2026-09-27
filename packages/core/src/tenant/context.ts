declare const Brand: unique symbol;

export type ClinicRole = "owner" | "admin" | "dentist" | "receptionist" | "visitor";

export type TenantContext = {
  readonly [Brand]: true;
  readonly clinicId: string;
  readonly userId: string | null;
  readonly role: ClinicRole;
};

export function createTenantContext(input: {
  clinicId: string;
  userId: string | null;
  role: ClinicRole;
}): TenantContext {
  return input as TenantContext;
}
