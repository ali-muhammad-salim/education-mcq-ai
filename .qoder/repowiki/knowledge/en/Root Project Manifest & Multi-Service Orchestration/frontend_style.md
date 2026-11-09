## Approach

The Next.js app (`app/`) styles itself with plain CSS files (no Tailwind, no SCSS) and a dedicated scoped design system. There is also a separate Vite-based frontend under `frontend/` that is unrelated to the main site's styling.

### Global theme: `app/globals.css`

- Defines the AKU Green palette as CSS custom properties on `:root`: `--bg-color`, `--text-color`, `--primary-color` (`#0b5e4a`), `--secondary-color` (`#c9a050`), `--accent-color`, `--card-bg`, plus shadow/radius/transition scales.
- Dark mode is toggled via `html.dark` / `[data-theme="dark"]` — the root layout injects a small inline script that reads `localStorage('riselearner_theme')` and applies both a class and a data attribute before hydration.
- Includes Google Fonts (Inter, Outfit) and KaTeX (`@import 'katex/dist/katex.min.css'`).
- Contains very broad dark-mode overrides using attribute selectors like `[class*="card"]` and `[style*="background: #ffffff"]` to force cards/modals into the dark palette; this is what the scoped design system must work around.

### Scoped design system: `app/design-system.css`

Named "Marked Script" in its header comment, it defines a second token set under the `.rise-ui` scope:

- Surface tokens: `--r-paper`, `--r-surface`, `--r-surface-sunk`, `--r-rule`, `--r-rule-strong`.
- Ink tokens: `--r-ink`, `--r-ink-muted`, `--r-ink-faint`.
- Semantic accent tokens: `--r-emerald`, `--r-teal`, `--r-mint`, `--r-subject`, `--r-insight`, `--r-wrong`, `--r-flag`, `--r-right` plus matching `*-wash` variants.
- Typography tokens: `--r-font-display` (Bricolage Grotesque), `--r-font-body` (Inter), `--r-font-mono` (JetBrains Mono); font-size scale from `--r-text-xs` to `--r-text-5xl`.
- Spacing scale based on 4px (`--r-1` … `--r-9`).
- Radius scale: `--r-radius-sm` (6px), `--r-radius` (10px), `--r-radius-lg` (16px), `--r-radius-full` (999px).
- Shadow scale and motion tokens (`--r-fast`, `--r-base`, `--r-slow`, `--r-ease`).
- A dark-mode block under `html.dark .rise-ui` / `:root.dark .rise-ui` redefines every token.
- Opt-outs for tables so they stay transparent under globals.css's blanket table overrides.

### Mobile breakpoints: `app/mobile.css`

Three media-query ranges are used: `≤1024px`, `≤700px`, and `≤370px`. It handles:
- Collapsible mobile navigation (`site-nav.mobile-open`), 44px minimum touch targets, safe-area insets.
- Grid collapse, scrollable quiz modals, responsive typography via `clamp()`.
- A skip-link for accessibility.

### Component-scoped CSS modules

Components under `components/` use local CSS modules (e.g. `KnowledgeReview.module.css`, `Study.module.css`, `MaterialLayout.module.css`, `LegacyPaperChecks.module.css`). The `components/rise/` subfolder contains three CSS modules (`quiz.module.css`, `home.module.css`, `discovery.module.css`) whose comments explicitly state they inherit from `design-system.css` via the `.rise-ui` wrapper.

### Token source of truth

`data/design_system.json` holds a separate, legacy-style JSON manifest of design tokens (typography body/header sizes, colors, layout bullet characters). It appears to be consumed by backend ingestion/presentation code rather than the frontend CSS.

## Key files

- `app/layout.tsx` — imports `globals.css`, `mobile.css`, `design-system.css`; injects the theme-toggle script.
- `app/globals.css` — global theme tokens, dark-mode overrides, base resets, font imports.
- `app/design-system.css` — scoped Rise Learner design system under `.rise-ui`.
- `app/mobile.css` — phone/tablet breakpoint rules.
- `components/rise/` — CSS modules (`quiz.module.css`, `home.module.css`, `discovery.module.css`) scoped to `.rise-ui`.
- `components/SubjectMaterials.tsx` — renders the `<div className="rise-ui">` wrapper.
- `components/TakeQuizModal.tsx` — applies `rise-ui` to modal overlays.
- `data/design_system.json` — JSON design-token manifest.
- `tests/design-system-scope.test.ts` — enforces the scoping contract.

## Architecture and conventions

1. **Two-layer theming.** `globals.css` owns the global AKU Green + dark-mode surface palette. `design-system.css` owns a second, isolated token layer for the "Rise Learner" UI surface, deliberately avoiding overlap with globals by prefixing everything under `.rise-ui`.
2. **CSS custom properties over classes.** Both layers express colors, spacing, radius, and typography as `--var` variables; components consume them via `var(--...)` rather than hard-coded hex values.
3. **Dark mode via class + data attribute.** The runtime toggles both `html.dark` and `html[data-theme="dark"]`; CSS selectors cover both forms for resilience.
4. **Scoped isolation for the protected view.** The Digital Paper / Past Papers view renders alongside user content and must not be affected by `design-system.css`. The rule is enforced by tests that parse all selectors in `design-system.css` and the `components/rise/*.css` modules and reject any selector not starting with an allowed prefix (`.rise-ui`, `[data-rise]`, `:where(.rise-ui)`, `html.dark .rise-ui`, `:root.dark .rise-ui`).
5. **No bare `card` class names inside the rise zone.** Because `globals.css` contains `[class*="card"]` dark-mode overrides, any class containing the substring `card` would be force-painted. The test scans all rise CSS files for such names and fails the build if found.
6. **Rise CSS modules must be hashed.** The test asserts that every file under `components/rise/` ends in `.module.css`; there are no plain `.css` files there, ensuring generated class names cannot leak into the global namespace.
7. **No bare element selectors in CSS modules.** The test rejects selectors without a `.` (except keyframe steps `from`/`to`/percentages), forcing module-scoped selectors even inside `@keyframes`.
8. **Mobile-first breakpoint policy.** Breakpoints at 1024px, 700px, and 370px are the only ones used in `mobile.css`, with 44px minimum touch targets and safe-area padding throughout.

## Conventions and constraints

- Every selector in `app/design-system.css` and `components/rise/*.css` must be nested under `.rise-ui` or `[data-rise]` — enforced by `tests/design-system-scope.test.ts` which parses raw CSS and asserts zero unscoped selectors.
- No class name may contain the substring `card` anywhere inside the rise zone — enforced by the same test scanning all rise CSS files.
- All `components/rise/` style files must be CSS modules (`.module.css`) — enforced by the test asserting no non-module CSS exists there.
- CSS modules under `components/rise/` must not emit bare element selectors — enforced by the same test rejecting selectors without a `.`.
- Theme toggling happens through the `dark` class and `data-theme` attribute on `<html>` — established by the inline script in `app/layout.tsx`.
- Global color tokens live exclusively in `:root` of `app/globals.css`; rise-specific tokens live exclusively under `.rise-ui` in `app/design-system.css`.
- Responsive behavior uses three fixed breakpoints (1024px, 700px, 370px) defined in `app/mobile.css`.