# 06 — Testing

El aislamiento entre clínicas y las tools de IA **no son opcionales de testear**:
son parte de la definición de "terminado". Un PR que toca datos de tenant sin tests
cross-tenant no se mergea.

## 1. Setup

- **`@cloudflare/vitest-plugin`** corre los tests dentro del runtime de Workers.
- Bindings D1 reales (Miniflare), con **storage aislado por archivo de test**.
- Las migraciones se aplican en el setup global antes de los tests.
- TypeScript strict también en tests.

```ts
// vitest.config.ts (esquema)
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
  test: { setupFiles: ['./tests/setup.ts'] },
})
```

## 2. Helpers base

- `seedTwoClinics()` → crea Clínica A y Clínica B con datos representativos en
  **todas** las tablas de tenant.
- `ctxFor(clinic, role)` → `TenantContext` válido para tests (usa la fábrica real).
- `snapshotClinic(clinic)` → snapshot de todas las filas de tenant de una clínica,
  para comparar antes/después y afirmar "B quedó intacta".
- `TENANT_TABLES` se reutiliza para **parametrizar** la matriz: una tabla nueva
  entra automáticamente al test (y el test falla si no tiene los campos requeridos).

## 3. Matriz cross-tenant (test central)

Autenticado como Clínica A, para **cada tabla de tenant**:

| Operación | Caso | Resultado esperado |
|---|---|---|
| SELECT | `get(id_de_B)` | `null` / 0 filas |
| SELECT | `list()` | ninguna fila de B |
| UPDATE | `update(id_de_B, data)` | 0 cambios; B intacta |
| DELETE | `remove(id_de_B)` | 0 cambios; B intacta |
| INSERT | `insert({ clinic_id: id_de_B, ... })` | se fuerza A (o se rechaza); B intacta |

Además:

- Un recurso de B referenciado desde un listado de A nunca aparece.
- `snapshotClinic(B)` es idéntico antes y después de toda la batería de A.
- Simétrico: correr lo mismo autenticado como B contra A.

## 4. Tests de tools de IA

- Cada tool se invoca con `ctx = A` y argumentos que referencian IDs de B →
  no filtra ni escribe en B.
- El `inputSchema` de cada tool **no** contiene `clinic_id` (test sobre el esquema).
- Inyectar `clinicId`/`clinic_id` en `args` → se ignora; la operación queda scopeada a A.
- `create_appointment` con `ctx` público (visitor) y datos válidos → crea en la
  clínica del hostname y con `source: 'ai'`.
- Rate limit / límite de iteraciones (tests de abuso básicos).

### 4.1 Agente interno (asistente del dashboard)

- El set de tools expuesto depende de `can(ctx, cap)`: un `receptionist` **no** recibe
  tools de billing/settings; un `dentist` solo las de su agenda (los IDs de otro
  profesional se rechazan en el service).
- Las tools de escritura con `ctx = A` y args que referencian IDs de B → 0 filas
  afectadas y B intacta.
- Ejecutar una acción sensible sin confirmación humana → rechazada.
- Cada acción ejecutada por IA deja registro en `audit_log` con `actor_type: 'ai'`
  y `conversation_id`.
- **Datos clínicos fuera del alcance de la IA**: ninguna tool (pública ni interna)
  recibe ni devuelve `tooth_conditions`, `treatment_plan_items`, `clinical_notes` ni
  `lab_cases`. Test que falla si un service clínico se expone como tool.

## 5. Tests de esquema

- **FK compuesta**: intentar crear una `appointment` en A con `patient_id` de B →
  debe fallar por constraint. Ídem para `treatment_plan_items`, `tooth_conditions`,
  `clinical_notes`, `recalls` y `waiting_list`: insertar en A con un `patient_id` (o
  `doctor_id`/`service_id`) de B debe fallar.
- **Anti doble-reserva**: dos inserts concurrentes al mismo `(doctor_id, starts_at)`
  con estado activo → exactamente uno gana.
- **`kind` de turno**: un `appointment` con `kind: 'patient'` y `patient_id`/`doctor_id`
  null → rechazado por el CHECK; un bloqueo (`break`/`lunch`) sin paciente → aceptado.
- Not-NULL de `clinic_id` en todas las tablas de tenant.

## 6. Tests de resolución pública

- `hostname` de A resuelve a `clinic_id` de A.
- Un hostname desconocido no resuelve a ninguna clínica.
- El contexto público no puede leer datos privados de ninguna clínica.

## 7. Tests de regresión de arquitectura

- Ningún archivo fuera de `packages/core/src/db/**` referencia `env.DB` (grep/scan en test).
- Ningún template SQL de tenant en `packages/core/src/db/tenant/repos/**` carece del
  marcador de tenant.
- Toda tabla de `TENANT_TABLES` tiene `clinic_id` e índice liderado por `clinic_id`
  (introspección del esquema).

## 8. Cobertura mínima por hito

| Hito | Tests que deben estar en verde |
|---|---|
| H1 | Matriz cross-tenant CRUD (tablas existentes), tests de esquema |
| H2 | Construcción de contexto, membership inválida rechazada, selector de clínica validado |
| H3 | Motor de disponibilidad, anti doble-reserva, scoping de turnos |
| H4 | Resolución por hostname, no-leak entre landings |
| H5 | Tools de IA cross-tenant, reserva desde chat, guard de `clinic_id` en args |
| H7 | Abuso (rate limit/Turnstile), E2E del ciclo principal |
| H8 | Tools del agente interno por capacidad, confirmación y auditoría |
| F0–F3 | Unit de theme/contratos y E2E de las apps (Playwright) |

## 9. E2E del ciclo

Al menos un test que recorra:

```
hostname → landing → chat (tool get_available_slots) → create_appointment
        → D1 → aparece en el dashboard de la clínica correcta
```

y su contraparte negativa: los mismos pasos no pueden crear ni leer nada en otra clínica.

## 10. Testing de frontend

- **Unit** (`apps/landing`, `apps/admin`): merge de theme + emisión de tokens,
  resolución sección→componente, validación de contratos zod, helpers de formato.
- **Contratos**: un test verifica que los esquemas de `packages/contracts` son los
  mismos que usan API y clients (una sola fuente).
- **E2E (Playwright)**: login, agenda (crear/mover turno), editor de landing,
  reserva desde la landing y chat. Ver skill `playwright-e2e-delivery`.
- **Responsive**: auditoría con Chrome headless a 360 / 390 / 768 / 1024 / 1440
  (ver skill `auditoria-responsive-chrome-headless`).
- **SEO/perf de la landing**: HTML del servidor con contenido real (no cliente),
  JSON-LD presente, y presupuesto de JS por página.
