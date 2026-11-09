# Design system

Direction: calm night-indigo (sleep/bedding), Vazirmatn, RTL-first, restrained decoration.

- **Tokens**: `src/styles/tokens.css` (radius, spacing, z-index, layout sizes) and `themes.css` (colours per theme). Tailwind 4 utilities (`bg-surface`, `text-muted`, `border-border`, `bg-primary`...) read these tokens via `@theme inline` in `tailwind.css`. Do not use raw hex in components.
- **Themes**: `[data-theme='light'|'dark']` on `<html>`. Preference `light|dark|system` is stored under `toshakino.appearance`; `public/theme-init.js` applies it before first paint. Appearance is independent from brand.
- **Brand (admin scope)**: `BrandService` writes `--brand-primary`, `--brand-secondary`, `--brand-primary-dark`, `--brand-secondary-dark` after login when the user has `brand.admin.read`. Invalid values are ignored; API failure keeps defaults.
- **Contrast**: primary/ink pairs target WCAG AA (light primary `#3f4c9a` on white, dark primary `#8c9bff` on `#0e1120`).
- **Accessibility floor**: skip link, visible `:focus-visible`, labelled inputs with `aria-invalid`, toast region with `aria-live`, reduced-motion respected.
- **Font**: Vazirmatn variable (OFL) is bundled in `src/assets/fonts`; no CDN.
- **Components so far**: button (`button[app-button]`), icon, toasts, appearance toggle. Tables, forms, dialogs, pagination, filters and empty/error/loading states arrive with the first feature that needs them (Phase 1).
