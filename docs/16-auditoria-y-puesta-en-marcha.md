# Auditoría y puesta en marcha

Revisión: 2026-09-30.

## Cómo probar hoy en local

- Panel y API: `http://127.0.0.1:8787/login`.
- Landing del consultorio creado en la prueba local:
  `http://127.0.0.1:4323/c/consultorio-de-revision-1790802628`.
- El primer usuario entra desde `/login`, elige "Crear cuenta", carga nombre,
  email, contraseña propia y nombre del consultorio. Esa cuenta queda como
  `owner` del consultorio, con 30 días de prueba.

Para un vendedor, el flujo del piloto es simple: le pasa al doctor el link del panel.
El doctor crea su propia contraseña; el vendedor no necesita inventarla ni conocerla. Si más adelante se quiere que el vendedor cree cuentas por
el doctor, falta una pantalla de invitaciones o un alta asistida con cambio de
contraseña obligatorio.

## Estado funcional

| Área | Estado | Notas |
|---|---|---|
| Landing pública del consultorio | Lista para piloto | Ya no vende el SaaS: habla desde el consultorio al paciente. Renderiza por slug `/c/:slug` y toma datos reales del panel. |
| Secretaría virtual pública | Lista para piloto controlado | Sabe la fecha y hora actual, consulta servicios/profesionales/disponibilidad y puede registrar turnos pendientes con contacto obligatorio. |
| Panel de control | Listo para piloto controlado | Login, alta con email y contraseña, agenda, pacientes, servicios, profesionales, configuración de landing y copiloto interno. |
| Acceso piloto | Listo | Alta abierta con email y contraseña, prueba de 30 días y bloqueo al expirar. Falta verificación de email. |
| Master de plataforma | Listo para piloto | `/plataforma`: lista de consultorios, registrar pago (30 días), extender prueba, suspender. Cobro manual. |
| Multi-tenant | Reforzado | El panel exige membresía activa y la landing no cae a datos demo si el slug no existe. |
| Doble reserva | Reforzado | Hay validación de disponibilidad en servicio y trigger SQLite para evitar solapamientos concurrentes. |
| Producción Cloudflare | Preparada, no publicada | Falta crear D1 real, aplicar migraciones, cargar secretos y hacer deploy. |

## Qué se validó manualmente

- Alta de un consultorio con rol `owner`.
- Login/logout y normalización de email.
- Carga y lectura de configuración pública.
- Landing SSR leyendo el consultorio por slug, sin cache global entre clínicas.
- Bloqueo al intentar leer otra clínica desde el panel.
- Reserva pública creada por la IA con fecha actual correcta.
- Turno pendiente visible para la agenda y el copiloto interno.
- Rechazo de turno superpuesto.
- Rechazo de turno en el pasado.
- Cambio de texto público visible sin recompilar la landing.

## Qué falta antes de venderlo con tranquilidad

- Recuperación de contraseña.
- Invitaciones de equipo y roles desde UI.
- Cambio de contraseña desde el panel.
- Confirmación real al paciente por WhatsApp/email/SMS; hoy el turno público queda
  pendiente y lo revisa el consultorio.
- Carga de logo/fotos por consultorio en storage externo.
- Dominios personalizados por consultorio.
- Backups, alertas y monitoreo de errores/costos de IA.
- Política de privacidad, términos y texto legal sobre datos de pacientes.
- Auditoría con al menos dos consultorios reales para ajustar lenguaje, horarios,
  servicios y flujo de recepción.

## Cloudflare

No hay que crear el repo remoto: ya existe `github.com/ignaciobavala-png/dental-saas`.

Sí falta publicar en Cloudflare. El plan preparado es:

1. Crear una D1 llamada `dental-saas`.
2. Reemplazar el `database_id` placeholder en `apps/api/wrangler.jsonc`.
3. Aplicar migraciones D1 desde `packages/core/src/db/migrations`.
4. Cargar secretos del Worker API: `DEEPSEEK_API_KEY` y `SESSION_SECRET`.
5. Configurar variables: `TRIAL_DAYS` (opcional, default 30), `PUBLIC_LANDING_URL` y
   `ALLOWED_ORIGIN` en `dental-api`; `PANEL_URL` en `dental-landing` (la raíz de la
   landing redirige a `PANEL_URL/login`).
5b. Crear el master: `pnpm --filter @dental/api admin:create --email … --name … --remote`.
6. Deployar `dental-api`, que sirve API y panel React.
7. Build y deploy de `dental-landing`, con service binding a `dental-api`.

No publiqué ni subí cambios porque la instrucción del proyecto exige pedir permiso
antes de enviar contenido a servicios externos. La rama queda lista localmente para
que Ignacio apruebe push y deploy.
