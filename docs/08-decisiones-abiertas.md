# 08 — Decisiones y registro (ADR)

## 1. Decisiones tomadas

| # | Decisión | Estado |
|---|---|---|
| D1 | **Una sola D1 compartida** por todos los consultorios, con multi-tenancy estricta. No database-per-tenant en el MVP. | ✅ |
| D2 | Aislamiento entre clínicas como **propiedad estructural** (tipos branded + `TenantDb` + FK compuestas + lint + tests). | ✅ |
| D3 | **DeepSeek nunca accede a D1**; todo pasa por tools controladas con `TenantContext` por closure. | ✅ |
| D4 | Abstracción de persistencia (`TenantStore`) para permitir database-per-tenant a futuro, **sin implementarlo ahora**. | ✅ |
| D5 | Backend en **Cloudflare Workers**; persistencia en **Cloudflare D1**; **TypeScript strict**; IA con **DeepSeek**. | ✅ |
| D6 | Open Dental **y** OpenDentist (clawnify, MIT) se usan solo como **referencia de modelo de dominio** (no se reutiliza código). | ✅ |
| D7 | **Frontend = Opción A:** monorepo con `apps/landing` (**Astro SSR**) y `apps/admin` (**React SPA**), sobre `apps/api`. | ✅ |
| D8 | **`apps/landing` no bindea D1:** pide datos a `apps/api` por **service binding**. Un solo escritor de D1. | ✅ |
| D9 | **`apps/admin` se sirve como static assets del Worker de API** (`app.nuestrosaas.com`), mismo origen que `/api`. | ✅ |
| D10 | **Dos agentes de IA, un motor:** secretaría pública en el MVP; **asistente interno en fase 2 (H8)**, con confirmación humana + auditoría. | ✅ |
| D11 | **Monorepo** con pnpm workspaces + Turborepo. | ✅ |

## 2. Decisiones abiertas

| # | Pregunta | Recomendación | Alternativas |
|---|---|---|---|
| A2 | **Autenticación** del dashboard | **Better Auth sobre D1** | Sesión propia (Hono + cookie firmada + D1); proveedor externo |
| A3 | **Cobro de la suscripción (US$57/mes)** | Ver **A11** (modelo de cobro); ya hay API de MercadoPago hecha | Manual en el MVP; Stripe |
| A4 | **Notificaciones de turno** | **`send_email` de Cloudflare** (+ Email Routing) | Resend; sin notificación en el MVP |
| A5 | **Imágenes de landing** | **R2** + Cloudflare Images/transform | Solo R2; otro storage |
| A6 | **Hacer F0 (dirección de arte) antes de H4** | **Sí** | Construir directo con un preset provisorio |
| A7 | **Dominio base** del SaaS y subdominio del admin | Definir (`nuestrosaas.com`, `app.…`) | Otro dominio |
| A8 | **i18n** | Solo **es-AR** en el MVP, con diccionario y claves preparadas | Multi-idioma desde el inicio |
| A9 | **WhatsApp** | **Deep link** (`wa.me`) en el MVP | API de WhatsApp Business |
| A10 | **Recuperación de contraseña / emails de auth** | Depende de A2 (Better Auth) | — |
| A11 | **Modelo de cobro (MercadoPago)** | **Suscripción recurrente** (`preapproval`), con webhook idempotente y baja | Pago único + renovación manual |
| A12 | **Momento de activación del consultorio** | **Trial al registrarse**; `clinics.status` → `active` con el pago **confirmado por webhook** | Pago antes de crear el consultorio |
| A13 | **Dónde vive el registro/checkout** | **Sitio de marketing** (`apps/site`) como isla que llama a `apps/api` | Derivar a `app.nuestrosaas.com/empezar` |
| A14 | **Conexión de dominio propio** | **Asistida por nosotros** en el MVP (Cloudflare for SaaS) | Self-serve desde el panel (post-MVP) |

## 3. Registro de decisiones (ADR)

### ADR-0001 — Frontend en dos apps (Opción A)

- **Fecha:** 2026-09-27
- **Estado:** aceptada
- **Contexto:** la landing necesita SEO y mínimo JS; el dashboard es una app
  stateful. Un solo framework obliga a un compromiso malo en alguno de los dos.
- **Decisión:** monorepo con `apps/landing` (Astro SSR) y `apps/admin` (React SPA),
  compartiendo tokens y contratos pero no componentes.
- **Consecuencias:** cada superficie usa la herramienta correcta y la landing queda
  liviana de verdad. Se resigna un build único; se asume como costo de dev.

### ADR-0002 — La landing no accede a D1 (service binding)

- **Fecha:** 2026-09-27
- **Estado:** aceptada
- **Contexto:** la landing renderiza en el servidor y necesita datos del tenant.
- **Decisión:** `apps/landing` llama a `apps/api` por service binding; no bindea D1.
  Todas las mutaciones viven en `apps/api`.
- **Consecuencias:** un único escritor de D1 y una sola capa de datos. Se agrega un
  hop (local a Cloudflare) en el SSR.

### ADR-0003 — Dos agentes de IA sobre un motor

- **Fecha:** 2026-09-27
- **Estado:** aceptada
- **Contexto:** la IA debe poder operar el dashboard, no solo responder.
- **Decisión:** un motor de tools/capacidades con dos superficies: secretaría pública
  (MVP) y asistente interno (fase 2). El agente hereda el `TenantContext` del usuario
  y solo ve tools permitidas por `can()`. Escrituras consecuentes requieren
  confirmación humana; todo se audita.
- **Consecuencias:** el asistente interno reusa casi todo el motor; se agrega lógica de
  confirmación, idempotencia y auditoría. La IA nunca es superusuario.

### ADR-0004 — Admin servido por el Worker de API

- **Fecha:** 2026-09-27
- **Estado:** aceptada
- **Contexto:** la SPA de admin y la API necesitan compartir sesión sin CORS.
- **Decisión:** el Worker `apps/api` sirve los static assets de `apps/admin` en
  `app.nuestrosaas.com`, mismo origen que `/api`.
- **Consecuencias:** sesión same-origin simple (cookie httpOnly). El Worker de API
  gana la responsabilidad de servir assets.

### ADR-0005 — Monorepo con pnpm + Turborepo

- **Fecha:** 2026-09-27
- **Estado:** aceptada
- **Contexto:** tres apps y paquetes compartidos.
- **Decisión:** pnpm workspaces + Turborepo para orquestar builds.
- **Consecuencias:** cache y tareas consistentes; una sola instalación.

<!-- Agregar ADRs nuevos debajo de esta línea. -->

### ADR-0006 — OpenDentist como referencia de dominio, no base de código

- **Fecha:** 2026-09-27
- **Estado:** aceptada
- **Contexto:** `clawnify/OpenDentist` es un template MIT de gestión odontológica con
  nuestro stack (Hono + D1 + React 19 + Vite + Tailwind v4), pero **single-tenant, sin
  auth** y con SQL crudo sin scoping; además depende de `@clawnify/db`/`@clawnify/app`
  (paquetes de su plataforma, sin licencia declarada en npm).
- **Decisión:** se toma como **referencia de dominio y de UI** (entidades clínicas,
  patrón de agenda multi-box, odontograma, reportes). **No se forkeará ni se copiará**
  su capa de datos. Nuestro esquema es una adaptación multi-tenant (centavos enteros,
  ids TEXT, epoch ms, FK compuestas).
- **Consecuencias:** se incorporan al modelo `operatories`, `treatment_plan_items`,
  `tooth_conditions`, `clinical_notes`, `recalls`, `waiting_list` y `kind` en turnos.
  Cero dependencia de los paquetes Clawnify.

### ADR-0007 — `react-odontogram` (MIT) para el odontograma

- **Fecha:** 2026-09-27
- **Estado:** aceptada
- **Contexto:** el odontograma interactivo (numeración FDI) es costoso de construir y
  `react-odontogram` (MIT, React ≥17) ya lo resuelve.
- **Decisión:** adoptarla como dependencia en `apps/admin`, alimentada por nuestra
  tabla `tooth_conditions`.
- **Consecuencias:** se terceriza un componente no-diferencial; hay que pinear la
  versión e importar su `style.css`. No introduce dependencias del proveedor Clawnify.

### ADR-0008 — pnpm con aprobación explícita de build scripts

- **Fecha:** 2026-09-27
- **Estado:** aceptada
- **Contexto:** pnpm bloquea por defecto los scripts de instalación de dependencias.
- **Decisión:** usar pnpm (ver ADR-0005) y aprobar explícitamente `workerd` y `esbuild`
  (`pnpm.onlyBuiltDependencies` / `pnpm approve-builds`).
- **Consecuencias:** el toolchain de D1/Workers no arranca hasta aprobar esos builds;
  queda documentado para que la instalación sea reproducible.

### ADR-0009 — Tercera superficie: sitio de marketing del producto

- **Fecha:** 2026-09-27
- **Estado:** aceptada
- **Contexto:** la venta del software (a odontólogos) es una superficie distinta de la
  landing pública por consultorio (a pacientes). La competencia (Dentalink) resuelve
  esa venta desde un sitio de marketing propio.
- **Decisión:** agregar `apps/site` (Astro, estático, single-tenant) para el marketing
  del producto, con la identidad visual Cal.com (`DESIGN.md` en la raíz) y un esqueleto
  de secciones inspirado en la competencia pero con criterio propio (menos bandas,
  chrome real del producto, la IA como cuña, precio transparente).
- **Consecuencias:** una superficie más en el monorepo. `apps/landing` sigue siendo la
  landing por tenant. El registro/checkout del sitio se resuelve contra `apps/api`
  (ver A11–A13).

<!-- Agregar ADRs nuevos debajo de esta línea. -->
