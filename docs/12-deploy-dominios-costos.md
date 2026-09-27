# 12 — Deploy, dominios y costos

## 1. Recursos de Cloudflare

| Recurso | Uso |
|---|---|
| Workers (2) | `apps/api` y `apps/landing` |
| D1 | base única compartida (plataforma + tenants) |
| R2 | imágenes de landing (originales) |
| Cloudflare Images / transform | servir imágenes optimizadas |
| Email Routing + `send_email` | notificaciones de turno (A4) |
| Turnstile | anti-abuso de endpoints públicos |
| Service binding | `apps/landing` → `apps/api` |
| Custom hostnames (Cloudflare for SaaS) | dominios propios de cada clínica |

## 2. Entornos

- `dev` (local, Miniflare + D1 local).
- `staging` (Worker `-staging`, D1 separada, dominio `staging.…`).
- `prod`.
- Cada entorno con su propia D1 y sus **secrets** (nunca compartidos). No confiar en
  que una env var cargada en preview existe en prod: diff de keys antes de mergear.

## 3. `wrangler.jsonc` (esquema, resumido)

```jsonc
// apps/api
{
  "name": "dental-api",
  "main": "src/index.ts",
  "assets": { "directory": "../admin/dist" },   // sirve la SPA del admin
  "d1_databases": [
    { "binding": "DB", "database_name": "dental", "database_id": "…" }
  ],
  "routes": [{ "pattern": "app.nuestrosaas.com/*", "custom_domain": true }]
}
```

```jsonc
// apps/landing
{
  "name": "dental-landing",
  "main": "dist/_worker.js/index.js",
  "services": [{ "binding": "API", "service": "dental-api" }],
  "assets": { "directory": "dist", "binding": "ASSETS" },
  "routes": [{ "pattern": "*.nuestrosaas.com/*", "zone_name": "nuestrosaas.com" }]
}
```

> Notas de deploy (de la skill `cloudflare-wrangler-deploy`): `.assetsignore` completo
> para no exponer `.claude/`/lockfiles; `pnpm approve-builds` para `workerd`; el deploy
> de Astro usa `dist/server/wrangler.json` (rebuild tras tocar config); `workers_dev`
> activo o se apaga la URL de verificación.

## 4. Migraciones

- `wrangler d1 migrations apply` en normal; si el tracker diverge, aplicar suelto con
  `wrangler d1 execute <db> --remote --file=…`.
- SQLite no soporta `ALTER COLUMN`: recrear tabla + recrear índices.
- Correr migraciones en **staging antes** de prod, y respaldar (Time Travel) antes de
  cambios destructivos.

## 5. Dominios

- **Base del SaaS:** `nuestrosaas.com` (definir, A7). El Worker `apps/landing` corre en
  `*.nuestrosaas.com` (wildcard) y el admin en `app.nuestrosaas.com`.
- **Subdominio por clínica:** `{slug}.nuestrosaas.com`, alta en `domains` al provisionar.
- **Dominio propio del cliente (`clinica.com.ar`):** vía **Cloudflare for SaaS**
  (custom hostnames), sin mover la zona del cliente a nuestra cuenta. Trampas
  conocidas: la route `*/*` mal puesta se come el tráfico de la zona base; el DCV por
  HTTP deja unos minutos de error de SSL; el alta pide tarjeta aunque el total sea 0.
- Verificar certificado con `openssl s_client` / `curl -w ssl=%{ssl_verify_result}`
  antes de tocar DNS.

## 6. Costos (órdenes de magnitud, verificar precios vigentes)

- **Workers Paid:** ~US$5/mes por cuenta (habilita D1 > límites free, CPUs, crons).
- **D1:** se cobra por filas leídas/escritas y storage. Plan pago incluye una bolsa
  mensual; el excedente es bajo. **Cuidado con escaneos sin índice.**
- **R2:** storage barato y **sin egress**; ideal para imágenes.
- **Cloudflare Images/transform:** costo por imagen almacenada + entregada.
- **DeepSeek:** por tokens; `deepseek-flash` es económico. El costo escala con
  conversaciones → de ahí el tope de iteraciones y el rate limit.
- **Cloudflare for SaaS:** 100 custom hostnames incluidos en Free.

Margen: con US$57/consultorio/mes, el costo de infraestructura por clínica es una
fracción menor siempre que se eviten escaneos de tabla y videos self-hosted.

## 7. Límites que condicionan diseño

- **D1:** 10 GB por base; 30 s por query; filas/lecturas diarias según plan.
- **Workers:** CPU por invocación; subrequests; 6 conexiones simultáneas a D1.
- **Free plan:** la base se pausa por inactividad y hay límites diarios → **no** usar
  Free para prod. (En D1 compartida, un pico de una clínica afecta a todas: monitorear.)

## 8. Checklist de deploy

- [ ] Secrets de prod cargados y verificados.
- [ ] Migraciones aplicadas en staging y prod.
- [ ] `wrangler deploy` real y confirmado (no solo build verde).
- [ ] Subdominio wildcard y `app.` resolviendo con cert válido.
- [ ] Service binding `API` funcionando desde la landing.
- [ ] `.assetsignore` no expone archivos internos.
- [ ] Smoke test del ciclo público en prod, en un tenant de prueba.
