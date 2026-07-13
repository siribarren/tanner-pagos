# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Design/prototyping repo for a payment reconciliation and debt-collection engine for **Tanner**
("motor de pagos" — gestión, reliquidación y cuadratura de pagos). There is no backend and no
real data integration; everything is a client-side, click-through UI prototype backed by mock
data. The functional target is described in two requirement docs under `docs/requirements/`:
`requerimiento_plataforma_pagos_tanner.md` (the broader, more current one — full flow, the 8
required screens in its §14, roles/permissions, the cuadratura rule engine) and
`requerimiento_motor_pagos_tanner_optimizado.md` (narrower, focused on the reliquidación engine
itself). Read the former before proposing new screens or flows; it defines the business
vocabulary the UI must match — **"compromiso de pago" (`CP-...`), not "acuerdo"** — plus the
business rules (tolerancia $10.000, imputación a mora vs. SAF, Mónaco como fuente de verdad,
excepciones) the UI is meant to reflect.

## Repo layout — three generations of the same prototype

- **`prototipo/`** — the active prototype. Vite + React 18 + TypeScript, exported from Figma
  Make. This is the one to work on unless told otherwise.
- **`frontend/`** — an older static HTML/CSS/vanilla-JS prototype. Root `index.html` redirects
  here. Kept for reference; not the active target.
- **`legacy/`** — an even earlier vanilla-JS prototype (`app.js`, `styles.css`), superseded by
  the other two. Reference only.
- **`docs/`** — requirements docs, meeting reports (PDF), and design assets (Figma/Stitch
  exports) that explain *why* the UI looks and behaves the way it does.
- **`sample-data/`** — real example artifacts (comprobantes de transferencia, cartolas bancarias
  `.xlsx`, avisos `.eml`, capturas de pantalla) that the reconciliation flow is meant to handle.
  Useful as ground truth when building/mocking parsing or matching logic.

## Running the app

From repo root:

```bash
./start.sh
```

This installs `prototipo`'s deps on first run and starts the Vite dev server at
`http://127.0.0.1:5173/`. Equivalent manual commands from `prototipo/`:

```bash
npm install
npm run dev      # dev server
npm run build    # production build -> prototipo/dist
```

There is no lint or test script configured in `prototipo/package.json` — don't assume `npm test`
or `npm run lint` exist.

The lockfile present is `package-lock.json` (npm), even though a `pnpm-workspace.yaml` also
exists (leftover from the Figma Make export, pinned to linux glibc — not meaningful for local
dev on macOS). Use npm.

## Architecture of `prototipo/`

- Single entry point `src/main.tsx` mounts `src/app/App.tsx`.
- **`App.tsx` is only the root orchestrator** (login/session state, active `Screen`, active
  `Rol`, sync-modal state) — it is not the whole app. Screens live one-per-file under
  `src/app/screens/`, and shared pieces are split into their own modules:
  - `src/app/theme.ts` — colors (`C`), fonts (`FONT_UI`/`FONT_MONO`), `clp()` currency
    formatter, and the `STATUS` map that drives `Badge` colors/labels.
  - `src/app/types.ts` — `type Screen`, `type Rol` ("ejecutivo" | "supervisor").
  - `src/app/ui.tsx` — shared UI atoms: `Badge`, `Chip`, `Btn`, `TopBar`, `Card`, `ReceiptThumb`.
  - `src/app/Shell.tsx` — persistent sidebar/topbar chrome, the `NAV` menu config (each item
    declares which `Rol`s can see it), and the profile block (name/role chip toggle + "Salir").
  - `src/app/LoadingDataModal.tsx` — the simulated Mónaco-sync modal (`SYNC_STEPS` +
    `setTimeout`-driven progress, not a real fetch).
  - `src/app/data.ts` — the few genuinely cross-screen mocks (`CUOTAS`, `PERFIL_BASE`).
- There is no router — `react-router` is a dependency but unused; navigation is a plain
  `useState<Screen>` in `App.tsx`, passed down as a `navigate` callback prop.
- `type Screen` (in `types.ts`) has ten values: `login`, `panel`, `buscar`, `compromiso_nuevo`,
  `compromiso`, `comprobante`, `matching`, `cuadratura`, `excepciones`, `auditoria`. These map to
  the screens in `docs/requirements/requerimiento_plataforma_pagos_tanner.md` §14 (búsqueda de
  cliente, creación de compromiso, carga de comprobante, matching, cuadratura, bandeja
  supervisora, auditoría, dashboard).
- **Role-gated navigation**: `type Rol = "ejecutivo" | "supervisor"` lives in `App.tsx` state and
  is toggled from the sidebar profile block (`Shell.tsx`). `Panel` (the landing screen) renders
  different content per role — "mi día" for ejecutivo vs. a KPI dashboard for supervisor.
  `buscar`/`compromiso_nuevo`/`compromiso`/`comprobante`/`matching`/`cuadratura` are
  ejecutivo-only; `excepciones`/`auditoria` are supervisor-only. Switching role while on a
  screen the new role can't see resets to `panel` (see `changeRol` in `App.tsx`).
  There is only one simulated identity (same name, different role label) — this is a role
  *preview* toggle for demoing permissions, not a second login.
- Each screen file keeps its own local mock data arrays (e.g. `CASOS_INICIALES` in
  `Excepciones.tsx`, `EVENTOS` in `Auditoria.tsx`) rather than a shared "mock backend" — there is
  no referential integrity enforced between screens' mock data.
- `src/app/components/ui/` holds a full shadcn/radix component library scaffold from the Figma
  Make export, but the screens mostly do **not** use it — they hand-roll inline-styled
  components via `ui.tsx` instead. Check what's actually imported before assuming a shadcn
  component is in play.
- `figma:asset/...` imports are resolved to `src/assets/` via a custom Vite plugin
  (`figmaAssetResolver` in `vite.config.ts`) — keep that in mind if imports look unusual.
- Path alias `@` → `prototipo/src`.
- Styling: Tailwind v4 via `@tailwindcss/vite`, plus `src/styles/*.css` (globals, theme, fonts)
  and heavy use of inline `style={{...}}` objects directly in each screen/component.
- No `tsconfig.json` or `vite-env.d.ts` exists in `prototipo/` — there is no real TypeScript
  type-checking step (not even via `npm run build`, which only runs Vite's esbuild transform).
  Don't assume a `tsc`-based check will run in CI; verify changes by building and clicking
  through the app.
