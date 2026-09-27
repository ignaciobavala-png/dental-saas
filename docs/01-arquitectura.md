# 01 — Arquitectura

## 1. Decisiones estructurales

- **Monorepo** (pnpm workspaces + Turborepo) con **dos frontends** y un **backend**:
  `apps/landing`, `apps/admin`, `apps/api`.
- **Una sola base Cloudflare D1 compartida** por todos los consultorios, con
  **multi-tenancy estricta**. (Decidido. No database-per-tenant en el MVP.)
- **Dos Workers**:
  - `apps/api` — backend (Hono) + sirve los static assets de `apps/admin`.
  - `apps/landing` — Astro SSR, landing pública por tenant.
- **`apps/landing` no bindea D1.** Pide los datos del tenant a `apps/api` por
  **service binding** (local a Cloudflare, sin internet). Un solo escritor de D1.
- **TypeScript strict** en todo el monorepo.
- El aislamiento entre clínicas es una **propiedad estructural** (ver
  [02 — Multi-tenancy](02-multi-tenancy.md)).
- **DeepSeek nunca accede a D1.** Toda acción pasa por tools controladas por el backend.
- Se diseña una **abstracción de persistencia** que permita, a futuro, migrar
  clínicas puntuales a database-per-tenant sin reescribir la lógica de negocio.
  **No se implementa ahora.**

Detalle del front en [09 — Frontend](09-frontend.md).

## 2. Topología de deploy

```
app.nuestrosaas.com        → Worker apps/api      (Hono /api/* + static assets admin)
*.nuestrosaas.com          → Worker apps/landing  (Astro SSR por tenant)
  + dominios de cliente    → Cloudflare for SaaS (custom hostnames)

apps/landing  ──service binding──▶  apps/api  ──▶  D1
```

- `apps/admin` se sirve como **static assets del Worker de API** → mismo origen que
  `/api` (cookie de sesión sin CORS).
- `apps/landing` resuelve el tenant por hostname y renderiza en el servidor (SEO);
  para datos llama a `apps/api` por service binding.
- Las mutaciones (chat, reservas, CRUD) viven **solo en `apps/api`**: rate limit,
  Turnstile y reglas de negocio en un único lugar.

## 3. Capas

```
┌──────────────────────────────────────────────────────────────┐
│  Presentación   apps/landing (Astro) · apps/admin (React SPA)  │
├──────────────────────────────────────────────────────────────┤
│  Borde / HTTP   apps/api: rutas Hono · middlewares            │
│                 (auth, membership, hostname, csrf, rate-limit) │
├──────────────────────────────────────────────────────────────┤
│  Dominio        Services (negocio) · Agentes de IA            │
├──────────────────────────────────────────────────────────────┤
│  Datos          Repositorios · TenantDb (auto-scope)          │
├──────────────────────────────────────────────────────────────┤
│  Persistencia   Cloudflare D1                                 │
└──────────────────────────────────────────────────────────────┘
```

Regla: **ninguna capa de arriba toca D1 directamente.** Solo `packages/core/src/db/**`
(y su uso desde `apps/api`) conoce el binding `env.DB`.

## 4. Flujo de un request privado (dashboard/API)

```
Request
  ↓
Authentication            ¿Quién sos?            (sesión → User)
  ↓
Membership / Clinic       ¿A qué clínica pertenecés? (user → membership)
  ↓
TrustedTenantContext      contexto branded, confiable
  ↓
Repository / Service      recibe el contexto, nunca un clinicId suelto
  ↓
D1
```

Puntos clave:

- El `clinic_id` **nunca** se toma del frontend como autoridad. Si el cliente manda
  una clínica seleccionada (porque un usuario puede pertenecer a varias), se usa
  solo como **selector**, se **valida contra `memberships`** y se reemplaza por el
  valor confiable.
- El contexto confiable se construye en un único módulo (`packages/core/src/tenant/context.ts`).

## 5. Flujo de un request público (landing / chatbot)

```
Hostname (garcia.nuestrosaas.com)
  ↓
resolver hostname (tabla domains)   ← en apps/landing
  ↓
clinic_id
  ↓
PUBLIC TenantContext (role: 'visitor', userId: null)
  ↓
render de landing / AI tools
  ↓
apps/api (service binding) → D1
```

El tenant público se resuelve **solo** desde información controlada por el backend
(el hostname). DeepSeek no elige, modifica ni provee `clinic_id`.

## 6. Flujo de una acción de IA

```
DeepSeek
  ↓
tool call
  ↓
apps/api
  ↓
validación (permisos/capacidad, negocio, disponibilidad)
  ↓
TenantContext (cerrado por closure en la tool)
  ↓
service de negocio (el mismo que usa la UI)
  ↓
repository
  ↓
D1
```

## 7. Estructura del monorepo

```
dental-saas/
  apps/
    api/                       # Worker (Hono) + static assets de admin
      src/
        index.ts               # entry
        middleware/            # auth, membership, csrf, rate-limit
        tenant/context.ts      # TenantContext branded + createTenantContext()
        auth/                  # sesiones, roles, matriz de capacidades
        db/
          platform/repos/      # clinics, users, memberships, domains, plans
          tenant/
            tenant-db.ts       # TenantDb (auto-scope)
            tables.ts          # registro TENANT_TABLES
            repos/             # ← ÚNICO lugar con SQL de tablas de tenant
          migrations/          # migraciones .sql planas
        services/              # availability, booking, patients, ...
        ai/                    # agentes + tools (públicas / internas)
        routes/                # endpoints HTTP
      wrangler.jsonc
    landing/                   # Astro SSR en Workers
      src/
        pages/                 # rutas (resuelven tenant por hostname)
        layouts/
        components/sections/   # registro de secciones + variantes
        lib/theme.ts           # tokens → CSS custom properties
        lib/api.ts             # cliente via service binding
      astro.config.mjs
      wrangler.jsonc
    admin/                     # React SPA (Vite + React Router)
      src/
        routes/                # Hoy, Agenda, Pacientes, ...
        features/
        lib/api.ts             # cliente tipado (/api)
      vite.config.ts
  packages/
    core/                      # dominio: TenantContext, TenantDb, repos, services
    contracts/                 # zod + tipos de la API (fuente única)
    theme/                     # themeSchema + presets curados
    config/                    # tsconfig / eslint base
  tests/                       # cross-tenant, tools, schema (ver 06)
  docs/
  pnpm-workspace.yaml · turbo.json
```

## 8. Persistencia: dos familias de tablas

| Familia | Ejemplos | Scope |
|---|---|---|
| **Plataforma** | `clinics`, `users`, `memberships`, `domains`, `plans`, `subscriptions`, `sessions`, `audit_log` | Global; acceso vía repos de plataforma |
| **Tenant** | `patients`, `doctors`, `appointments`, `services`, `availability`, `expenses`, `conversations`, `messages`, `clinic_settings` | Siempre scoped por `clinic_id` |

Detalle en [03 — Modelo de datos](03-modelo-de-datos.md).

## 9. Contratos entre apps

`packages/contracts` es la **fuente única** de los contratos de la API (esquemas zod
+ tipos inferidos):

- `apps/api` valida input/output contra ellos.
- `apps/landing` y `apps/admin` tipan sus llamadas con ellos.

Evita el drift entre los dos frontends y el backend. Toda mutación nueva agrega su
contrato acá antes de implementarse.

## 10. Abstracción para el futuro database-per-tenant

Sin agregar complejidad hoy:

- Interfaz `TenantStore` con los métodos que expone `TenantDb`.
- Implementación actual: `SharedTenantStore` (D1 compartida + `clinic_id`).
- Futuro: `DedicatedTenantStore` (resuelve la D1 propia de la clínica por
  `clinics.db_strategy` / `clinics.db_ref`).
- Los services y repos dependen de la **interfaz**, no de la implementación.
  Migrar una clínica es cambiar la fábrica, no la lógica.

La tabla `clinics` ya incluye `db_strategy TEXT NOT NULL DEFAULT 'shared'` y
`db_ref TEXT` desde el día 1, aunque hoy no se usen.

## 11. Deploy, dominios y costos

Ver [12 — Deploy, dominios y costos](12-deploy-dominios-costos.md).
