import { auditRepo, type TenantContext } from '@dental/core';

export type AuditFn = (entry: {
  action: string;
  entity?: string;
  entityId?: string;
  meta?: unknown;
}) => Promise<void>;

/**
 * Registra en `audit_log` lo que hizo el copiloto. El actor es `ai` y queda
 * asociado al usuario del staff que disparó la acción. Nunca lanza: si la
 * auditoría falla, la operación ya se hizo y no se revierte.
 */
export function auditFor(d1: D1Database, ctx: TenantContext): AuditFn {
  const repo = auditRepo(d1);
  return (entry) =>
    repo.record({
      actorUserId: ctx.userId,
      actorType: ctx.userId ? 'ai' : 'system',
      clinicId: ctx.clinicId,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      meta: entry.meta,
    });
}
