# Mapa de apps — dental-saas

Guía rápida para no confundir qué app es qué cara del producto.

## Regla de oro

**1 app = 1 superficie = 1 audiencia.** No se fusionan aunque compartan tokens: una
app cambia por su audiencia, no por conveniencia. La web pública de una clínica y el
panel de esa clínica son usuarios, dispositivos y tecnologías distintos → apps
distintas.

## Tabla maestra

| App | Paquete | Superficie | Quién la ve | Dominio | Tech | Dev |
|---|---|---|---|---|---|---|
| `apps/landing` | `@dental/landing` | Web pública de cada consultorio | el paciente (anónimo) | `{slug}.…` + dominio propio | Astro, por ahora estático | `pnpm --filter @dental/landing dev` (4321) |
| `apps/admin` | `@dental/admin` | Panel de cada consultorio | odontólogo / recepción | `app.…` (assets del Worker `api`) | React SPA (Vite + React Router) | `pnpm --filter @dental/admin dev` (5173, proxy `/api` → 8787) |
| `apps/api` | `@dental/api` | Backend (no es una cara visible) | — | `app.…/api` | Hono en Cloudflare Workers | `pnpm --filter @dental/api dev` (8787) |

## Aclaración de nombres

- **`landing`** = la web **de cada clínica**. Hay una por consultorio.
- **`admin`** = el panel **del consultorio**, no un admin de la plataforma (ese todavía no
  existe).

> La antigua landing de venta del SaaS (`apps/site`, marca "Evolución Dental") se
> eliminó del repo en la primera etapa. El alta de cuentas vive ahora en
> `apps/admin` (`/login`, pantalla combinada login/signup).

## Qué NO va dónde

- Datos de tenant, sesión o `TenantContext` **nunca** en `apps/landing`: hoy no tiene
  backend propio, resuelve el consultorio por `PUBLIC_CLINIC_SLUG` y lee el contenido
  público desde `apps/api`.
- Un cambio de la web de la clínica va en `apps/landing`; un cambio de una pantalla
  operativa va en `apps/admin`. No se copia código entre ambas.
