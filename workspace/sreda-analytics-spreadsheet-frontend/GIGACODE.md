# Sreda BI Spreadsheet Frontend — Project Context

## Project Overview

**Sreda BI Spreadsheet Frontend** (`sreda-bi-spreadsheet-frontend`) is a React-based business intelligence (BI) dashboard application, developed for Sber (СБЕР). It provides a spreadsheet-like interface for data analysis, reporting, and visualization, with rich text editing capabilities via Editor.js integration.

The application is part of the larger **Sreda BI** ecosystem and uses **Module Federation** to expose and consume remote components across micro-frontend boundaries. It relies on a vendored internal `ui-kit` package for shared UI components and theming.

### Key Technologies

- **Framework:** React 18 (TypeScript)
- **Build Tool:** CRA via CRACO (Create React App Conflict Resolution)
- **Module Federation:** Webpack 5 Module Federation (host container: `BI_UI_COMPONENTS`)
- **Styling:** SCSS + `ui-kit` design system (light / dark / galaxy themes)
- **Routing:** React Router DOM v6
- **State Management:** `lite-react-statemanager`
- **Rich Text Editing:** Editor.js with multiple blocks (table, image, code, quote, etc.)
- **Charts:** Recharts
- **Data Grid:** React Data Grid
- **HTTP Client:** Axios
- **Testing:** Jest + React Testing Library
- **Component Documentation:** Storybook v7
- **Linting / Formatting:** ESLint (Airbnb + Prettier) + Husky pre-commit hooks

### Architecture Highlights

- **Module Federation Host:** Exposes `AdapterSpreadSheet`, `SpreadSheetPlugins`, `SpreadSheetTables`, and `TableAdapters` as remote modules. Consumes remote types via `@module-federation/typescript`.
- **Three Main Routes:**
  - `/` — Home page
  - `/cube` — Cube/OLAP data exploration
  - `/report` — Report builder/viewer
- **Theme System:** Three built-in themes (Light, Dark, Galaxy) with OS auto-detection support.
- **Proxy:** API requests to `/api/*` are proxied to a backend at `localhost:3001` (configurable via `ESB_HOST`).
- **Vendored UI Kit:** Internal `ui-kit` distributed as a `.tgz` file in `vendors/ui-kit/`. Supports a `UI_KIT_DEBUG=true` dev mode that points to source files directly.

---

## Building and Running

### Prerequisites

- Node.js 22+
- npm (with `.npmrc` for internal package registry access)

### Local Development

```bash
# Install dependencies
npm ci

# Set environment (optional — defaults shown below)
export PORT=3503
export ESB_HOST=localhost:3001
export MF_TYPES_PORT=30300

# Start dev server
npm start

# Start with module federation debug logging
npm run start:debug

# Start Storybook (component playground)
npm run storybook
```

The dev server runs on port **3503** by default (overridable via `PORT` env var), serves on `0.0.0.0`, and proxies `/api` requests to the configured backend.

### Building for Production

```bash
# Standard production build (output to bi_ui_build/)
npm run build

# Local build (no ESLint checks)
npm run build:local

# Analyze bundle size
npm run build:analyze
```

### Docker

```bash
docker build \
  -f Dockerfile.development \
  --secret id=npmrc,src=<PATH_TO_NPMRC>/.npmrc \
  --build-arg PORT=3030 \
  --no-cache \
  -t sreda1116-frontend:latest .

docker run \
  -d \
  --env-file .env \
  -v "$(pwd)/:/app" \
  -v /app/node_modules \
  -p 3030:3030 \
  -p 30300:30300 \
  --add-host host.docker.internal:host-gateway \
  --name sreda1116-frontend \
  sreda1116-frontend:latest
```

### Testing

```bash
# Run tests (matches src/**/*.{spec,test}.{ts,tsx})
npm test
```

### Storybook

```bash
# Start Storybook dev server on port 6006
npm run storybook

# Build Storybook static
npm run build-storybook
```

---

## Development Conventions

### Code Style

- **Language:** TypeScript (strict mode) + some `.js` / `.jsx` legacy files.
- **Linting:** ESLint with Airbnb + Prettier + `@typescript-eslint` + `simple-import-sort`.
- **Formatting:** Prettier (configured via `.prettierrc`).
- **Imports:** Sorted automatically via `simple-import-sort`; no explicit import extensions needed.
- **React:** Functional components preferred; class components still present (e.g., `App.tsx`). Prop-types disabled in favor of TypeScript.

### Linting & Pre-commit

- Husky manages Git hooks (configured in `.husky/`).
- Run linting / type checks manually:
  ```bash
  npm run eslint   # Lint and auto-fix
  npm run prettier # Format files
  npm run ts-check # TypeScript type-check only
  ```

### AdapterSpreadSheet Documentation Requirement

When planning or developing anything under `src/components/AdapterSpreadSheet/`, **always read the documentation first**:

```
src/components/AdapterSpreadSheet/docs/
├── 00_INDEX.md                    # Entry point — index of all docs
├── 01_ARCHITECTURAL_BLUEPRINT.md  # System architecture, component relationships
├── 02_STATE_LIFECYCLE.md          # State management patterns, data flow
├── 03_REPOSITORY_MAP.md           # Codebase navigation map
├── 04_CODESMITHING_RULES.md       # Coding standards and patterns
├── 05_RECIPES.md                  # Common implementation patterns / how-to
└── 06_REAL_WORLD_PATTERNS.md      # Production usage examples
```

- Read the relevant docs **before** writing code, proposing architecture, or making design decisions for `AdapterSpreadSheet`.
- Follow `04_CODESMITHING_RULES.md` for coding standards and `05_RECIPES.md` / `06_REAL_WORLD_PATTERNS.md` for implementation patterns.
- If a doc seems outdated or incomplete, note it — but still treat it as the source of truth until confirmed otherwise.

### File Structure

```
src/
├── entry.js                    # App entry point (renders App in BrowserRouter)
├── index.tsx                   # Bootstrap (lazy-loads entry.js)
├── App/
│   ├── App.tsx                 # Root component (routing, theming, state)
│   └── routes/
│       ├── Home/               # Home page
│       ├── Cube/               # Cube/OLAP exploration page
│       └── Report/             # Report builder/viewer page
├── components/
│   ├── AdapterSpreadSheet/     # Spreadsheet adapter (Module Federation export)
│   ├── SpreadSheetPlugins/     # Spreadsheet plugin system (export)
│   ├── SpreadSheetTables/      # Table components (export)
│   ├── TableAdapters/          # Table adapters (export)
│   ├── AuthForm/               # Authentication form
│   ├── ErrorBoundary/          # React error boundary
│   ├── FilterComplexCMP/       # Filter UI components
│   ├── Loader/                 # Loading spinner
│   ├── SessionContext/         # Session management context
│   ├── ThemeSwitchAgent/       # Theme switcher
│   └── ui/                     # Generic UI primitives
├── helpers/                    # Utility functions (axios wrapper, formatters, etc.)
├── settings/
│   ├── constants.js            # App-wide constants
│   └── settings.js             # Environment-based settings
├── css/                        # Global styles
├── fonts/                      # Custom fonts
├── images/                     # Static images
└── vendors/                    # Vendored dependencies (ui-kit)
```

### Module Federation Details

- **Host Container Name:** `BI_UI_COMPONENTS`
- **Exposed Modules:** Located under `src/components/AdapterSpreadSheet`, `SpreadSheetPlugins`, `SpreadSheetTables`, `TableAdapters`.
- **Shared Dependencies:** `react`, `react-dom`, `react-router-dom`, `lite-react-statemanager` (all singleton).
- **Remote Types:** Generated into `@mf-types/` directory during build. Served on port `MF_TYPES_PORT` (default 30300).
- **Cleanup:** Run `npm run refresh-module-federation-files` to regenerate federation types and clear stale artifacts.

---

## Configuration Files

| File | Purpose |
|------|---------|
| `craco.config.js` | Webpack/CRACO config: Module Federation setup, dev server proxy, bundle naming, UI kit debug mode |
| `tsconfig.json` | TypeScript: strict mode, ES2020 target, JSX `react-jsx`, `bundler` module resolution |
| `.eslintrc.js` | ESLint rules (Airbnb + Prettier + TS + React), import sorting |
| `jest.config.js` | Jest: jsdom environment, CSS/file mocks, transforms JS/TS/TSX via babel-jest |
| `babel.config.js` | Babel presets for React, modern JS, and TypeScript |
| `Dockerfile.development` | Alpine-based Node 22 Docker image for containerized development |
| `package.json` | Dependencies, scripts, browserlist, overrides (tar, react-error-overlay) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3503` | Dev server port |
| `ESB_HOST` | `localhost:3001` | Backend API target for `/api` proxy |
| `MF_TYPES_PORT` | `30300` | Module Federation remote types server port |
| `PUBLIC_URL` | `/` | Public URL base path |
| `UI_KIT_DEBUG` | `false` | When `true` in dev, points to ui-kit source instead of tgz |
| `HTTPS` | `true` (in build) | Enable HTTPS for dev server / build |
