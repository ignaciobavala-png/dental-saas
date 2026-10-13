# Convenciones de desarrollo — SaaS Dental

## Qué es

SaaS multi-tenant para consultorios odontológicos: landing premium + secretaría IA
+ gestión de pacientes, profesionales y turnos. Contexto completo en
[`docs/`](docs/README.md); leer [`docs/01-arquitectura.md`](docs/01-arquitectura.md)
y [`docs/02-multi-tenancy.md`](docs/02-multi-tenancy.md) antes de escribir código.

## Estado

Piloto funcional: alta de consultorios, landing pública, secretaría IA con reservas,
panel con agenda, pacientes e historia clínica, y consola de plataforma. Lo que falta
para producción está en [`docs/17`](17-auditoria-produccion.md).

## Stack

- **Monorepo**: pnpm workspaces + Turborepo.
- **`apps/api`**: Cloudflare Worker (Hono) — backend, D1, agentes de IA, sirve el admin.
- **`apps/landing`**: Astro SSR en Workers — landing pública por tenant.
- **`apps/admin`**: React 19 SPA (Vite + React Router) — dashboard.
- **`packages/`**: `core` (dominio y datos), `contracts` (zod + tipos), `theme`, `config`.
- TypeScript **strict**; Tailwind v4; Zustand + TanStack Query en el admin.
- `react-odontogram` (MIT) para el odontograma. **No** usar los paquetes `@clawnify/*`.

## pnpm

- pnpm workspaces + Turborepo. Al instalar, aprobar los build scripts de `workerd` y
  `esbuild` (`pnpm approve-builds` / `pnpm.onlyBuiltDependencies`), o el toolchain de
  D1/Workers no arranca.

## Reglas que NO se negocian

1. **Nunca confiar en el `clinic_id` del cliente.** Se obtiene del `TenantContext`
   construido por el resolver (ver `docs/02`).
2. **Cero `env.DB` fuera de la capa de datos** (`packages/core/src/db/**`). Todo el
   SQL de tenant pasa por `TenantDb`/repos, que siempre inyectan el scope.
3. **Cada tabla de tenant** lleva `clinic_id NOT NULL`, `UNIQUE (id, clinic_id)` e
   índice liderado por `clinic_id`; y FKs compuestas cuando referencia otra entidad de tenant.
4. **La IA nunca accede a D1**: solo tools que llaman a los **services** (los mismos
   que usa la UI), con el contexto capturado por closure.
5. **El agente no supera a su usuario**: las tools se filtran por `can(ctx, cap)`.
6. **Aislamiento y autorización son cosas distintas** y se aplican las dos.

## Comandos

```bash
pnpm install
pnpm dev                         # levanta las apps
pnpm -r typecheck
pnpm --filter @dental/api test   # Vitest + @cloudflare/vitest-plugin
pnpm build
pnpm --filter @dental/api run deploy   # "run": pnpm deploy a secas es otro comando
```

El despliegue completo (D1, secrets, URLs) está en el [`README`](../README.md).

## Testing

- Toda tabla de tenant entra en la **matriz cross-tenant** (SELECT/INSERT/UPDATE/DELETE).
- Toda tool de IA se testea intentando operar sobre otra clínica.
- Un test de regresión falla si aparece `env.DB` fuera de la capa de datos.
- Ver [`docs/06-testing.md`](docs/06-testing.md).

## Convenciones

- Voseo, español rioplatense en docs y comentarios de producto.
- Sin comentarios en el código salvo que aporten algo no obvio.
- Migraciones `.sql` planas; SQLite no soporta `ALTER COLUMN` (recrear tabla + índices).
- No subir binarios pesados al repo: imágenes/videos van a R2.
- Cada decisión de arquitectura nueva se registra como ADR en `docs/08`.

## Referencias

- Dominio dental: **OpenDental** y **OpenDentist** (clawnify/OpenDentist, MIT) — solo
  referencia de modelo y UI, no se forkearon (ver ADR-0006 en `docs/08`).
