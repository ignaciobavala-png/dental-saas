# 00 — Visión y MVP

## 1. Qué es el producto

Un SaaS multi-tenant que le da a cada consultorio odontológico tres cosas a la vez,
desde una sola plataforma:

1. **Landing page premium, moderna y personalizable.**
2. **Secretaria virtual con IA, disponible 24/7.**
3. **Sistema confiable de gestión** de pacientes, profesionales y turnos.

La sensación buscada es la de contratar simultáneamente una agencia web, una
secretaria y un software de gestión, pero sin depender de tres proveedores.

## 2. Público y modelo comercial

- **Mercado inicial:** consultorios odontológicos argentinos.
- **Precio objetivo:** US$57 mensuales por consultorio.
- **Internacionalización:** diseñar desde el día 1 para escalar al resto de
  Latinoamérica (es-AR primero, i18n preparado).

## 3. Los tres pilares en detalle

### 3.1 Landing premium

No debe parecer una plantilla SaaS genérica. Visual, rápida, mobile-first y
orientada a convertir visitantes en pacientes. Cada clínica personaliza: nombre,
logo, colores, tipografías, fotos, profesionales, especialidades, tratamientos,
ubicación, horarios, teléfono, WhatsApp, redes, obras sociales, testimonios y FAQ.

Secciones sugeridas: Hero · Tratamientos · Profesionales · Secretaría virtual ·
Consultorio (galería) · Opiniones · Ubicación (mapa) · CTA final.

Estética base: premium, minimalista, cálida, médica sin ser hospitalaria,
grandes fotografías, mucho espacio, tipografía excelente, animaciones sutiles.
**Evitar** el cliché de webs odontológicas blancas/azules con sonrisas genéricas.

### 3.2 Secretaría IA

Es una característica **principal** de la experiencia, no un chat diminuto
escondido en la esquina. Sección dedicada dentro de la landing, chat integrado,
capaz de terminar una conversación en una **reserva real**.

### 3.3 Gestión (dashboard del odontólogo)

Secciones: **Hoy · Agenda · Pacientes · Profesionales · Tratamientos ·
Secretaría IA · Landing · Gestión (ingresos/gastos) · Configuración**.

Onboarding ideal: crear cuenta → crear consultorio → cargar datos → configurar
profesionales y horarios → subir logo/fotos → publicar. Objetivo: de cero a
`web + secretaria + agenda + gestión` en menos de 30 minutos, sin conocimientos técnicos.

## 4. Stack principal (definido)

| Capa | Tecnología |
|---|---|
| Backend / API | Cloudflare Workers |
| Persistencia | Cloudflare D1 (**una sola base compartida**, multi-tenancy estricta) |
| Lenguaje | TypeScript (strict) en todo |
| Frontend | Astro SSR (landing) + React SPA (dashboard) — ver [09 — Frontend](09-frontend.md) |
| IA | DeepSeek |
| Referencia de dominio | Open Dental + OpenDentist (MIT) — ver nota y [03](03-modelo-de-datos.md) |

> **Referencias de dominio, no de código.**
> - **Open Dental** — software .NET + MySQL, propietario. Se usa como referencia del
>   modelo de dominio (procedimientos, nomenclador).
> - **OpenDentist** (clawnify/OpenDentist, licencia **MIT**) — reimplementación web con
>   nuestro stack (Hono + D1 + React). Es **single-tenant y sin auth**, así que se toma
>   como referencia de **dominio y UI** (agenda multi-box, odontograma, plan de
>   tratamiento, evolución, recall, laboratorio), **nunca como base para forkear**.
>   Ver ADR-0006.

## 5. Objetivo del MVP

No construir todas las funcionalidades posibles. Demostrar **perfectamente y de
forma extremadamente confiable** el ciclo principal:

```
Visitante → Landing → Secretaría IA → Consulta → Disponibilidad
          → Reserva → D1 → Dashboard del odontólogo
```

Antes de agregar funcionalidades secundarias, ese flujo tiene que funcionar sin
fisuras y sin fugas de datos entre consultorios.

## 6. Alcance

### Dentro del MVP

- Alta de clínica y provisión de datos.
- Auth del odontólogo + roles.
- Landing multi-tenant (tema + contenido) con secciones principales.
- Editor básico de contenido/tema.
- Modelo clínico: pacientes, profesionales, servicios (tratamientos), boxes,
  disponibilidad, turnos.
- Ficha clínica: odontograma, plan de tratamiento y evolución (nunca por IA).
- Recall y lista de espera (alimentan a la secretaría IA).
- Motor de disponibilidad y reserva (incluye anti doble-reserva).
- Secretaría IA con tools controladas + reserva real desde el chat.
- Dashboard: Hoy, Agenda (por profesional y box), Pacientes, Profesionales,
  Tratamientos, Configuración.
- Notificaciones básicas de turno.
- Aislamiento estricto + suite de tests cross-tenant.
- Dirección de arte + motor de themes/secciones de la landing.

### Fuera del MVP (fase 2+)

- **Asistente interno** (agente de IA que opera el dashboard; ver [05](05-agentes-ia.md) y H8 en [07](07-roadmap.md)).
- Gestión completa de ingresos/gastos y reportes.
- Reseñas externas integradas, recordatorios automáticos, campañas.
- Multi-idioma completo.
- Automatización del cobro (suscripción recurrente).
- Conexión self-serve de dominios propios.
- Imágenes/radiografías, laboratorio, facturación y coberturas (obras sociales) con
  validación de cobertura (modeladas en [03](03-modelo-de-datos.md)).

## 7. Requisito no negociable

Todo lo del MVP está condicionado por el aislamiento entre consultorios. Ver
[02 — Multi-tenancy](02-multi-tenancy.md).
