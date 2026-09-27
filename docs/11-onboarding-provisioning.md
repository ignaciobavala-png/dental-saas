# 11 — Onboarding y provisioning

Objetivo: de no tener nada a `web + secretaria + agenda + gestión` en **menos de 30
minutos**, sin conocimientos técnicos. El odontólogo no debería ver jerga técnica.

## 1. Flujo del usuario

```
Crear cuenta
  ↓
Crear consultorio        (nombre, slug, ciudad, teléfono)
  ↓
Cargar datos             (dirección, horarios, obras sociales, contacto)
  ↓
Configurar profesionales y servicios
  ↓
Configurar disponibilidad (plantilla semanal reutilizable)
  ↓
Subir logo y fotos
  ↓
Elegir preset de landing (paleta/tipografía/hero)
  ↓
Publicar
```

Cada paso se puede saltear y completar después; la landing se puede publicar con el
contenido por defecto y mejorarlo. El objetivo es **llegar a publicado**, no a perfecto.

## 2. Provisioning (server-side)

Al crear el consultorio se ejecuta, en una operación idempotente:

1. `clinics` — fila con `slug` único, `status: 'trial'`, `plan_id` según corresponda,
   `db_strategy: 'shared'`.
2. `memberships` — el creador como `owner`.
3. `clinic_settings` — fila con `timezone` (default `America/Argentina/Buenos_Aires`),
   `locale` (`es-AR`), `theme_json` (preset por defecto) y `content_json` (starter).
4. `domains` — alta del subdominio `{slug}.nuestrosaas.com` (`kind: 'subdomain'`).
5. **Seed mínimo**: servicios odontológicos típicos (limpieza, consulta, blanqueamiento,
   ortodoncia, implantes, endodoncia) como `active: 0` para que el odontólogo active
   los que ofrece; un profesional placeholder solo si el flujo lo pide.
6. `audit_log` — registrar la creación.

> El seed de servicios **no** publica nada: son borradores desactivados. Evita el
> efecto "web con tratamientos que la clínica no hace".

## 3. Publicación

- `clinics.status`: `trial` → `active` al completar el mínimo publicable
  (nombre, contacto, al menos 1 servicio y 1 profesional con disponibilidad).
- La landing responde 404/placeholder hasta publicar; el dashboard la previsualiza
  igual.
- Publicar dispara invalidación de cache del edge para el hostname.

## 4. Invitación de equipo

- Invitar por email con rol (`admin`/`dentist`/`receptionist`), estado `invited`.
- Aceptar la invitación crea/vincula `users` + `memberships`.
- Un usuario puede pertenecer a varias clínicas; el contexto activo se elige al entrar.

## 5. Validaciones del onboarding

- Slug: `slugify()` único, sin acentos ni espacios; resolver colisiones con `-2`, `-3`.
- Subdominios reservados: `www`, `app`, `api`, `admin`, `mail`, etc.
- Email de la cuenta: único.
- No permitir publicar con cero servicios activos o sin al menos un profesional.

## 6. Checklist de "onboarding completo"

- [ ] Cuenta creada y verificada.
- [ ] Consultorio creado + subdominio reservado.
- [ ] Datos de contacto y ubicación cargados.
- [ ] ≥ 1 profesional con disponibilidad semanal.
- [ ] ≥ 1 servicio activo.
- [ ] Logo cargado (o fallback tipográfico decente).
- [ ] Preset de landing elegido.
- [ ] Publicado.

## 7. Reutilización

- La **plantilla de disponibilidad semanal** se guarda como conjunto de bloques
  (`weekday`, `start_min`, `end_min`) reutilizable entre profesionales.
- El **preset de landing** y el **starter content** viven en `packages/theme` para
  que un consultorio nuevo nunca arranque con la pantalla vacía.
