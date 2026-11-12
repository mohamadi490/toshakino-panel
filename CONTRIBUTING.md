# Contributing / workflow

- `main` is always releasable (`npm run verify` green). Never commit to it directly.
- One branch per feature: `feature/<kebab-name>` (fixes: `fix/<name>`, docs: `docs/<name>`, chores: `chore/<name>`).
- Conventional commits: `feat(scope): ...`, `fix(scope): ...`, `docs: ...`, `chore: ...`, `test: ...`. Small, reviewable commits.
- Before pushing: `npm run verify` (lint, typecheck, cycles, tests, production build).
- Open a pull request into `main` using the template; CI must pass; squash or rebase merge.
- New feature checklist lives in `docs/architecture.md` (permission-guarded routes, nav entry, `*appCan`, tests for loading/empty/error/forbidden/happy paths) and any new API assumption goes in `docs/backend-dependencies.md`.
