import type { ClinicRole, TenantContext } from "../tenant/context";

export type Capability =
  | "clinic:read"
  | "clinic:write"
  | "members:read"
  | "members:write"
  | "patients:read"
  | "patients:write"
  | "doctors:read"
  | "doctors:write"
  | "services:read"
  | "services:write"
  | "operatories:read"
  | "operatories:write"
  | "availability:read"
  | "availability:write"
  | "appointments:read"
  | "appointments:write"
  | "clinical:read"
  | "clinical:write"
  | "lab:read"
  | "lab:write"
  | "recalls:read"
  | "recalls:write"
  | "waiting:read"
  | "waiting:write"
  | "conversations:read"
  | "landing:read"
  | "landing:write"
  | "expenses:read"
  | "expenses:write"
  | "billing:read"
  | "billing:write"
  | "public:read"
  | "public:book";

const MATRIX: Record<ClinicRole, ReadonlySet<Capability>> = {
  owner: new Set<Capability>([
    "clinic:read",
    "clinic:write",
    "members:read",
    "members:write",
    "patients:read",
    "patients:write",
    "doctors:read",
    "doctors:write",
    "services:read",
    "services:write",
    "operatories:read",
    "operatories:write",
    "availability:read",
    "availability:write",
    "appointments:read",
    "appointments:write",
    "clinical:read",
    "clinical:write",
    "lab:read",
    "lab:write",
    "recalls:read",
    "recalls:write",
    "waiting:read",
    "waiting:write",
    "conversations:read",
    "landing:read",
    "landing:write",
    "expenses:read",
    "expenses:write",
    "billing:read",
    "billing:write",
    "public:read",
    "public:book",
  ]),
  admin: new Set<Capability>([
    "clinic:read",
    "clinic:write",
    "members:read",
    "members:write",
    "patients:read",
    "patients:write",
    "doctors:read",
    "doctors:write",
    "services:read",
    "services:write",
    "operatories:read",
    "operatories:write",
    "availability:read",
    "availability:write",
    "appointments:read",
    "appointments:write",
    "clinical:read",
    "clinical:write",
    "lab:read",
    "lab:write",
    "recalls:read",
    "recalls:write",
    "waiting:read",
    "waiting:write",
    "conversations:read",
    "landing:read",
    "landing:write",
    "expenses:read",
    "expenses:write",
    "public:read",
    "public:book",
  ]),
  dentist: new Set<Capability>([
    "clinic:read",
    "patients:read",
    "patients:write",
    "doctors:read",
    "doctors:write",
    "availability:read",
    "availability:write",
    "appointments:read",
    "appointments:write",
    "clinical:read",
    "clinical:write",
    "lab:read",
    "lab:write",
    "recalls:read",
    "recalls:write",
    "waiting:read",
    "waiting:write",
    "public:read",
    "public:book",
  ]),
  receptionist: new Set<Capability>([
    "clinic:read",
    "patients:read",
    "patients:write",
    "operatories:read",
    "availability:read",
    "availability:write",
    "appointments:read",
    "appointments:write",
    "clinical:read",
    "recalls:read",
    "recalls:write",
    "waiting:read",
    "waiting:write",
    "public:read",
    "public:book",
  ]),
  visitor: new Set<Capability>(["public:read", "public:book"]),
};

export function can(ctx: TenantContext, capability: Capability): boolean {
  return MATRIX[ctx.role].has(capability);
}
