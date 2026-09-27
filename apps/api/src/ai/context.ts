import type { Role } from '@dental/contracts';

export type AgentRole = Role | 'visitor';

export type TenantContext = {
  clinicId: string;
  role: AgentRole;
  userId: string | null;
};

export type Capability = 'public:read' | 'public:write';

export function can(ctx: TenantContext, capability: Capability): boolean {
  if (ctx.role === 'visitor') return capability.startsWith('public:');
  return true;
}

export const publicVisitorContext: TenantContext = {
  clinicId: 'cl_arocena',
  role: 'visitor',
  userId: null,
};
