import type { TenantContext } from "../../tenant/context";
import { TENANT_TABLES, type TenantTable } from "./tables";

export type Where = { sql: string; args: unknown[] };

export type ScopedSql = { sql: string; args: unknown[] };

const TENANT_MARKER = "clinic_id";

function assertHasMarker(sql: string): void {
  if (!sql.includes(TENANT_MARKER)) {
    throw new Error("scoped() query must reference clinic_id");
  }
}

function rowId(): string {
  return crypto.randomUUID();
}

/** La fila no existe en este consultorio (o es de otro): la API la traduce a 404. */
export class NotFoundError extends Error {
  constructor(message = "No encontrado.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class TenantDb {
  constructor(
    private readonly ctx: TenantContext,
    private readonly d1: D1Database,
  ) {}

  get clinicId(): string {
    return this.ctx.clinicId;
  }

  async list<T>(table: TenantTable, where?: Where): Promise<T[]> {
    const def = TENANT_TABLES[table];
    let sql = `SELECT * FROM ${table} WHERE clinic_id = ?`;
    const args: unknown[] = [this.ctx.clinicId];
    if (where) {
      sql += ` AND (${where.sql})`;
      args.push(...where.args);
    }
    if (def.softDelete) sql += ` AND ${def.softDelete} IS NULL`;
    const res = await this.d1.prepare(sql).bind(...args).all<T>();
    return res.results ?? [];
  }

  async get<T>(table: TenantTable, id: string): Promise<T | null> {
    const def = TENANT_TABLES[table];
    const idCol = def.pk;
    const sql =
      idCol === "clinic_id"
        ? `SELECT * FROM ${table} WHERE clinic_id = ?`
        : `SELECT * FROM ${table} WHERE ${idCol} = ? AND clinic_id = ?`;
    const args = idCol === "clinic_id" ? [this.ctx.clinicId] : [id, this.ctx.clinicId];
    const row = await this.d1.prepare(sql).bind(...args).first<T>();
    return row ?? null;
  }

  async insert<T extends Record<string, unknown>>(table: TenantTable, data: Partial<T>): Promise<T> {
    const def = TENANT_TABLES[table];
    const payload: Record<string, unknown> = { ...data, clinic_id: this.ctx.clinicId };
    if (def.pk !== "clinic_id" && payload[def.pk] == null) {
      payload[def.pk] = rowId();
    }
    const cols = Object.keys(payload);
    const placeholders = cols.map(() => "?").join(", ");
    const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`;
    const row = await this.d1
      .prepare(sql)
      .bind(...cols.map((c) => payload[c]))
      .first<T>();
    if (!row) throw new Error(`insert into ${table} failed`);
    return row;
  }

  async update<T extends Record<string, unknown>>(
    table: TenantTable,
    id: string,
    data: Partial<T>,
  ): Promise<T> {
    const def = TENANT_TABLES[table];
    const payload = { ...data };
    delete (payload as Record<string, unknown>).clinic_id;
    delete (payload as Record<string, unknown>)[def.pk];
    const cols = Object.keys(payload);
    if (cols.length === 0) {
      // Nada que cambiar: un UPDATE sin SET es SQL inválido.
      const current = await this.get<T>(table, id);
      if (!current) throw new NotFoundError(`update ${table}/${id} not found`);
      return current;
    }
    const sets = cols.map((c) => `${c} = ?`).join(", ");
    const idCol = def.pk;
    const sql =
      idCol === "clinic_id"
        ? `UPDATE ${table} SET ${sets} WHERE clinic_id = ? RETURNING *`
        : `UPDATE ${table} SET ${sets} WHERE ${idCol} = ? AND clinic_id = ? RETURNING *`;
    const args =
      idCol === "clinic_id"
        ? [...cols.map((c) => (payload as Record<string, unknown>)[c]), this.ctx.clinicId]
        : [...cols.map((c) => (payload as Record<string, unknown>)[c]), id, this.ctx.clinicId];
    const row = await this.d1.prepare(sql).bind(...args).first<T>();
    if (!row) throw new NotFoundError(`update ${table}/${id} not found`);
    return row;
  }

  async remove(table: TenantTable, id: string): Promise<void> {
    const def = TENANT_TABLES[table];
    if (def.softDelete) {
      const sql = `UPDATE ${table} SET ${def.softDelete} = ? WHERE ${def.pk} = ? AND clinic_id = ?`;
      await this.d1.prepare(sql).bind(Date.now(), id, this.ctx.clinicId).run();
      return;
    }
    const sql = `DELETE FROM ${table} WHERE ${def.pk} = ? AND clinic_id = ?`;
    await this.d1.prepare(sql).bind(id, this.ctx.clinicId).run();
  }

  async count(table: TenantTable, where?: Where): Promise<number> {
    const def = TENANT_TABLES[table];
    let sql = `SELECT COUNT(*) as n FROM ${table} WHERE clinic_id = ?`;
    const args: unknown[] = [this.ctx.clinicId];
    if (where) {
      sql += ` AND (${where.sql})`;
      args.push(...where.args);
    }
    if (def.softDelete) sql += ` AND ${def.softDelete} IS NULL`;
    const row = await this.d1.prepare(sql).bind(...args).first<{ n: number }>();
    return row?.n ?? 0;
  }

  async scoped<T>(query: ScopedSql): Promise<T[]> {
    assertHasMarker(query.sql);
    const res = await this.d1.prepare(query.sql).bind(...query.args).all<T>();
    return res.results ?? [];
  }
}
