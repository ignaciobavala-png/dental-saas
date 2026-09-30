# Preparación del producto y acceso piloto

Revisión de producto: 2026-09-30. Este documento separa el estado comprobable del
repositorio de los pendientes para ponerlo frente a consultorios reales.

## Acceso piloto

- El alta crea una clínica en estado `trial` y guarda `trial_expires_at`.
- La duración es de 14 días por defecto. Se puede fijar `TRIAL_DAYS=7` para una
  semana; valores vacíos o inválidos vuelven a 14.
- `TRIAL_PIN` es obligatorio para crear consultorios. En el piloto local quedó
  configurado como `adminadmin`; en producción se carga como secreto del Worker
  (`wrangler secret put TRIAL_PIN`). El PIN nunca se envía al frontend ni se
  guarda en D1.
- Para probar localmente, declarar `TRIAL_PIN` y `TRIAL_DAYS` en
  `apps/api/.dev.vars` (archivo local, no versionar). Para producción, configurar
  el secreto `TRIAL_PIN` en Cloudflare y la variable `TRIAL_DAYS` en el entorno
  del Worker antes de distribuir el código.
- Al vencer una prueba en estado `trial`, se bloquean el panel, la landing pública
  y el chat/API públicos. La UI informa cómo continuar. La cuenta y sus datos no
  se borran. Un operador todavía tiene que convertir manualmente la clínica a
  `active` cuando acuerde continuar.
- Es un PIN compartido y reutilizable: sirve para un grupo pequeño de pilotos,
  no identifica quién invitó a cada consultorio ni limita la cantidad de altas.
  Si hace falta controlar cupos o revocar invitaciones individualmente, crear
  invitaciones de un solo uso antes de ampliar la prueba.

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
- PIN de invitación compartido y vencimiento de prueba configurable.

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
