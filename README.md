# Toshakino Admin Panel (پنل مدیریت تشکینو)

Angular 22 admin SPA for the Tashkino store. Independent from the storefront; talks only to the FastAPI backend (`/api/v1`).

## Quick start

```bash
nvm use            # Node 22
npm ci
npm start          # http://localhost:4200
npm run verify     # lint + typecheck + cycles + unit tests + production build
```

Runtime config lives in `public/config.json` (served as `/config.json`, never cached). Change `apiBaseUrl` per environment **without rebuilding**.
For local work against a local API set `"apiBaseUrl": "http://localhost:8000/api/v1"` (plain http is accepted for localhost only).

## Docs

| Doc | Content |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Layers, import rules, folder layout |
| [docs/security.md](docs/security.md) | Token handling, RBAC, CSP, what the UI does *not* guarantee |
| [docs/design-system.md](docs/design-system.md) | Tokens, themes, RTL, brand variables |
| [docs/testing.md](docs/testing.md) | What is tested and how |
| [docs/deployment.md](docs/deployment.md) | Docker/nginx, runtime config, CSP |
| [docs/backend-dependencies.md](docs/backend-dependencies.md) | **Assumed API contract + open questions for the backend** |
| [docs/progress.md](docs/progress.md) | Phase status |
