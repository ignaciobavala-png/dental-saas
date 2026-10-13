# SaaS Dental — Documentación de diseño

SaaS multi-tenant para consultorios odontológicos de Argentina y Latinoamérica.
Cada clínica obtiene, en pocos minutos, una **landing premium personalizable**, una
**secretaria virtual con IA 24/7** y un **sistema de gestión de pacientes,
profesionales y turnos**.

Este directorio es la fuente de verdad del diseño. El repo arrancó vacío; todo lo
que está acá es greenfield.

## Índice

| Documento | Contenido |
|---|---|
| [00 — Visión y MVP](00-vision-y-mvp.md) | Producto, tres pilares, stack, alcance del MVP y ciclo principal |
| [01 — Arquitectura](01-arquitectura.md) | Monorepo, dos Workers, service binding, capas y flujos |
| [02 — Multi-tenancy](02-multi-tenancy.md) | Aislamiento estricto entre clínicas como propiedad estructural |
| [03 — Modelo de datos](03-modelo-de-datos.md) | Tablas, FKs compuestas, índices, constraints, concurrencia |
| [04 — Autorización](04-autorizacion.md) | Roles, capacidades y permisos de las tools de IA |
| [05 — Agentes de IA](05-agentes-ia.md) | Secretaría pública + asistente interno: tools, guards, auditoría |
| [06 — Testing](06-testing.md) | Matriz cross-tenant, tests de tools, de esquema y de frontend |
| [07 — Roadmap](07-roadmap.md) | Hitos H0–H8 y F0–F3 |
| [08 — Decisiones y ADR](08-decisiones-abiertas.md) | Decisiones tomadas, abiertas y registro ADR |
| [09 — Frontend](09-frontend.md) | Astro (landing) + React SPA (dashboard), theme engine, secciones |
| [10 — Seguridad](10-seguridad.md) | Sesiones, CSRF, secrets, rate limit, headers, auditoría |
| [11 — Onboarding y provisioning](11-onboarding-provisioning.md) | Alta de consultorio, seed, publicación, invitaciones |
| [12 — Deploy, dominios y costos](12-deploy-dominios-costos.md) | Recursos Cloudflare, entornos, dominios, límites, costos |
| [14 — Producto y piloto](14-producto-y-piloto.md) | Estado para consultorios, alta, prueba de 30 días, master y pagos |
| [16 — Auditoría y puesta en marcha](16-auditoria-y-puesta-en-marcha.md) | Checklist funcional actual, pruebas locales y pasos para publicar |
| [17 — Auditoría de producción](17-auditoria-produccion.md) | Qué tan listos estamos para salir: bloqueantes, riesgos y orden sugerido |
| [18 — Convenciones de desarrollo](18-convenciones-de-desarrollo.md) | Reglas del código del proyecto (para humanos y agentes) |

## Estado

- **Fase:** piloto funcional local.
- **Pantallas:** dos. El **panel** (`dental-api`, entra por `/login`) y la **landing
  de cada consultorio** (`dental-landing`, `/c/:slug`). La raíz de la landing
  redirige al login del panel. El sitio de marketing del SaaS (`apps/site`) se
  eliminó para simplificar el MVP. El master de la plataforma usa el mismo panel
  en `/plataforma` (ver [14](14-producto-y-piloto.md)).
- **Repo:** monorepo TypeScript con API/Worker, panel React y landing Astro.
- **Decisiones estructurales:** resueltas para piloto; quedan decisiones comerciales
  antes de vender a escala.
- **Próximo paso:** publicar en Cloudflare con D1 real y validar con un consultorio
  piloto usando datos reales.

## Referencias de dominio

- **Open Dental** (propietario, .NET + MySQL) — referencia de nomenclador/procedimientos.
- **OpenDentist** (clawnify/OpenDentist, **MIT**) — reimplementación web sobre nuestro
  stack; se usa como referencia de **dominio y UI**, no como base de código
  (single-tenant, sin auth). Ver ADR-0006 en [08](08-decisiones-abiertas.md).
- **`react-odontogram`** (MIT) — dependencia adoptada para el odontograma (ADR-0007).

## Principio rector

El aislamiento entre consultorios es una **propiedad estructural del sistema**, no
algo que dependa de que cada desarrollador recuerde escribir `WHERE clinic_id = ?`.
Ver [02 — Multi-tenancy](02-multi-tenancy.md).
