import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@dental/core';
import { seedDemoClinic } from './helpers';

describe('TenantDb.update', () => {
  it('sobre una fila inexistente lanza NotFoundError (la API responde 404)', async () => {
    const { db } = await seedDemoClinic();
    await expect(db.update('patients', 'no-existe', { full_name: 'X' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('con un parche vacío no rompe: devuelve la fila tal cual', async () => {
    const { db, doctorId } = await seedDemoClinic();
    const row = await db.update<{ id: string }>('doctors', doctorId, {});
    expect(row.id).toBe(doctorId);
  });

  it('con un parche vacío sobre una fila ajena lanza NotFoundError', async () => {
    const { db } = await seedDemoClinic();
    await expect(db.update('doctors', 'de-otra-clinica', {})).rejects.toBeInstanceOf(NotFoundError);
  });
});
