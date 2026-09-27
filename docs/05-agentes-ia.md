# 05 — Agentes de IA

Hay **dos superficies de IA** sobre un **mismo motor**. No son dos productos
distintos: cambian el `TenantContext` y el registro de tools, no el pipeline.

| | Secretaría pública | Asistente interno |
|---|---|---|
| Quién le habla | Paciente anónimo (landing) | Odontólogo / recepcionista (dashboard) |
| `TenantContext` | `role: 'visitor'`, `userId: null` | el usuario logueado |
| Tenant | desde el hostname | desde la sesión |
| Puede | leer público + **crear** turno (`pending`) | **leer y escribir**: agenda, pacientes, disponibilidad |
| Alcance | solo esa clínica | el de **ese usuario** (un dentist: solo su agenda) |
| Estado | **MVP** (H5) | **fase 2 fast-follow** (H8) |

## 1. Motor

- **DeepSeek** vía `@ai-sdk/deepseek` (AI SDK), modelo `deepseek-flash`.
- API OpenAI-compatible (`base_url https://api.deepseek.com`), con function/tool calling.
- Streaming con `streamText` en `apps/api`; el cliente consume con `useChat`.

## 2. Flujo obligatorio (idéntico para los dos agentes)

```
DeepSeek
  ↓
tool call
  ↓
apps/api
  ↓
validación (capacidad + negocio + disponibilidad)
  ↓
TenantContext (cerrado por closure)
  ↓
service de negocio (el MISMO que usa la UI)
  ↓
repository
  ↓
D1
```

**DeepSeek nunca accede a D1.** No hay SQL ni credenciales del lado del modelo.

## 3. Boundary de tools (lo crítico del aislamiento)

Las tools se construyen **por request**, con el `TenantContext` capturado por
closure. El modelo no puede elegir, modificar ni proveer `clinic_id`.

```ts
// Correcto
buildTools(ctx: TenantContext)

// Prohibido
createAppointment({ clinicId: aiGeneratedClinicId, ... })
```

Reglas:

- El `inputSchema` **nunca** incluye `clinic_id`.
- Guard: si en `args` aparece `clinicId`/`clinic_id`, se descarta (y se testea).
- El `execute` recibe `repos(ctx)` — no puede importar `env.DB`.
- Las tools llaman a los **services** que usa la UI, nunca escriben filas crudas:
  así la IA y el dashboard no pueden divergir.

## 4. Registro por capacidades

Cada tool declara la **capacidad** que requiere (ver
[04 — Autorización](04-autorizacion.md)). El builder devuelve solo las tools que
`can(ctx, cap)` permite:

```ts
buildTools(ctx) = allTools.filter(t => can(ctx, t.capability))
```

Consecuencias:

- El agente de un `receptionist` no puede tocar facturación ni configuración.
- El agente de un `dentist` solo opera **su** agenda (chequeo de pertenencia en el service).
- El agente público (`visitor`) solo ve las tools con `public:*`.

**La IA nunca tiene más poder que la persona que la invoca.**

## 5. Agente público (secretaría)

### 5.1 Tools del MVP

`get_clinic_information`, `get_services`, `get_doctors`, `get_available_slots`,
`create_appointment` (con `source: 'ai'`, `status: 'pending'`).

### 5.2 Esquema (recorte)

```ts
export function buildPublicTools(ctx: TenantContext) {
  return pickTools(ctx, {
    get_clinic_information: tool({
      description: 'Datos de la clínica: dirección, horarios, contacto, cobertura.',
      inputSchema: z.object({}),
      execute: async () => clinicService.info(repos(ctx)),
    }),
    get_available_slots: tool({
      description: 'Horarios libres para un servicio en un rango de fechas.',
      inputSchema: z.object({
        serviceId: z.string(),
        dateFrom: z.string(),
        dateTo: z.string(),
        doctorId: z.string().optional(),
      }),
      execute: async (a) => availabilityService.slots(repos(ctx), a),
    }),
    create_appointment: tool({
      description: 'Reserva un turno. Requiere nombre y un medio de contacto.',
      inputSchema: z.object({
        serviceId: z.string(),
        doctorId: z.string(),
        startsAt: z.string(),
        patient: z.object({
          fullName: z.string(),
          phone: z.string().optional(),
          email: z.string().optional(),
        }),
      }),
      execute: async (a) => bookingService.create(repos(ctx), a, { source: 'ai' }),
    }),
  }, 'public:read')
}
```

- `create_appointment` valida doctor↔service↔clínica, disponibilidad real, duración
  del servicio y el índice único de slot (si hay carrera: "ese horario se acaba de ocupar").

### 5.3 System prompt

- Construido por clínica desde `clinic_settings` (nombre, dirección, horarios,
  obras sociales, FAQ) → grounding sin RAG para un cuerpo de conocimiento chico.
- Instrucciones estrictas: no inventar datos/precios/coberturas, responder en el
  idioma del usuario, ser conciso, derivar a contacto cuando no está cubierto.
- Las tools consultan datos **reales** en vez de depender de texto estático.

## 6. Asistente interno (dashboard)

### 6.1 Tools de escritura propuestas

| Tool | Capacidad | Riesgo |
|---|---|---|
| `get_agenda(range, doctorId?)` | `appointments:read` | lectura |
| `find_patient(query)` | `patients:read` | lectura |
| `register_patient(data)` | `patients:write` | reversible |
| `update_patient(id, data)` | `patients:write` | reversible |
| `create_appointment(...)` | `appointments:write` | confirmación |
| `reschedule_appointment(id, startsAt)` | `appointments:write` | confirmación |
| `cancel_appointment(id, reason?)` | `appointments:write` | confirmación |
| `block_availability(doctorId, date, kind)` | `availability:write` | confirmación |
| `list_recalls(dueBefore?)` | `recalls:read` | lectura |
| `schedule_recall(id, startsAt)` | `recalls:write` | confirmación |
| `list_waiting(serviceId?)` | `waiting:read` | lectura |
| `offer_waiting_slot(id, startsAt)` | `waiting:write` | confirmación |
| `list_pending_conversations()` | `conversations:read` | lectura |

`billing:*`, `settings` y **toda la ficha clínica** (odontograma, plan de tratamiento,
evolución, laboratorio) **quedan fuera del agente** (nunca autónomos ni legibles).

### 6.2 Modelo de seguridad para acciones

1. **Autorización = la del usuario.** El agente hereda su `TenantContext`; nunca es superusuario.
2. **Aislamiento intacto.** Pasa por `TenantDb`; el modelo no provee `clinic_id`.
3. **Confirmación para lo consecuente.** Lecturas y borradores son autónomos; las
   escrituras que afectan al paciente o a la agenda se **proponen** (acción pendiente
   estructurada) y la persona **confirma** antes de ejecutar.
4. **Auditoría.** Cada acción iniciada por IA se registra en `audit_log`
   (`actor_user_id`, `actor_type: 'ai'`, `conversation_id`, tool, args, entidad).
5. **Reversibilidad = operación inversa declarada**, no restaurar un snapshot
   (reprogramar se deshace reprogramando al horario anterior).
6. **Idempotencia** por clave, para que un reintento del modelo no duplique.
7. **Desambiguación**: si hay dos "Juan Pérez" o el pedido es ambiguo, pregunta antes.

### 6.3 Dónde aparece

- Barra de comandos / panel "Asistente" disponible en todas las pantallas.
- Contextual: desde la ficha de un paciente, "reprogramá su turno para el jueves".
- Proactivo (**sugerencias, no auto-acciones**) en la pantalla **Hoy**:
  "hay 3 cancelaciones y 2 en lista de espera para limpieza, ¿los llamo?".

## 7. Persistencia

- `conversations` (scope de clínica) y `messages` (con `clinic_id` + FK compuesta).
- `conversations.kind` distingue `public` (visitante) de `staff` (asistente interno);
  `conversations.user_id` queda seteado en las internas.
- Se registran `tool_name` y `tool_args` para auditar qué hizo la IA.

## 8. Concurrencia e idempotencia

- **Doble reserva:** índice único parcial de `appointments` (ver `03`); la tool
  captura el error de constraint.
- **Idempotencia:** las tools de escritura aceptan clave de idempotencia.
- Las tools son la **única** vía de la IA para modificar datos; no hay SQL libre.

## 9. Anti-abuso

- Rate limit por IP en los endpoints de chat.
- **Turnstile** en el endpoint público (skill documentada).
- Límite de tamaño de mensaje y de iteraciones de tool calls por request.

## 10. Estado por hito

- **MVP (H5):** agente público.
- **Fase 2 (H8):** asistente interno, reutilizando el mismo motor. Set inicial de
  escrituras: `reschedule` y `cancel` con confirmación, después `register_patient`;
  `billing`/`settings` fuera.
