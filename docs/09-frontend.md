# 09 — Frontend

Dos superficies con requisitos opuestos → dos apps, un monorepo.

**Regla de oro: 1 app = 1 superficie = 1 audiencia.** No se fusionan aunque compartan
tokens. Antes de tocar código, ubicá la superficie en el mapa de abajo.

> La antigua landing de venta del SaaS (`apps/site`, marca "Evolución Dental") se
> eliminó del repo en la primera etapa. El alta de cuentas vive ahora en
> `apps/admin` (`/login`), que era el objetivo del signup del marketing.

## 0. Mapa de superficies

| App | Superficie | Quién la ve | Dominio | Tech |
|---|---|---|---|---|
| `apps/landing` | Web pública de cada consultorio | el paciente (anónimo) | `{slug}.…` + dominio propio | **Astro**, por ahora estático |
| `apps/admin` | Panel de cada consultorio | odontólogo / recepción | `app.…` (assets del Worker `api`) | **React SPA** (Vite + React Router) |

| | `apps/landing` | `apps/admin` |
|---|---|---|
| Objetivo | Convertir + posicionar (SEO) | Operar rápido |
| JS en cliente | Cero por defecto; islas puntuales | App stateful |
| Datos | vía `apps/api` (contenido público) | vía `/api` (mismo origen) |
| Estética | Marketing premium por clínica | Densidad de herramienta |

Comparten **tokens** (`packages/theme`) y **contratos** (`packages/contracts`), no
componentes.

### 0.1 ¿Qué app toco para…?

| Quiero… | App |
|---|---|
| Cambiar los tratamientos, el equipo o el hero de una clínica | `apps/landing` |
| Agregar/editar una pantalla de agenda, pacientes o ficha | `apps/admin` |
| Cambiar un endpoint, una regla de negocio o una tool de IA | `apps/api` |
| Cambiar un color/token transversal | `packages/theme` |
| Cambiar un tipo compartido de la API | `packages/contracts` |

### 0.2 Nombres que se confunden

- **`landing`** = la web **de cada clínica**. Hay una por consultorio.
- **`admin`** = el panel **del consultorio**, no un admin de la plataforma (no existe).

Referirse siempre por ruta completa (`apps/landing/src/components/…`). Ver
`apps/README.md` para el mapa de dev/puertos.

## 1. Stack

- React 19, TypeScript strict.
- Tailwind CSS v4 (`@theme` tokens).
- Framer Motion **solo dentro de las islas** de la landing.
- `apps/admin`: React Router + **TanStack Query** (server state) + **Zustand** (UI state).
- `react-odontogram` (MIT, ver ADR-0007) para el odontograma FDI + `lucide-react`.
- Imágenes: R2 + Cloudflare Images/transform.

## 2. Landing de la clínica (`apps/landing`)

### 2.1 Responsabilidad

- Resolver qué consultorio mostrar. **Hoy:** `PUBLIC_CLINIC_SLUG` por env; el
  hostname→clínica (service binding + SSR en Workers) es el paso de deploy (H4).
- Componer las secciones con el contenido público de la clínica
  (`GET /api/public/clinic/:slug`) y, si la API no responde, caer al fixture local.
- Islas React para: **chat de la secretaría**, formulario de reserva, galería.

### 2.2 Motor de themes

```ts
themeSchema = {
  colors: { bg, surface, text, muted, accent, accentFg, border },
  typography: { display, body, scale },
  radius: 'none' | 'sm' | 'md' | 'lg' | 'pill',
  heroStyle: 'split' | 'full-bleed' | 'image-right',
  sections: Array<{ type, variant, enabled, content }>,
  logoUrl, heroImageUrl, imageryStyle,
}
```

- Los tokens se emiten como **CSS custom properties** en `:root` del HTML del tenant.
- **Personalización acotada**: el cliente elige de **presets curados** (3–5 paletas,
  pares tipográficos, estilos de hero) y ordena/activa secciones. No hex libres: es
  lo que evita que cientos de webs salgan feas o todas iguales.

### 2.3 Registro de secciones

`section.type → componente Astro + variantes`:

| Sección | Variantes |
|---|---|
| Hero | split · full-bleed · image-right |
| Tratamientos | cards · lista editorial |
| Profesionales | grid · carrusel |
| Secretaría IA | integrada · full-width |
| Consultorio (galería) | masonry · carrusel |
| Opiniones | grid · marquee |
| Cobertura (obras sociales) | chips · grid con logos |
| Ubicación | mapa + datos |
| FAQ | acordeón |
| CTA final | full-width |

### 2.4 Dirección de arte (F0)

Antes de construir componentes se define la dirección (ver
[07 — Roadmap](07-roadmap.md)):

- **Concepto:** *"landing de clínica odontológica premium para adultos que googlean
  desde el celular en CABA; lenguaje cálido, profesional y humano."*
- **Diales:** VARIANZA 5 · MOVIMIENTO 3 · DENSIDAD 3.
- **Anti-cliché:** nada de blanco+azul clínico con sonrisas de stock. Neutros
  cálidos + **un** acento profundo; fotografía **real del consultorio del cliente**;
  tipografía editorial; H1 de 2 líneas; hero que entra en la primera pantalla.
- Se prototipan 2–3 direcciones como HTML suelto, se elige una, y recién ahí se
  implementan los presets y las secciones.

### 2.5 Secretaría IA en la landing

- Sección dedicada (no una burbuja escondida) + affordance persistente que **no tapa
  el formulario**.
- Chat con streaming, turnos como **chips tocables**, card de confirmación, prompts
  sugeridos y fallback a WhatsApp.
- Consume `POST /api/secretaria/chat?clinic=<slug>`. Turnstile + rate limit son
  pendientes de deploy (todavía no implementados).

### 2.6 Performance y SEO

- HTML de servidor, islas diferidas; JS de la página mínimo.
- Imágenes con `srcset`/AVIF, `aspect-ratio` (sin CLS), LCP del hero precargado.
  Configurar `imageService: "compile"` en el adaptador de Cloudflare (si no,
  transforma cada imagen en runtime, facturado e invisible).
- Por tenant: metadata, OpenGraph, **JSON-LD `Dentist`**, sitemap, canonical desde
  hostname. i18n preparado (es-AR primero).

## 3. Dashboard del consultorio (`apps/admin`)

- **"Hoy"** como pantalla de entrada: próximos turnos, cancelaciones, consultas
  nuevas de la IA, disponibilidad, acciones pendientes del asistente, y **recalls /
  lista de espera** ("3 cancelaciones y 2 en espera para limpieza").
- **Agenda** día/semana por profesional **y por box** (columnas = `operatories`,
  slots de 15 min, indicador "ahora"); los bloqueos (`break`/`lunch`/`block`) se
  dibujan junto a los turnos. Patrón tomado de la referencia (ADR-0006).
- **Ficha del paciente** con pestañas: Resumen · **Odontograma** (`react-odontogram`
  sobre `tooth_conditions`) · **Plan de tratamiento** (`treatment_plan_items`) ·
  **Evolución** (`clinical_notes`) · Turnos.
- Pacientes, Profesionales, Tratamientos, Secretaría IA, Landing (editor), Configuración.
- Estado: TanStack Query para datos del servidor, Zustand para UI.
- Misma familia de tokens que la landing, **densidad de herramienta**.
- La ficha clínica (odontograma/plan/evolución) es de la persona: nunca desde la IA.

## 4. Editor de landing

- Elegir preset de paleta/tipografía/hero; editar contenido; reordenar y activar/
  desactivar secciones; subir logo y fotos.
- Guarda en `clinic_settings` (`theme_json` / `content_json`).
- **Preview** en iframe contra el dominio real del tenant.

## 5. Código compartido

| Paquete | Contenido | Consumido por |
|---|---|---|
| `packages/contracts` | zod + tipos de la API | api, landing, admin |
| `packages/theme` | `themeSchema` + presets + tokens | landing, admin |
| `packages/core` | `TenantContext`, `TenantDb`, repos, services | api (y tests) |
| `packages/config` | tsconfig / eslint base | todo |

No hay `packages/ui` en el MVP: las dos superficies tienen estéticas distintas.
Se evalúa extraer primitivas recién si aparece duplicación real.

## 6. Testing de frontend

- Unit: merge de theme, resolución de secciones, contratos zod.
- E2E (Playwright): login, agenda, reserva desde la landing, chat.
- Auditoría responsive con Chrome headless a 360/390/768/1024/1440.
- Ver [06 — Testing](06-testing.md).

## 7. Decisiones abiertas

- ~~Runtime del frontend~~ → **resuelta** (Astro + React SPA). Ver ADR-0001.
- Detalle de notificaciones y su UI: ver [08 — Decisiones](08-decisiones-abiertas.md).
