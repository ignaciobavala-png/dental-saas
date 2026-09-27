# 02 — Multi-tenancy (aislamiento estricto)

## 1. Principio

Todos los consultorios comparten la misma aplicación y la misma D1, pero **ningún
consultorio debe poder leer, modificar, eliminar ni inferir datos de otro**,
incluso si un usuario manipula manualmente requests, IDs, parámetros, URLs o payloads.

El aislamiento debe ser una **propiedad estructural**, no una convención: no puede
depender de que cada desarrollador recuerde agregar `WHERE clinic_id = ?`.

## 2. Las cinco capas de defensa

Si una falla, las otras siguen en pie. Todas son server-side.

| # | Capa | Qué garantiza |
|---|---|---|
| 1 | **Tipos branded** | `TenantContext` solo lo puede crear el resolver; no se puede falsificar con `req.query.clinic` |
| 2 | **API de datos única** | Solo existe `TenantDb`, que **siempre** inyecta el scope. No hay método sin scope |
| 3 | **FKs compuestas en el esquema** | La base impide que una fila de A referencie una entidad de B |
| 4 | **Lint** | Prohíbe `env.DB.*` y SQL de tenant fuera de `src/db/**` |
| 5 | **Tests cross-tenant** | Matriz que intenta operar sobre B autenticado como A, en CRUD y en tools |

## 3. TenantContext (branded)

El contexto se define una sola vez y **solo se puede construir desde el resolver**:

```ts
// src/tenant/context.ts
declare const Brand: unique symbol

export type ClinicRole = 'owner' | 'admin' | 'dentist' | 'receptionist' | 'visitor'

export type TenantContext = {
  readonly [Brand]: true
  readonly clinicId: string
  readonly userId: string | null   // null en contexto público
  readonly role: ClinicRole
}

// Única fábrica. No se exporta el tipo sin la marca.
export function createTenantContext(input: {
  clinicId: string
  userId: string | null
  role: ClinicRole
}): TenantContext {
  return input as TenantContext
}
```

Ningún handler ni tool puede hacer `{ clinicId: req.query.clinic }` y usarlo como
contexto: **no compila**. La marca la aplica únicamente `createTenantContext()`.

Conceptualmente:

```ts
type TenantContext = {
  clinicId: string
  userId: string
  role: ClinicRole
}
```

## 4. Flujo de construcción del contexto

### 4.1 Privado

```
Request
  ↓
Authentication      (sesión → User)
  ↓
Membership / Clinic (user_id + selector de clínica validado contra memberships)
  ↓
createTenantContext({ clinicId, userId, role })
  ↓
TrustedTenantContext
  ↓
Repository / Service
  ↓
D1
```

- El cliente puede enviar qué clínica quiere usar (si pertenece a varias), pero
  ese id **se valida contra `memberships`** y se descarta el valor del cliente.
- El `role` sale de la membership, no del request.

### 4.2 Público

```
Hostname → domains.hostname → clinics.id → createTenantContext({ role: 'visitor', userId: null })
```

El hostname es lo único que decide el tenant. Ver §7.

## 5. `TenantDb`: la única puerta a tablas de tenant

`TenantDb` es el objeto que encapsula el scope. Toda operación agrega el filtro de
clínica por construcción.

```ts
class TenantDb {
  constructor(private ctx: TenantContext, private d1: D1Database) {}

  // SELECT ... WHERE clinic_id = ? [AND <where>] [AND deleted_at IS NULL]
  list<T>(table: TenantTable, where?: Where): Promise<T[]>

  // SELECT ... WHERE id = ? AND clinic_id = ?
  get<T>(table: TenantTable, id: string): Promise<T | null>

  // INSERT ... clinic_id forzado; se DESCARTA cualquier clinic_id del payload
  insert<T>(table: TenantTable, data: Partial<T>): Promise<T>

  // UPDATE ... WHERE id = ? AND clinic_id = ?
  update<T>(table: TenantTable, id: string, data: Partial<T>): Promise<T>

  // UPDATE deleted_at = ? WHERE id = ? AND clinic_id = ?
  remove(table: TenantTable, id: string): Promise<void>

  // SELECT COUNT(*) ... WHERE clinic_id = ? [AND <where>]
  count(table: TenantTable, where?: Where): Promise<number>

  // Escape hatch para JOINs/agregados. La plantilla DEBE contener el marcador
  // de tenant; si falta, lanza en runtime.
  scoped<T>(sql: ScopedSql): Promise<T[]>
}
```

Propiedades que lo hacen estructural:

- **No existe ningún método sin scope.** No hay `rawSelect` ni `findById` sin clínica.
- `insert` **ignora** el `clinic_id` que venga en `data` (siempre usa `ctx.clinicId`).
- `table` está tipada contra el registro `TENANT_TABLES`: no se puede pasar una
  tabla arbitraria ni una de plataforma.
- `scoped()` es la única vía para SQL crudo de tenant, exige el marcador de tenant,
  vive solo en `src/db/tenant/repos/**` y está cubierta por tests cross-tenant.
- El binding `D1Database` crudo **no se expone** fuera de `src/db/**`.

### 5.1 Registro de tablas

```ts
// src/db/tenant/tables.ts
export const TENANT_TABLES = {
  patients:       { pk: 'id', softDelete: 'deleted_at' },
  doctors:        { pk: 'id', softDelete: null },
  services:       { pk: 'id', softDelete: null },
  availability:   { pk: 'id', softDelete: null },
  appointments:   { pk: 'id', softDelete: null },
  expenses:       { pk: 'id', softDelete: null },
  conversations:  { pk: 'id', softDelete: null },
  messages:       { pk: 'id', softDelete: null },
  clinic_settings:{ pk: 'clinic_id', softDelete: null },
  // ...
} as const

export type TenantTable = keyof typeof TENANT_TABLES
```

## 6. Repositorios y servicios

- Cada repo recibe `TenantContext` y devuelve objetos de dominio.
- **Nunca** acepta un `clinicId: string` suelto ni construye `TenantDb` desde otra cosa.
- Fábrica `repos(ctx)` inyecta el contexto en todos los repos.
- Los servicios usan repos; no escriben SQL.
- Toda query usa el patrón:

```sql
-- listar
SELECT * FROM patients WHERE clinic_id = ?;

-- individual (NO alcanza con WHERE id = ?, aunque el id sea UUID)
SELECT * FROM patients WHERE id = ? AND clinic_id = ?;

-- UPDATE / DELETE: mismo principio
UPDATE patients SET ... WHERE id = ? AND clinic_id = ?;
DELETE FROM patients WHERE id = ? AND clinic_id = ?;
```

## 7. Chatbot público

- El tenant se resuelve **solo** desde el hostname (tabla `domains`), nunca desde
  el body del chat.
- Se construye un `TenantContext` público con `role: 'visitor'`.
- Las tools de IA reciben ese contexto desde el backend. DeepSeek **no** elige,
  modifica ni provee `clinic_id`.
- Guard adicional: si en los argumentos del modelo aparece `clinicId`/`clinic_id`,
  se descarta (y se testea).

## 8. Centralización del acceso a D1

- Todo el SQL de tenant vive en `src/db/tenant/repos/**`.
- Regla ESLint `no-restricted-syntax` que prohíbe `env.DB` (MemberExpression) fuera
  de `src/db/**`.
- Regla ESLint `no-restricted-imports` del binding D1 fuera de `src/db/**`.
- Un test de regresión falla si aparece `env.DB` fuera del scope permitido o SQL de
  tenant sin marcador.

## 9. Integridad cross-tenant a nivel de esquema

Las FKs simples no alcanzan: `appointments.patient_id → patients.id` permitiría que
una cita de A apunte a un paciente de B. Se usan **FKs compuestas** sobre
`(id, clinic_id)`, con `UNIQUE(id, clinic_id)` en los padres. Detalle en
[03 — Modelo de datos](03-modelo-de-datos.md#3-fk-compuesta-el-patrón-anti-cruce).

## 10. Checklist de revisión (para cada PR)

- [ ] ¿Se escribió SQL fuera de `src/db/**`? → rechazar.
- [ ] ¿Alguna query de tenant no pasa por `TenantDb` / repo con contexto? → rechazar.
- [ ] ¿Algún handler/tool aceptó `clinicId` del cliente? → rechazar.
- [ ] ¿Se creó una tabla de tenant sin `clinic_id NOT NULL`, `UNIQUE(id, clinic_id)`
      e índice liderado por `clinic_id`? → rechazar.
- [ ] ¿Se agregó la tabla al registro `TENANT_TABLES` y a la matriz de tests? → requerido.
