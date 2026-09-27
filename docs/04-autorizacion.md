# 04 — Autorización

Tres responsabilidades **separadas**, que no deben mezclarse:

| Pregunta | Responsable |
|---|---|
| ¿Quién sos? | **Autenticación** (sesión → `User`) |
| ¿A qué clínica pertenecés? | **Aislamiento de tenant** (`TenantContext`) |
| ¿Qué podés hacer dentro de esa clínica? | **Autorización** (roles + capacidades) |

El aislamiento se aplica **siempre**, tenga o no el rol la capacidad de la acción.
Un `receptionist` de A jamás ve datos de B, aunque tenga todos los permisos dentro de A.

## 1. Roles dentro de la clínica

```ts
export type ClinicRole = 'owner' | 'admin' | 'dentist' | 'receptionist' | 'visitor'
```

- `owner` — dueño de la clínica. Todo, incluida facturación y transferencia de propiedad.
- `admin` — gestión administrativa completa, sin acciones críticas de propiedad/billing.
- `dentist` — su agenda y sus pacientes.
- `receptionist` — agenda, pacientes y turnos (no configuración sensible).
- `visitor` — contexto **público** (landing/chat). Solo lectura pública + crear
  solicitud de turno.

El rol vive en la **membership**, no en el request. Un usuario puede pertenecer a
varias clínicas con roles distintos; el rol efectivo es el de la clínica activa.

## 2. Capacidades

La autorización es **por capacidad**, no por comparación de strings de rol dispersa.
Se define una única matriz y se consulta con `can(ctx, capability)`.

```ts
type Capability =
  | 'clinic:read' | 'clinic:write'
  | 'members:read' | 'members:write'
  | 'patients:read' | 'patients:write'
  | 'doctors:read' | 'doctors:write'
  | 'services:read' | 'services:write'
  | 'operatories:read' | 'operatories:write'
  | 'availability:read' | 'availability:write'
  | 'appointments:read' | 'appointments:write'
  | 'clinical:read' | 'clinical:write'   -- plan, odontograma, evolución
  | 'lab:read' | 'lab:write'
  | 'recalls:read' | 'recalls:write'
  | 'waiting:read' | 'waiting:write'
  | 'conversations:read'
  | 'landing:read' | 'landing:write'
  | 'expenses:read' | 'expenses:write'
  | 'billing:read' | 'billing:write'
  | 'public:read' | 'public:book'
```

Matriz (resumen; la fuente de verdad vive en `src/auth/roles.ts`):

| Capacidad | owner | admin | dentist | receptionist | visitor |
|---|:--:|:--:|:--:|:--:|:--:|
| `clinic:write` | ✓ | ✓ | | | |
| `members:*` | ✓ | ✓ | | | |
| `patients:read/write` | ✓ | ✓ | ✓ (sus pac.) | ✓ | |
| `doctors:*` | ✓ | ✓ | ✓ (su perfil) | | |
| `services:*` | ✓ | ✓ | | | |
| `operatories:*` | ✓ | ✓ | | ✓ | |
| `availability:write` | ✓ | ✓ | ✓ (su agenda) | ✓ | |
| `appointments:read/write` | ✓ | ✓ | ✓ (su agenda) | ✓ | |
| `clinical:read` | ✓ | ✓ | ✓ (sus pac.) | ✓ | |
| `clinical:write` | ✓ | ✓ | ✓ (sus pac.) | | |
| `recalls:read/write` | ✓ | ✓ | ✓ | ✓ | |
| `waiting:read/write` | ✓ | ✓ | ✓ | ✓ | |
| `lab:read/write` | ✓ | ✓ | ✓ | | |
| `landing:write` | ✓ | ✓ | | | |
| `expenses:*` | ✓ | ✓ | | | |
| `billing:*` | ✓ | | | | |
| `public:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `public:book` | ✓ | ✓ | ✓ | ✓ | ✓ |

Notas:

- Las capacidades con alcance propio (`sus pacientes`, `su agenda`) requieren un
  chequeo adicional de pertenencia (p.ej. `appointments.doctor_id === ctx.userId`),
  que se resuelve en el servicio, no en la matriz.
- `visitor` no tiene ninguna capacidad de lectura de datos privados; solo lo público.

## 3. Puntos de enforcement

1. **Middleware de borde** — construye `TenantContext` y rechaza requests sin
   membership válida. No decide permisos finos.
2. **Servicios** — llaman `can(ctx, cap)` antes de ejecutar la acción.
3. **AI tools** — el runner verifica capacidades antes de ejecutar la tool
   (las públicas usan `public:*`).
4. **Aislamiento** — se aplica en `TenantDb`/repos, independiente de `can()`.

## 4. Reglas de implementación

- Nunca derivar permisos del frontend.
- Nunca comparar roles con `if (role === 'admin' || role === 'owner')` disperso:
  centralizar en la matriz y en `can()`.
- La lista de roles es fija y vive en un solo lugar; si el negocio pide roles nuevos,
  se extiende la matriz (no se agregan `if` sueltos).
- Las capacidades de escritura del `visitor` se limitan a crear una solicitud de turno
  (`public:book`), sujeta a validación de disponibilidad y anti-abuso (rate limit + Turnstile).

## 5. Capacidades y agentes de IA

Los agentes de IA (ver [05 — Agentes IA](05-agentes-ia.md)) **no tienen permisos
propios**: heredan el `TenantContext` del usuario que los invoca y cada tool declara
la capacidad que requiere. El builder expone solo las tools permitidas por `can()`.

| Tool de IA | Capacidad requerida | Superficie |
|---|---|---|
| `get_clinic_information` | `public:read` | pública |
| `get_services` | `public:read` | pública |
| `get_doctors` | `public:read` | pública |
| `get_available_slots` | `public:read` | pública |
| `create_appointment` | `public:book` | pública |
| `get_agenda` | `appointments:read` | interna |
| `find_patient` | `patients:read` | interna |
| `register_patient` / `update_patient` | `patients:write` | interna |
| `reschedule_appointment` / `cancel_appointment` | `appointments:write` | interna |
| `block_availability` | `availability:write` | interna |
| `list_recalls` / `schedule_recall` | `recalls:read/write` | interna |
| `list_waiting` / `offer_waiting_slot` | `waiting:read/write` | interna |
| `list_pending_conversations` | `conversations:read` | interna |

Reglas:

- El set de tools disponibles se deriva de `can(ctx, cap)`, no de una lista fija por
  superficie hardcodeada aparte.
- Las capacidades con alcance propio (`su agenda`) siguen resolviéndose en el service,
  también para las tools.
- `billing:*` y `settings` **no** se exponen como tools: nunca autónomas por IA.
- **Los datos clínicos no se exponen como tools.** `clinical:read/write`
  (odontograma, plan, evolución) y `lab:*` son de la persona, no del agente: ninguna
  superficie de IA los lee ni los escribe.
- Las escrituras consecuentes requieren confirmación humana (ver `05`).
