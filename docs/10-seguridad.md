# 10 — Seguridad

Complementa a [02 — Multi-tenancy](02-multi-tenancy.md), que cubre el aislamiento
entre clínicas. Acá va el resto de la superficie de seguridad.

## 1. Modelo de amenazas (resumen)

| Amenaza | Mitigación |
|---|---|
| Acceso cruzado entre clínicas | Ver `02` (5 capas estructurales) |
| Robo de sesión | Cookie httpOnly + secure + SameSite; token hasheado en D1; expiración |
| CSRF | SameSite + verificación de origen + token en mutaciones |
| Escalada de privilegios | Autorización por capacidad server-side (`can()`), nunca del frontend |
| Abuso de la IA / costo | Rate limit, Turnstile, tope de iteraciones y de tamaño |
| Inyección SQL | Prepared statements / `TenantDb`; cero SQL por concatenación |
| Fuga de secretos | Secrets de Workers; nunca en el repo ni en el bundle cliente |
| Enumeración de recursos | UUID; igual todo query va scoped por clínica |
| XSS en la landing | Escape por defecto de Astro; sanitizar HTML de contenido rico |

## 2. Autenticación y sesiones

- Password: hash con **Argon2id** o **scrypt** (nunca SHA/MD5).
- Sesión: cookie **`httpOnly` + `Secure` + `SameSite=Lax`** (o `Strict` si no rompe
  flujos externos). El id de sesión se guarda **hasheado** en `sessions`.
- Expiración absoluta + rotación al iniciar sesión; logout borra la fila.
- Si se adopta **Better Auth** (A2), respetar sus defaults y no reimplementar.
- La selección de clínica activa **se valida contra `memberships`** (ver `02`).

## 3. CSRF

- Mutaciones (POST/PUT/PATCH/DELETE) verifican **origen** contra una allow-list.
- Con `SameSite=Lax` + verificación de `Origin` alcanza para el MVP; si se necesita
  más, token double-submit.
- Endpoints de webhooks externos: exentos de la verificación de origen, pero
  autenticados por firma/secret propio.

## 4. Headers y transporte

- HTTPS obligatorio (Cloudflare).
- CSP razonable en la landing (Astro) y en el admin; evitar `unsafe-inline`.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- CORS: el admin es same-origin (ADR-0004); la API no expone CORS amplio.
- Recordar que D1 enforza FKs y que el Worker no puede cambiar `PRAGMA foreign_keys`
  fuera de la transacción; usar `defer_foreign_keys` solo en migraciones.

## 5. Validación de entrada

- **Todo** input se valida con los esquemas de `packages/contracts` (zod) en el borde.
- Los IDs de recursos **siempre** se usan scoped por clínica (nunca `WHERE id = ?` solo).
- Límites de tamaño de body y de mensajes de chat.
- Sanitizar contenido rico (HTML de la landing) para prevenir XSS almacenado.

## 6. Secretos y configuración

- Secretos de Workers (`wrangler secret put` / secrets store): `DEEPSEEK_API_KEY`,
  `TURNSTILE_SECRET`, `SESSION_SECRET`, credenciales de email.
- Nunca en el repo, nunca en el bundle cliente, nunca en `wrangler.jsonc` versionado.
- Rotación documentada; verificar con `secret list` que el secret se cargó (un
  `secret put` por pipe sin TTY puede no guardar nada sin error visible).

## 7. Rate limiting y anti-abuso

- Rate limit por IP en: login, chat público, creación de turnos, formularios.
- **Turnstile** en el endpoint público del chat y en el de reserva.
- Tope de iteraciones de tool calls y de tokens por request en la IA.
- Honeypot + Turnstile en formularios; recordar que el honeypot no frena el POST
  directo al endpoint.

## 8. Auditoría

- `audit_log` (ver `03`) registra acciones sensibles: quién (`actor_user_id`),
  `actor_type` (`user`/`ai`/`system`), clínica, acción, entidad y `meta`.
- Las acciones de IA se vinculan a su `conversation_id`.
- El log es de solo lectura para la app (nunca se edita ni borra desde el panel).

## 9. Datos personales y clínicos (PII/PHI)

- Minimizar: no guardar más de lo necesario (sobre todo en la landing pública).
- La landing pública **no** expone datos de pacientes.
- Pensar la residencia de datos si el producto crece a LatAm.
- D1: **Time Travel** sirve como red de recuperación ante errores (retención según plan).

## 10. Checklist antes de producción

- [ ] Secrets cargados y verificados por entorno (staging y prod).
- [ ] Cookies con flags correctos y `SameSite`.
- [ ] Verificación de origen en todas las mutaciones.
- [ ] Rate limit + Turnstile activos en endpoints públicos.
- [ ] Cero `env.DB` fuera de la capa de datos (test de regresión en verde).
- [ ] Matriz cross-tenant completa en verde.
- [ ] Headers de seguridad configurados.
- [ ] Revisar qué datos reales quedaron en capturas/logs de demo.
