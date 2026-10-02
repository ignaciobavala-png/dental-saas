# 17 — Auditoría de preparación para producción

Revisión: 2026-10-02, sobre `main` (`494a94d`). Destino decidido: Cloudflare
(ADR-0012), sin fecha de deploy.

## Veredicto

**Listo para un piloto cerrado con 2–3 consultorios invitados. No listo para
abrir el alta al público ni para cobrar a escala.** La base técnica está bien:
aislamiento entre consultorios, reservas sin doble turno, sesiones y acceso por
pago. Lo que falta es sobre todo **lo que rodea al producto**: mails, recuperación
de cuenta, marco legal de los datos de salud y operación (CI, alertas,
dominios).

## Qué se verificó

| Área | Resultado | Cómo |
|---|---|---|
| Tests y tipos | 42 tests en verde, typecheck limpio en los 6 paquetes | `pnpm -r typecheck`, `vitest` |
| Aislamiento entre consultorios | **Sin fugas.** Un usuario de A pidiendo un paciente de B recibe 404, el selector `?clinic=B` da 403 y los `PUT` sobre filas de B no modifican nada | Test temporal HTTP con dos clínicas |
| SQL fuera de la capa de datos | Ninguno en rutas de tenant; todo pasa por `TenantDb` o repos de plataforma | grep de `env.DB` / `.prepare(` |
| Sesiones | Token aleatorio de 32 bytes, guardado hasheado (SHA-256), cookie `httpOnly` + `SameSite=Lax` + `Secure` en https, 30 días | `core/auth/session.ts` |
| Contraseñas | PBKDF2-SHA256, 100k iteraciones, sal por usuario, comparación en tiempo constante | `core/auth/password.ts` |
| CSRF | Chequeo de `Origin` en escrituras (salvo auth y secretaría pública) | `api/src/index.ts` |
| Rate limit | Login/alta 10/min por IP; IA 20/min por IP | bindings `AUTH_LIMIT`, `AI_LIMIT` |
| Secretos en git | Ninguno en el historial; `.dev.vars` y `.env` ignorados | `git log -p` |
| Dependencias | 10 avisos (2 altos), todos en `undici` dentro de `miniflare` (toolchain de dev, no llega al bundle de producción) | `pnpm audit --prod` |

## Bloqueantes para el piloto (antes del primer deploy)

1. **Datos de salud enviados a DeepSeek.** El copiloto interno lee pacientes, notas
   y agenda y se los manda al modelo; la secretaría pública manda lo que escribe el
   paciente. En Argentina los datos de salud son *datos sensibles* (Ley 25.326) y
   esto es una transferencia internacional. Hace falta: decidir proveedor (o
   anonimizar lo que sale), política de privacidad, consentimiento en la landing y
   un acuerdo con el consultorio. **Es la decisión más importante de esta lista y
   no es técnica.**
2. **Recuperación de contraseña.** Hoy un doctor que la olvida queda afuera y solo
   se resuelve tocando D1 a mano. Requiere un proveedor de mail.
3. **Configuración de deploy.** `database_id` en `apps/api/wrangler.jsonc` es un
   placeholder; `PANEL_URL` no está declarada en `apps/landing/wrangler.jsonc`;
   `SESSION_SECRET` figura en la doc pero el código no lo usa (sacarlo de la doc o
   darle uso).

## Antes de abrir el alta al público

4. **Verificación de email** en el alta (hoy cualquiera crea cuentas con mails
   ajenos).
5. **Turnstile** en el alta y en el chat de la secretaría. El límite actual es por
   IP; no hay tope diario por consultorio, así que un bot puede gastar tokens de
   DeepSeek sin límite de costo.
6. **El historial del chat lo manda el cliente**, incluidos mensajes con rol
   `assistant`. Se puede inyectar una "respuesta previa" falsa. Las tools siguen
   acotadas a la clínica, pero conviene guardar la conversación del lado del
   servidor (`conversations`/`messages`, ya previsto en H5).
7. **Reservas basura.** `create_appointment` público solo exige un teléfono o mail;
   un bot puede llenar la agenda de turnos pendientes. Se mitiga con Turnstile y un
   tope de pendientes por contacto o por día.
8. **Avisos de vencimiento.** La prueba y el período pago vencen sin aviso previo;
   el doctor se entera cuando ya está bloqueado.

## Operación

9. **Sin CI.** Nada corre tests ni typecheck en cada push. Un workflow de GitHub
   Actions con `pnpm -r typecheck` + `pnpm --filter @dental/api test` alcanza.
10. **Sin ESLint.** El roadmap (H0) prevé una regla que prohíbe `env.DB` fuera de
    `packages/core/src/db/**`; hoy se cumple por disciplina, no por herramienta.
11. **Alertas.** `observability` está activado en el Worker (logs), pero nadie se
    entera de un pico de errores o de gasto de IA. Configurar alertas de Workers y
    un tope de gasto en DeepSeek.
12. **Backups.** D1 tiene Time Travel (restauración a un punto en el tiempo; la
    ventana depende del plan). Alcanza para el piloto; documentar el procedimiento
    de restauración y probarlo una vez.
13. **Dominios.** Todo sale por `*.workers.dev`. Para producción: un dominio propio
    para el panel y otro (o subdominios) para las landings.
14. **Cabeceras de seguridad en el panel.** La API agrega `nosniff` y `no-store`,
    pero el HTML del panel no tiene CSP, `X-Frame-Options` ni HSTS.
15. **Sesiones vencidas** nunca se borran de la tabla `sessions` (crece sin
    límite). Un cron diario las limpia.

## Bugs menores encontrados

- `PUT /api/patients/:id` y `PUT /api/doctors/:id` sobre un id inexistente (o de otro
  consultorio) responden **500** en vez de 404. No modifican datos, pero ensucian los
  logs y el panel muestra un error genérico.
- No hay bloqueo por cuenta ante intentos de login: el límite es solo por IP.

## Producto (ya listado en docs/14 y docs/16)

Notificaciones al paciente (WhatsApp/email), invitaciones de equipo y roles desde
la UI, cambio de contraseña, subida de logo y fotos, edición de tema y orden de
secciones, términos y condiciones, y la validación con dos consultorios reales.

## Orden sugerido

1. Decidir el tratamiento de datos de salud y la IA (punto 1).
2. Elegir el proveedor de mail. Con eso salen recuperación de contraseña, la
   verificación de email y los avisos de vencimiento (2, 4, 8).
3. CI + corregir los 500 + configuración de wrangler (3, 9, bugs).
4. Deploy del piloto cerrado.
5. Turnstile, historial del chat del lado del servidor y topes de IA (5–7) antes de
   abrir el alta.
