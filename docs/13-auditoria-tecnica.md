# 13 — Auditoría técnica y plan de automejoramiento

Fecha: 2026-09-30. Alcance: todo el monorepo (`apps/api`, `apps/admin`,
`apps/landing`, `packages/core`, `packages/contracts`) después de cerrar el
back-end clínico, cablear el panel a la API real y completar la landing.

Este documento es un diagnóstico, no un changelog. Lo que ya se corrigió en la
misma sesión aparece marcado con ✅.

---

## 1. Estado general

| Área | Estado |
|---|---|
| API (Hono + D1) | Sólida y testeada (35 tests). Rutas de tenant con `can()` salvo excepciones ya cerradas. |
| Dominio | Un solo `domain/services.ts` con toda la lógica; las rutas y las tools de IA lo comparten. |
| IA | Copiloto con hasta 24 herramientas según el rol, filtradas por capability, con auditoría e idempotencia básica. |
| Admin | Cableado a la API real (se eliminaron los mocks). Sin tests. |
| Landing | Estructura completa de consultorio, consume `GET /api/public/clinic/:slug` con fallback. |
| Migraciones | `0001`–`0003`, aplicadas en tests; `migrations_dir` apunta al paquete core. |
| Calidad | `typecheck` en verde (6/6), `build` (3/3), 35 tests en verde. |

**Lo que más falta no es código, es red de seguridad:** no hay lint, no hay CI, y
el panel no muestra errores de red al usuario.

---

## 2. Hallazgos por severidad

### Críticos

**C1. El panel no avisa cuando una escritura falla.**
Todas las mutaciones (`useCreatePatient`, `useCreateAppointment`, etc. en
`apps/admin/src/lib/queries.ts`) se llaman con `onSuccess` pero **sin `onError`**.
Si la API responde 400/403/409, `mutate` traga el error, el modal no se cierra y
el usuario no ve nada. Es el mismo patrón de "el botón no hace nada".
*Fix:* un `onError` global (toast) o un `onError` por mutación que muestre el
`ApiError.message`. `api.ts` ya tiene la clase `ApiError` con el mensaje del
servidor.

**C2. Sin rate limit ni Turnstile en el chat público.**
`POST /api/secretaria/chat` es anónimo y dispara una llamada facturada al LLM por
request. Un script puede quemar la cuota de DeepSeek y la de D1.
*Fix:* rate limit por IP (ej. 20 mensajes/hora) y Turnstile antes del `streamText`.

### Altos

**A1. Sin persistencia de conversaciones ni auditoría del chat.**
`docs/05-agentes-ia.md §7` lo especifica, pero no existen las tablas
`conversations`/`messages`. No se puede reconstruir qué dijo el visitante ni qué
respondió la IA en la cara pública. (La auditoría de *acciones* del copiloto interno
sí quedó: `audit_log`.)

**A2. Idempotencia del copiloto sólo cubre reintentos del SDK.**
`idempotencyService.once` usa `toolCallId`. Si el usuario reintenta desde el chat
(otro `toolCallId`), se puede duplicar el turno. Falta una clave de idempotencia
generada en el cliente por operación lógica. La tabla `idempotency_keys` además
**crece sin límite** (no hay purga por antigüedad).

**A3. `GET /api/appointments` devuelve TODO sin filtro de fecha.**
`apps/api/src/routes/appointments.ts:26`. El admin lo descarga entero y filtra en
el cliente (`queries.ts`). Con años de agenda eso es megabytes por render.
*Fix:* `?from=&to=` obligatorio o con default (hoy ± 30 días) y `LIMIT`.

**A4. La ficha clínica es pública para cualquier rol con `clinical:read`.**
`receptionist` y `dentist` tienen `clinical:read`; el odontograma y las notas
quedan visibles para recepción. Puede ser intencional, pero conviene decidirlo
explícitamente y no por herencia de la matriz.

### Medios

**M1. Sin transacción en operaciones multi-fila.**
`bookingService.create` (paciente + turno), `catalogService.createDoctor`
(médico + N servicios) y `toothConditionService.record` (borrar + insertar) hacen
varias escrituras sin `d1.batch`. ✅ Se corrigió el caso más caro: si falla el
turno, se limpia el paciente creado (`services.ts`, `create`). Quedan los otros.

**M2. `availabilityService.slots` es N+1.**
`apps/api/src/domain/services.ts` corre `db.list('appointments')` **por doctor y
por día** dentro de un doble loop (hasta 21 días × profesionales). Con 3
profesionales son ~63 queries por consulta de disponibilidad.
*Fix:* una sola query del rango y resolver los solapamientos en memoria.

**M3. `db.update` tira excepción si la fila no existe.**
`TenantDb.update` hace `throw new Error('update … not found')`. Rutas que querían
devolver 404 (services PUT, patients PUT) terminan en 500.
*Fix:* capturar y responder 404, o que `update` devuelva `null`.

**M4. `ai_inquiries` sólo la ve owner/admin.**
La ruta usa `can(ctx, 'conversations:read')` y sólo owner/admin tienen esa
capability. Pero quien sigue las consultas es recepción. Decidir: ¿`conversations:read`
para `receptionist`, o una capability propia?

**M5. El modelo por defecto puede no existir.**
`DEFAULT_MODEL = 'deepseek-flash'` (`apps/api/src/ai/provider.ts`) no es un id
oficial de DeepSeek (`deepseek-chat` / `deepseek-reasoner`). Si el deploy no setea
`DEEPSEEK_MODEL`, el chat falla. Verificar contra la API o cambiar el default.

**M6. `database_id` de D1 es placeholder.**
`apps/api/wrangler.jsonc` tiene `00000000-...`. Antes de deployar hay que
reemplazarlo por el id real (el build no falla, el deploy sí o apunta a nada).

### Bajos

- **B1.** Sin ESLint ni CI. El perfil del dev pide flat config; el repo sólo tiene
  `typecheck`/`build`/`test` manuales.
- **B2.** `apps/admin` no tiene ni un test. `playwright-e2e-delivery` sería el
  vehículo natural.
- **B3.** Sin páginas legales en la landing (privacidad/términos), típicamente
  exigidas en un sitio de salud.
- **B4.** La galería/equipo usan `picsum.photos` de placeholder.
- **B5.** `apps/README.md` describe 2 apps; conviene un README raíz con el flujo de
  desarrollo (levantar api+admin+landing) y cómo cargar datos demo.
- **B6.** Los `console.warn` del fallback de la landing se pierden en build; está
  bien, pero conviene un aviso más visible en CI.

---

## 3. Quick wins (por esfuerzo/impacto)

1. **Toast de error global en el panel** (C1). ~30 líneas.
2. **Rate limit simple en memoria/D1 + Turnstile** en el chat público (C2).
3. **Default de modelo correcto** o error explícito si falta `DEEPSEEK_MODEL` (M5).
4. **Filtro de fecha en `GET /api/appointments`** (A3).
5. **`db.update` → 404** (M3).
6. **Purga de `idempotency_keys`** con un `created_at < now - 7d` en el cron.
7. **ESLint 9 flat + CI mínima** (B1): `pnpm typecheck && pnpm test && pnpm build`.

---

## 4. Roadmap sugerido

**Sprint 1 — robustez del panel y del chat**
C1 (errores visibles), C2 (rate limit + Turnstile), B1 (lint/CI). Es lo que evita
que un fallo pase desapercibido en el primer test con un consultorio real.

**Sprint 2 — datos y performance**
A3 (filtro de fecha), M2 (N+1 de disponibilidad), M1 (batch en multi-escritura).

**Sprint 3 — trazabilidad y confianza**
A1 (persistencia de conversaciones), A2 (idempotencia por clave de cliente),
confirmación estructurada de acciones consecuentes (botón "confirmar" en el dock,
hoy es sólo una instrucción al modelo).

**Sprint 4 — cobertura y contenido**
B2 (E2E de Playwright), B3 (legales), B4/B5 (assets reales y README raíz).

---

## 5. Lo que quedó bien y conviene no romper

- **Una sola fuente de verdad**: las tools de IA y las rutas HTTP llaman a los
  mismos `domain/services`. Es lo que evita que el panel y el agente diverjan.
- **El `TenantContext` por closure** y los `inputSchema` sin `clinic_id`: la IA no
  puede elegir el tenant (verificado con `z.strictObject` en los tests).
- **La landing cae al fixture** si no hay API, así que el build nunca se rompe.
- **La migración `0003`** dejó el modelo clínico completo y testeado.
