# Dental SaaS

SaaS multi-tenant para consultorios odontológicos. Cada consultorio obtiene:

- una **landing pública** (`/c/<slug>`) con su contenido editable,
- una **secretaria virtual con IA** que responde dudas y reserva turnos sin doble reserva,
- un **panel de gestión** (pacientes, profesionales, agenda, historia clínica, recalls y un copiloto interno con IA).

Todo corre en **Cloudflare** (Workers + D1). La IA usa **DeepSeek** con tu propia API key.

| App | Qué es | Tecnología |
|---|---|---|
| `apps/api` | Backend y panel (el Worker `dental-api` sirve la API y la SPA) | Hono, D1 |
| `apps/admin` | Panel React del consultorio (se compila y lo sirve `dental-api`) | React + Vite |
| `apps/landing` | Landing pública de cada consultorio (Worker `dental-landing`) | Astro |
| `packages/*` | Núcleo compartido: acceso a datos por consultorio, auth, contratos, tema | TypeScript |

La documentación de diseño está en [`docs/`](docs/README.md).

## ⚠️ Antes de usarlo con pacientes reales

La secretaria y el copiloto mandan a DeepSeek lo que el paciente escribe y, en el panel, datos de pacientes, notas y agenda. En Argentina los datos de salud son **datos sensibles** (Ley 25.326) y enviarlos a un proveedor en el exterior es una transferencia internacional. Quien despliegue esto es responsable de tener política de privacidad, consentimiento y acuerdo con cada consultorio. Más detalle en [`docs/17`](docs/17-auditoria-produccion.md).

Tampoco hay todavía recuperación de contraseña, verificación de email ni Turnstile en el alta: pensado para un **piloto cerrado**, no para abrir el registro al público.

## Requisitos

- Node 22 o superior (probado con 24) y [pnpm](https://pnpm.io) 10
- Cuenta de Cloudflare (alcanza el plan gratuito para probar)
- API key de [DeepSeek](https://platform.deepseek.com)

## Probarlo en tu máquina

```bash
pnpm install

# Variables locales de la API
cp apps/api/.dev.vars.example apps/api/.dev.vars     # y pegá tu DEEPSEEK_API_KEY

# Base de datos local
pnpm --filter @dental/api exec wrangler d1 migrations apply dental-saas --local

pnpm dev
```

- Panel: http://localhost:5173 (en `/login` podés crear la cuenta de un consultorio; trae 30 días de prueba)
- API: http://127.0.0.1:8787
- Landing de un consultorio: http://127.0.0.1:4321/c/`<slug>`

Tests y tipos:

```bash
pnpm -r typecheck
pnpm --filter @dental/api test
```

## Desplegarlo en tu Cloudflare

Son dos Workers: `dental-api` (API + panel) y `dental-landing`. El orden importa porque la landing se conecta a la API y las URLs dependen de tu cuenta.

```bash
pnpm install
pnpm --filter @dental/api exec wrangler login
```

### 1. Base de datos

```bash
pnpm --filter @dental/api exec wrangler d1 create dental-saas
```

Copiá el `database_id` que imprime y pegalo en `apps/api/wrangler.jsonc` (reemplaza `00000000-0000-0000-0000-000000000000`). Después aplicá las migraciones:

```bash
pnpm --filter @dental/api exec wrangler d1 migrations apply dental-saas --remote
```

### 2. API y panel

```bash
pnpm --filter @dental/admin build
pnpm --filter @dental/api run deploy
pnpm --filter @dental/api exec wrangler secret put DEEPSEEK_API_KEY
```

Anotá la URL que muestra el deploy (`https://dental-api.<tu-subdominio>.workers.dev`).

### 3. Landing

```bash
pnpm --filter @dental/landing run deploy
```

Anotá su URL (`https://dental-landing.<tu-subdominio>.workers.dev`).

### 4. Conectar las URLs

Cada Worker necesita conocer la URL del otro. Editá los dos `wrangler.jsonc` y volvé a desplegar:

```jsonc
// apps/api/wrangler.jsonc  (agregar al objeto raíz)
"vars": { "PUBLIC_LANDING_URL": "https://dental-landing.<tu-subdominio>.workers.dev" }
```

```jsonc
// apps/landing/wrangler.jsonc  (agregar al objeto raíz)
"vars": { "PANEL_URL": "https://dental-api.<tu-subdominio>.workers.dev" }
```

```bash
pnpm --filter @dental/api run deploy
pnpm --filter @dental/landing run deploy
```

Opcional: `TRIAL_DAYS` en `vars` de la API cambia los 30 días de prueba por defecto.

### 5. Usuario master de la plataforma

El master ve todos los consultorios en `/plataforma`, registra pagos, extiende pruebas y suspende cuentas. No se crea desde la UI:

```bash
pnpm --filter @dental/api admin:create --email vos@dominio.com --name "Tu Nombre" --remote
```

Te pide la contraseña por consola. Después entrá por `<URL del panel>/login`.

### Verificar

1. Abrí `<URL del panel>/login` y creá un consultorio de prueba.
2. Cargá un profesional y asignale tratamientos.
3. Abrí la landing del consultorio (`<URL de la landing>/c/<slug>`) y pedile un turno a la secretaria.
4. El turno aparece en la agenda del panel, como pendiente.

## Cómo funciona el aislamiento entre consultorios

Todas las consultas pasan por `TenantDb`, que agrega `clinic_id` a cada lectura y escritura; no hay SQL directo en las rutas. Hay tests que verifican que un usuario de un consultorio recibe 404 al pedir datos de otro. Detalle en [`docs/02`](docs/02-multi-tenancy.md).

## Licencia

[MIT](LICENSE)
