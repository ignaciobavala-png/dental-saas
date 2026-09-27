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

## Estado

- **Fase:** diseño cerrado, listo para implementar.
- **Repo:** solo `docs/`.
- **Decisiones estructurales:** resueltas (ver `08`). Quedan abiertas A2–A10.
- **Próximo paso:** `H0` (monorepo + fundaciones), con `F0` (dirección de arte) en
  paralelo.

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
