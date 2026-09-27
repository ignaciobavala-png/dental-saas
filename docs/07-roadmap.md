# 07 — Roadmap

Implementación por hitos. Cada hito cierra con sus tests en verde
(ver [06 — Testing](06-testing.md)). El ciclo del MVP no se da por terminado hasta
que H7 esté cerrado. El agente interno (H8) es fase 2 fast-follow.

## 1. Hitos

| Hito | Objetivo | Entregables | Verificación |
|---|---|---|---|
| **H0 — Fundaciones** | Base técnica lista | Monorepo (pnpm + turbo), `packages/config`, `packages/contracts`, Workers `api` y `landing`, D1, TS strict, ESLint (regla que prohíbe `env.DB` fuera de `packages/core/src/db/**`), Vitest con `@cloudflare/vitest-plugin`, CI | `lint` + `typecheck` + test trivial en verde |
| **F0 — Dirección de arte** | Definir la estética antes de construir | 2–3 prototipos HTML de hero/secciones, elección de una dirección, tokens y presets curados (`packages/theme`) | Dirección elegida documentada; tokens aplicados en un prototipo |
| **H1 — Esquema + capa de datos** | Aislamiento a nivel de datos | Migraciones plataforma+tenant (incluido el núcleo clínico), `TENANT_TABLES`, `TenantDb` auto-scope, repositorios, seed demo | Matriz cross-tenant CRUD en verde; tests de esquema (FK compuesta, NOT NULL) |
| **H2 — Auth + tenancy** | Identidad y contexto confiable | Sesiones, `memberships`, `createTenantContext`, middlewares (auth/membership), roles y matriz de capacidades | Tests de contexto: sin membership no hay contexto; selector de clínica validado |
| **H3 — Núcleo clínico** | Datos, agenda y ficha | `patients`, `doctors`, `services`, `operatories`, `availability`, `appointments` (+`kind`/`operatory`), motor de slots, booking con índice único; `treatment_plan_items`, `tooth_conditions`, `clinical_notes`, `recalls`, `waiting_list` | Tests de disponibilidad y anti doble-reserva (carrera); FK compuesta de las tablas clínicas |
| **F1 — Shell del admin** | App autenticada | React SPA, routing, layout, login, TanStack Query + Zustand, pantalla "Hoy" (datos reales) | E2E de login y "Hoy"; responsive 360–1440 |
| **H4 — Landing multi-tenant** | Web pública | Astro SSR, resolución hostname→clínica, theme engine + presets, registro de secciones, SEO/JSON-LD, imágenes (R2), CTA WhatsApp | Resolución por dominio; no-leak entre landings; HTML de servidor |
| **H5 — Secretaría IA** | Secretaria 24/7 | Chat streaming DeepSeek, `buildPublicTools(ctx)`, persistencia `conversations`/`messages`, reserva real desde el chat, Turnstile | Tests de tools cross-tenant; guard de `clinic_id` en args; E2E del ciclo |
| **F2 — Editor de landing** | Autogestión | Editor de contenido/tema/secciones + upload de imágenes, preview por iframe | Guardado en `clinic_settings`; preview refleja cambios |
| **F3 — Dashboard completo** | Operación del consultorio | Agenda (día/semana por profesional y box), fichas de paciente (odontograma, plan de tratamiento, evolución), Profesionales, Tratamientos, Configuración | E2E de agenda, ficha y CRUD por rol |
| **H7 — Hardening** | Producción | Rate limit, audit log, subdominios y dominios propios, headers/CSRF, checklist de deploy, E2E | Revisión de seguridad; suite E2E completa |
| **H8 — Asistente interno** | IA que opera el dashboard | `buildTools(ctx)` con capacidades, tools de agenda/pacientes, confirmación + auditoría | Tests de tools por capacidad, confirmación y `audit_log` |

## 2. Dependencias

```
H0 ─┬─▶ F0 ──────────────▶ H4 ─▶ H5 ─▶ F2
    │        (arte)         ▲
    └─▶ H1 ─▶ H2 ─▶ H3 ────┘        F1 ─▶ F3
                                    (F1 necesita H2)
                                              H7 ─▶ H8
                                     (H7 cierra el MVP; H8 reusa H5)
```

- `F0` puede correr en paralelo a `H1–H3`.
- `F1` necesita `H2` (auth); `F3` necesita `H3` y `F2`.
- `H8` reutiliza el motor de `H5` y las capacidades de `H2`.

## 3. Hito de demo (cierre del MVP)

```
Visitante → Landing → Secretaría IA → Consulta → Disponibilidad
          → Reserva → D1 → Dashboard del odontólogo
```

Debe funcionar de punta a punta, en la clínica correcta, **sin ninguna fuga
cross-tenant**.

## 4. Post-MVP (fase 2+)

- **H8** — asistente interno (agente de IA que opera el dashboard).
- Gestión completa de ingresos/gastos y reportes.
- Obras sociales/prepagas con validación de cobertura.
- Recordatorios automáticos y campañas.
- Reseñas externas integradas.
- Multi-idioma completo.
- Automatización de la suscripción (cobro recurrente).
- Conexión self-serve de dominios propios.
- Imágenes/radiografías, trabajos de laboratorio, facturación y coberturas (obras sociales).
