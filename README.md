# Dental SaaS

SaaS multi-tenant para consultorios odontológicos. Cada consultorio obtiene:

- una **landing pública** (`/c/<slug>`) con contenido editable,
- una **secretaria virtual con IA** que responde dudas y reserva turnos sin doble reserva,
- un **panel de gestión** (pacientes, profesionales, agenda, historia clínica, recalls y un copiloto interno con IA).

Corre entero en **Cloudflare** (Workers + D1). La IA usa **DeepSeek** con tu propia API key. No hay otros servicios externos ni otras credenciales.

| Carpeta | Qué es | Tecnología |
|---|---|---|
| `apps/api` | Worker `dental-api`: API REST **y** sirve el panel (SPA) | Hono, D1 |
| `apps/admin` | Panel React. Se compila a `apps/admin/dist` y lo sirve `dental-api` | React, Vite |
| `apps/landing` | Worker `dental-landing`: landing pública de cada consultorio | Astro 7 |
| `packages/*` | Núcleo compartido: acceso a datos por consultorio, auth, contratos, tema | TypeScript |

Diseño y decisiones: [`docs/`](docs/README.md).

## ⚠️ Leer antes de usar con pacientes reales

La secretaria manda a DeepSeek lo que escribe el paciente, y el copiloto del panel manda datos de pacientes, notas y agenda. En Argentina los datos de salud son **datos sensibles** (Ley 25.326) y enviarlos a un proveedor en el exterior es una transferencia internacional. Quien despliegue esto es responsable de tener política de privacidad, consentimiento y acuerdo con cada consultorio. Detalle en [`docs/17`](docs/17-auditoria-produccion.md).

Estado: **piloto cerrado**. Falta recuperación de contraseña, verificación de email, Turnstile en el alta y tope de gasto de IA. No abrir el registro al público sin resolverlo.

---

# Guía de despliegue (para el agente que lo ejecuta)

Esta sección está escrita para que un agente (Claude Code, Codex, etc.) despliegue el proyecto en la cuenta de Cloudflare de su usuario **sin adivinar nada**. Seguí los pasos en orden. Cada paso dice qué verificar antes de seguir.

## 0. Reglas

1. **Nunca** escribas secretos en archivos versionados ni en `wrangler.jsonc`. La API key de DeepSeek va **solo** como secret de Cloudflare (`wrangler secret put`) o, en local, en `apps/api/.dev.vars` (ignorado por git).
2. **Nunca** hagas commit de `apps/api/.dev.vars`, `.env*` ni de tokens.
3. Los únicos archivos de configuración que hay que editar son `apps/api/wrangler.jsonc` y `apps/landing/wrangler.jsonc` (ids y URLs, que no son secretos). No toques código de `src/`.
4. Si falta un dato que solo el humano puede dar, **pedíselo** y esperá (ver §1). No inventes valores.
5. Todos los comandos se ejecutan desde la **raíz del repo** con `pnpm --filter … exec wrangler …`, así se usa el `wrangler` fijado por el proyecto.

## 1. Qué tenés que pedirle al humano

| Dato | Para qué | Obligatorio |
|---|---|---|
| `DEEPSEEK_API_KEY` (de https://platform.deepseek.com) | La IA de la secretaria y del copiloto | **Sí** |
| Acceso a su Cloudflare: login interactivo **o** `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | Crear la D1 y desplegar los Workers | **Sí** |
| Email y nombre del usuario master de la plataforma, y una contraseña (mín. 8 caracteres) | Administrar consultorios desde `/plataforma` | **Sí** |
| Subdominio `workers.dev` (solo si la cuenta nunca desplegó un Worker) | La primera vez wrangler pregunta cuál registrar | Si lo pide |
| Días de prueba por consultorio | Cambia el default de 30 | No |
| Modelo de DeepSeek | Cambia el default `deepseek-flash` (id vigente y válido) | No |

Si usa token de API, que tenga permisos de **Workers Scripts: Edit**, **D1: Edit** y **Account Settings: Read** sobre su cuenta.

## 2. Variables y secretos (referencia completa)

Estas son **todas** las variables que lee el código. No existen otras (`SESSION_SECRET` y `ALLOWED_ORIGIN` no hacen falta).

### Worker `dental-api` (`apps/api`)

| Nombre | Tipo | Obligatoria | Dónde se carga | Valor |
|---|---|---|---|---|
| `DEEPSEEK_API_KEY` | **secret** | Sí | `wrangler secret put` (§5) / `.dev.vars` en local | La key del humano |
| `PUBLIC_LANDING_URL` | var | Recomendada | `"vars"` en `apps/api/wrangler.jsonc` (§7) | URL de `dental-landing`, ej. `https://dental-landing.<subdominio>.workers.dev` (sin `/` final). Si falta, el panel no muestra el link a la landing del consultorio |
| `DEEPSEEK_MODEL` | var | No | `"vars"` | Default `deepseek-flash` |
| `TRIAL_DAYS` | var (string) | No | `"vars"` | Entero 1–365, default `"30"` |

Bindings de Cloudflare (ya declarados en `apps/api/wrangler.jsonc`; no son variables):

| Binding | Recurso | Acción tuya |
|---|---|---|
| `DB` | D1 `dental-saas` | **Reemplazar `database_id`** (§3) |
| `ASSETS` | Panel compilado (`apps/admin/dist`) | Compilar antes de desplegar (§5) |
| `AUTH_LIMIT`, `AI_LIMIT` | Rate limiting (10/min login y alta, 20/min IA, por IP) | Ninguna |

### Worker `dental-landing` (`apps/landing`)

| Nombre | Tipo | Obligatoria | Dónde se carga | Valor |
|---|---|---|---|---|
| `PANEL_URL` | var | **Sí** | `"vars"` en `apps/landing/wrangler.jsonc` (§7) | URL de `dental-api`, ej. `https://dental-api.<subdominio>.workers.dev` (sin `/` final). La raíz de la landing redirige a `PANEL_URL/login`; sin ella responde 500 con un mensaje |
| `DENTAL_API` | service binding | — | Ya declarado | Apunta al Worker `dental-api`: **la API tiene que desplegarse antes** |

### Variables solo para tu terminal (no van a ningún archivo)

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (opcionales si usás `wrangler login`) y `PLATFORM_ADMIN_PASSWORD` (opcional: evita el prompt del §8).

## 3. Preparación

```bash
pnpm install --frozen-lockfile
pnpm --filter @dental/api exec wrangler whoami
```

`whoami` debe mostrar la cuenta correcta. Si no hay sesión: `pnpm --filter @dental/api exec wrangler login` (abre el navegador, lo hace el humano) o exportar el token del §1.

## 4. Base de datos (D1)

```bash
pnpm --filter @dental/api exec wrangler d1 create dental-saas
```

Tomá el `database_id` (UUID) de la salida. Si no lo capturaste: `pnpm --filter @dental/api exec wrangler d1 list --json`.

Editá `apps/api/wrangler.jsonc`: reemplazá **solo** el valor de `database_id` (hoy `00000000-0000-0000-0000-000000000000`). Dejá `database_name` y `migrations_dir` como están. Después:

```bash
pnpm --filter @dental/api exec wrangler d1 migrations apply dental-saas --remote
```

**Verificar:** la salida lista las migraciones `0001` … `0006` con ✅. Si falla con "database not found", el `database_id` quedó mal.

## 5. Desplegar API + panel

El panel se compila primero porque `dental-api` lo sirve como assets.

```bash
pnpm --filter @dental/admin build
pnpm --filter @dental/api run deploy
```

> Usá `run deploy`. `pnpm deploy` a secas es un comando propio de pnpm y **no** corre el script del proyecto.

Anotá la URL que imprime el deploy: `https://dental-api.<subdominio>.workers.dev` → es `API_URL`.

Cargá el secret **sin que quede en historial ni en archivos** (con el valor en una variable de entorno de la sesión):

```bash
printf '%s' "$DEEPSEEK_API_KEY" | pnpm --filter @dental/api exec wrangler secret put DEEPSEEK_API_KEY
```

**Verificar:** `curl -s "$API_URL/api/health"` devuelve `{"ok":true}`.

## 6. Desplegar la landing

```bash
pnpm --filter @dental/landing run deploy
```

(Compila con Astro y despliega.) Anotá la URL: `https://dental-landing.<subdominio>.workers.dev` → es `LANDING_URL`.

## 7. Conectar las URLs entre sí

Cada Worker necesita la URL del otro, que recién conocés ahora. Agregá una propiedad `"vars"` al objeto raíz de cada archivo (si ya existe, sumá la clave dentro):

`apps/api/wrangler.jsonc`
```jsonc
"vars": { "PUBLIC_LANDING_URL": "<LANDING_URL>" }
```

`apps/landing/wrangler.jsonc`
```jsonc
"vars": { "PANEL_URL": "<API_URL>" }
```

Agregá acá también, si el humano las pidió, `TRIAL_DAYS` o `DEEPSEEK_MODEL` en el `"vars"` de la API. Todos los valores de `vars` son **strings**. Después redesplegá los dos:

```bash
pnpm --filter @dental/api run deploy
pnpm --filter @dental/landing run deploy
```

**Verificar:** `curl -sI "$LANDING_URL/"` responde `302` con `location: <API_URL>/login`.

## 8. Usuario master

El master ve todos los consultorios en `/plataforma`, registra pagos, extiende pruebas y suspende cuentas. No se crea desde la UI. Desde la raíz del repo:

```bash
PLATFORM_ADMIN_PASSWORD='<contraseña del humano>' \
  pnpm --filter @dental/api admin:create --email <email> --name "<nombre>" --remote
```

(Sin `PLATFORM_ADMIN_PASSWORD` la pide por consola.) **Verificar:** imprime `Listo: <email> es master`.

## 9. Prueba de humo

```bash
# 1) Alta de un consultorio de prueba (devuelve el slug)
curl -s -X POST "$API_URL/api/auth/signup" -H 'Content-Type: application/json' \
  -d '{"name":"Dr Prueba","email":"prueba@example.com","password":"12345678","clinicName":"Consultorio Prueba"}'

# 2) Su landing pública (reemplazá el slug por el devuelto)
curl -s -o /dev/null -w '%{http_code}\n' "$LANDING_URL/c/<slug>"        # → 200

# 3) La secretaria con IA responde (confirma que DEEPSEEK_API_KEY funciona)
curl -s -X POST "$LANDING_URL/api/secretaria/chat?clinic=<slug>" -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Hola, ¿qué tratamientos tienen?"}]}'
```

El paso 3 debe devolver texto en español que mencione tratamientos (Odontología general, Limpieza…). Si devuelve un error, mirá §10. Después **borrá el consultorio de prueba o dejalo**: es un dato más en la base; no afecta nada. Si lo dejás, avisale al humano.

## 10. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| Deploy de la landing falla con "service binding … not found" | `dental-api` todavía no existe | Desplegar la API primero (§5) |
| Deploy de la API falla por `database_id` | Quedó el placeholder o un UUID equivocado | §4 |
| El panel muestra pantalla en blanco o 404 en `/` | No se compiló el admin antes de desplegar la API | `pnpm --filter @dental/admin build` y redesplegar |
| `/` de la landing responde 500 "Falta configurar PANEL_URL" | Falta §7 o no se redesplegó la landing | Completar §7 |
| El chat responde error / 500 | `DEEPSEEK_API_KEY` no cargada o inválida | Repetir `secret put`; ver logs con `pnpm --filter @dental/api exec wrangler tail dental-api` |
| `wrangler` pide elegir subdominio | Cuenta nueva sin `workers.dev` | Preguntarle al humano el subdominio |
| 429 "Demasiados intentos" | Rate limit por IP (10/min en login y alta, 20/min en IA) | Esperar un minuto |
| Cambié una var y no tiene efecto | Las `vars` se aplican en cada deploy | Redesplegar |

---

# Desarrollo local

```bash
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars          # completar DEEPSEEK_API_KEY
pnpm --filter @dental/api exec wrangler d1 migrations apply dental-saas --local
pnpm dev
```

| Servicio | URL |
|---|---|
| Panel (crear cuenta en `/login`) | http://localhost:5173 |
| API | http://127.0.0.1:8787 |
| Landing de un consultorio | http://127.0.0.1:4321/c/`<slug>` |

Master local: `pnpm --filter @dental/api admin:create --email <email> --name "<nombre>"` (sin `--remote`).

Chequeos:

```bash
pnpm -r typecheck
pnpm --filter @dental/api test
```

## Cómo se aísla cada consultorio

Todas las consultas pasan por `TenantDb`, que agrega `clinic_id` a cada lectura y escritura; no hay SQL directo en las rutas. Hay tests que verifican que un usuario de un consultorio recibe 404 al pedir datos de otro. Detalle en [`docs/02`](docs/02-multi-tenancy.md).

## Licencia

[MIT](LICENSE)
