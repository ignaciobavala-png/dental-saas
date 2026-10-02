# Preparación del producto y acceso piloto

Revisión de producto: 2026-09-30. Este documento separa el estado comprobable del
repositorio de los pendientes para ponerlo frente a consultorios reales.

## Acceso piloto

- El alta crea una clínica en estado `trial` y guarda `trial_expires_at`.
- La duración es de **30 días** por defecto. `TRIAL_DAYS` acepta cualquier entero
  entre 1 y 365; valores vacíos o inválidos vuelven a 30.
- El alta es abierta: nombre, email, contraseña y nombre del consultorio. No hay
  PIN (se reemplazó el 2026-10-02 por el alta estándar con email y contraseña).
  Lo único que la frena es el rate limit de `AUTH_LIMIT` (10 por minuto por IP).
- Pendiente antes de abrirla al público: **verificación de email** y Turnstile en
  el alta. Sin eso, cualquiera puede crear consultorios (y landings públicas con
  secretaría IA, que consume tokens) con emails ajenos.
- Al vencer una prueba en estado `trial`, se bloquean el panel, la landing pública
  y el chat/API públicos. La UI informa cómo continuar. La cuenta y sus datos no
  se borran. El master la reactiva registrando un pago desde `/plataforma`.

## Usuario master y ciclo de pago

Hay un único rol por encima de los consultorios: el **master** de la plataforma
(`users.is_platform_admin = 1`). No se crea desde la UI; se crea con un script:

```bash
pnpm --filter @dental/api admin:create --email vos@dominio.com --name "Nombre"            # D1 local
pnpm --filter @dental/api admin:create --email vos@dominio.com --name "Nombre" --remote   # producción
```

El master entra por el mismo `/login` y cae en `/plataforma`, que lista todos los
consultorios con su dueño, su estado y su vencimiento. Desde ahí puede:

- **Registrar pago**: pasa el consultorio a `active` y extiende `paid_until` 30 días
  desde el vencimiento vigente (o desde hoy si ya venció). Sirve también para
  reactivar uno suspendido.
- **+7 días de prueba**: extiende la prueba (o la reabre si estaba vencida).
- **Suspender**: bloquea panel, landing y secretaría hasta el próximo pago.

Ciclo: prueba de 30 días → al vencer queda bloqueado → el master registra el pago
(30 días) → al vencer `paid_until` sin un pago nuevo vuelve a quedar bloqueado. El
cobro en sí sigue siendo manual (no hay pasarela). Cada acción queda en `audit_log`
(`platform.*`).

La regla "¿este consultorio puede operar?" vive en un solo lugar:
`clinicAccess()` en `packages/core/src/billing/access.ts`. Panel, landing,
secretaría y `/me` la usan; no repetir la condición a mano.

La migración `0004_trial_expiration.sql` debe aplicarse junto con el resto de las
migraciones D1. Las altas existentes antes de la migración conservan su estado y
no reciben vencimiento retroactivo.

## Plantilla pública

La página base mantiene una estructura común para clínicas: presentación, servicios,
secretaría, equipo (cuando está cargado), cobertura, preguntas frecuentes, ubicación
y contacto. Retiramos fotografías de stock y afirmaciones de una clínica ficticia;
las secciones de equipo, opiniones, FAQ, cobertura y contacto se muestran según los
datos cargados. La ubicación usa la dirección real y un enlace a indicaciones, no un
mapa fijo de Caballito.

El contenido de la clínica debe cargarse antes de compartir su URL. El fixture local
de `apps/landing/src/data/clinic.ts` es solo para desarrollo sin slug; con un slug
configurado, un error de API ahora falla el render en vez de publicar la clínica demo.

## Estado de preparación para clientes

### Ya existe en el repositorio

- Auth de panel, cuentas/consultorios multi-tenant y aislamiento de datos por clínica.
- Gestión de pacientes, turnos, profesionales, servicios y notas clínicas conectada
  a la API (revisar las pantallas en una sesión real antes de ofrecerlas como listas).
- Secretaria pública conectada a herramientas del backend y flujo de consulta/reserva.
- Editor básico para datos del consultorio, horarios, coberturas, FAQ y opiniones.
- Plantilla responsive de landing con secciones condicionales y CTA a chat/WhatsApp.
- Alta con email y contraseña, prueba de 30 días y consola del master.

### Sigue siendo necesario antes de venderlo como producto terminado

1. **Onboarding publicable:** validar el flujo completo desde alta a landing publicada;
   faltan carga/edición de fotos y logo, edición de tema y orden de secciones. Hoy el
   editor no cubre todo lo que la landing puede mostrar.
2. **Operación clínica:** revisar el flujo de agenda con el consultorio piloto,
   configuración real de disponibilidad, confirmación/cancelación y avisos al
   paciente. Notificaciones de turnos todavía no están resueltas.
3. **Acceso y soporte:** recuperación de contraseña, proceso de conversión al terminar
   la prueba, suspensión/reactivación operativa y un canal de soporte definido.
4. **Producción:** configurar dominios y service bindings reales, secretos de IA,
   límites de uso/rate limiting, backups y alertas. El repositorio no prueba que el
   despliegue en Cloudflare esté configurado.
5. **Confianza clínica:** revisar textos del agente con odontólogos, explicar qué
   información usa, aclarar que no diagnostica ni reemplaza atención profesional, y
   definir privacidad/retención de conversaciones y datos de pacientes.
6. **Validación visual:** revisar la landing y el panel en móvil y desktop con datos
   reales de al menos dos consultorios de estilos distintos. Resolver inconsistencias
   visuales que aparezcan antes de fijar el preset estándar.

La automatización del cobro recurrente, el autoservicio de dominio y las funciones de
facturación/obras sociales siguen fuera del alcance inmediato documentado en el
roadmap; no deberían bloquear la prueba piloto, pero sí son decisiones comerciales
antes de escalar ventas.
