# CareConnect — New Cloudflare Pages · Lightbase Edge Deployment

Bismillah Ar-Rahman Ar-Raheem. Single deployment path: **full Node SSR on
Cloudflare Pages with ZERO Cloudflare Workers.** The previous GitHub-connected
static SPA page (plus the retired Pages-Function bridge and the AppSail
supervisor `server.mjs`) is replaced: the Vite SPA ships as the static shell
and the Astro Node backend (`apps/backend`, standalone) runs inside the
Lightbase edge gateway — real Node, unmodified Astro standalone bundle.

## Architecture

- `tsc && vite build` → `dist/` (SPA static shell).
- `npm run build:backend` → `apps/backend/dist/server/entry.mjs` (Node SSR for `/api/*`).
- `lightbase-edge deploy` (postbuild) → assembles `dist_lb/` (Pages root):
  SPA assets at the root, the sha256-pinned SSR bundle under
  `_lb/careconnect/<hash>/`, and the bridge (`_redirects`, shell, `sw.js`).
- Cloudflare Pages serves static + bridge only; EVERY dynamic request is
  SSR'd by the Lightbase edge gateway through the preflight-free wire
  protocol v3.1 (`__lbjar`/`__lbmethod`/`__lbct` — zero custom headers).
- No CF Workers anywhere (`wrangler.toml` and `functions/` are legacy and
  inert). SSR env is sealed into the Lightbase manifest, re-deployable anytime.

## Wiring (applied)

- `package.json`: dependency `lightbase-edge`; `"build"` = SPA + backend;
  `"postbuild": "lightbase-edge deploy"`.
- `lightbase.edge.json`: entry `apps/backend/dist/server/entry.mjs`,
  clientDir `dist`, staticOut `dist_lb`.

## Required environment (CF Pages UI, editable)

| Variable | Purpose |
| --- | --- |
| `LIGHTBASE_URL` | Lightbase instance base URL |
| `LIGHTBASE_PROJECT_ID` | project id hosting the edge app (`careconnect`) |
| `LIGHTBASE_DEPLOY_TOKEN` | deploy-scope key (manifest PUT) |
| `LIGHTBASE_EDGE_ENV` | JSON string of the app's server-side env (sealed) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | platform admin seed (battle-test account) |
| `CF_PAGES_URL` | auto-set by Pages CI — origin of record |

Full template: `.env.example`.

## Deploy

```bash
npm ci
npm run build              # SPA + backend + lightbase-edge deploy
npx wrangler pages deploy dist_lb   # direct-upload projects only
```

## Operations

- `npx lightbase-edge status` / `npx lightbase-edge logs`
- Health: `<LIGHTBASE_URL>/health`
- Hash-versioned origin dirs → instant invalidation, free rollback.

## Enterprise posture

sha256 fail-closed pinning · RAM-reflex worker pool (graduated 72/85/92%
relief) · idle release to ~0 RAM · stuck-worker reaping + leak watchdogs ·
bounded queue with honest 429 · zero bundle bytes on the instance disk ·
hardened MemFS sandbox (no child_process/net/tls, no dlopen).
