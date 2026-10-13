# Dental SaaS — guía para el agente

SaaS multi-tenant para consultorios odontológicos sobre Cloudflare (Workers + D1) con IA de DeepSeek.

## Si te piden desplegarlo

Leé el [`README.md`](README.md) y seguí la sección **"Guía de despliegue (para el agente que lo ejecuta)"** en orden. Ahí están las variables, dónde va cada una y la verificación de cada paso. No inventes pasos. Pedile al usuario lo que falte (key de DeepSeek, login de Cloudflare, datos del admin) y esperá.

- Los secretos (`DEEPSEEK_API_KEY`) van solo como secret de Cloudflare o en `apps/api/.dev.vars` (ignorado). Nunca en un archivo versionado.
- Usá `pnpm … run deploy`; `pnpm deploy` a secas es otro comando de pnpm.
- Nada de commit ni push sin que el usuario lo pida.

## Si te piden modificar el código

Leé antes [`docs/18`](docs/18-convenciones-de-desarrollo.md) (reglas y convenciones), [`docs/01`](docs/01-arquitectura.md) y [`docs/02`](docs/02-multi-tenancy.md). Lo que no se negocia:

1. Nunca confiar en el `clinic_id` que manda el cliente: sale del `TenantContext`.
2. Cero `env.DB` ni SQL directo fuera de `packages/core/src/db/**`; todo pasa por `TenantDb`.
3. La IA nunca toca D1: solo tools que llaman a los mismos services que la UI, filtradas por `can(ctx, cap)`.
4. Toda tabla de tenant lleva `clinic_id NOT NULL` y entra en los tests cross-tenant.

Verificá siempre con `pnpm -r typecheck` y `pnpm --filter @dental/api test`.

## Mapa

`apps/api` (Hono, sirve API y panel) · `apps/admin` (panel React) · `apps/landing` (Astro) · `packages/core` (dominio y datos) · `packages/contracts` · `packages/theme`. Índice de la documentación: [`docs/README.md`](docs/README.md).
