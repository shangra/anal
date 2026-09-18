# GIGACODE.md — Project Context

## Project Overview

**`adminpanel_ui_app`** (display name `adminpanel`) is a React-based **administrative panel frontend** that also serves as a **Module Federation host** to expose reusable micro-frontend components to other applications.

It is built on the "Sreda Frontend" core and acts as both:
1. A standalone admin UI for managing metadata, access matrix, inspectors, and user attributes.
2. A provider of shared React components (via Webpack 5 Module Federation) that can be consumed by remote micro-frontends.

### Key Technologies

| Area | Stack |
|---|---|
| Language | JavaScript + TypeScript (mixed) |
| UI Framework | React 18, React Router DOM v6 |
| Bundler | Webpack 5 via **CRACO** (Create React App override) |
| Micro-frontends | Webpack `ModuleFederationPlugin` + `@module-federation/typescript` |
| Styling | Bootstrap 5, Bootstrap Icons, SASS, custom `ui-kit` (vendored tarball `vendors/ui-kit/ui-kit-1.6.13.tgz`) |
| Forms | React Hook Form + Joi resolvers |
| Rich text | EditorJS + Draft.js |
| Tables / Data | React Data Grid, React Bootstrap, Recharts, ExcelJS |
| Flow / Diagrams | `@xyflow/react`, BPMN-JS, gridstack |
| State | `lite-react-statemanager` (lite + shared singleton) |
| Observability | OpenTelemetry (web SDK) |
| Testing | Jest + Testing Library (jest-junit reporter) |
| Docs / Dev | Storybook 7 |
| Code Quality | ESLint (airbnb + react-app + prettier), Prettier, Husky |

### Architecture Notes

- **Module Federation container name** (this app): `ADMINPANEL_UI_COMPONENTS` (env override: `MODULE_FEDERATION_CONTAINER_NAME`).
- **Exposed components** (defined in `craco.config.js` → `MODULE_FEDERATION_EXPORT_COMPONENTS`):
  - `MetadataHier`
  - `MetadataWindow`
  - `Inspector`
  - `InspectorWindow`
  - `AccessMatrixDrawer`
- **Shared singletons**: `react`, `react-dom`, `react-router-dom`, `lite-react-statemanager`.
- **Remote types**: Served by `@module-federation/typescript` into the `@mf-types/` directory on port `31000` (or `MF_TYPES_PORT`).
- **Component scaffolding system**: Each component lives in `src/components/<Name>/` with its own `package.json` containing a `codeName`. A custom build script (`scripts/buildSourceForTemplates.js`) scans all component `package.json` files and auto-generates aggregator files:
  - `src/components/index.js`
  - `src/components/constants.js`
  - `src/components/utilities.js`
  - `src/components/rootComponents.js`
  - `src/components/routes.js`
  These generated files are gitignored.
- **Path aliases** (TS + Webpack):
  - `helpers/*` → `src/helpers/*`
  - `components/*` → `src/components/*`
  - `ui/*` → `src/components/ui/*`
  - `*` → `./@mf-types/*` (MF remote types)

---

## Directory Layout

```
frontend-admin/
├── craco.config.js              # Webpack/CRACO config (Module Federation, aliases, polyfills, jest)
├── babel.config.js              # Babel preset for tests (env, react automatic runtime, TS)
├── tsconfig.json                # TS strict, baseUrl=src, paths, jsx=react-jsx
├── .eslintrc.js                 # ESLint: airbnb + react-app + prettier, TS parser
├── .prettierrc.json             # Prettier (4 spaces, single quotes, semi, trailing all)
├── Dockerfile.development       # Multi-stage: node:22 install/build → nginx:stable-alpine
├── public/                      # Static assets (index.html, manifest, favicon, service-worker)
├── scripts/                     # Build-time scripts (env loading, component scanning, MF config)
│   └── helpers/                 # Helpers for buildSourceForTemplates.js
├── vendors/
│   └── ui-kit/                  # Vendored `ui-kit` package (installed as tarball dependency)
└── src/
    ├── index.tsx                # Entry that imports './bootstrap' (dynamic import)
    ├── bootstrap.js             # Real React entry: createRoot, BrowserRouter, Bootstrap CSS/JS
    ├── App/
    │   ├── App.js               # Root component: ThemeProvider, SessionContext, Routes
    │   └── routes/
    │       ├── Home/index.tsx   # `/` — Landing with link to /adminpanel
    │       └── AdminPanel/index.js # `/adminpanel` — Mounts <AdminPanel />
    ├── components/              # ~60 component directories (each = own package.json)
    │   ├── AdminPanel/          # Main admin panel layout (MetadataWindow + InspectorWindow + AccessMatrixDrawer)
    │   ├── MetadataHier/        # Exposed via Module Federation
    │   ├── MetadataWindow/      # Exposed via Module Federation
    │   ├── Inspector/           # Exposed via Module Federation
    │   ├── InspectorWindow/     # Exposed via Module Federation
    │   ├── AccessMatrixDrawer/  # Exposed via Module Federation
    │   ├── ui/                  # Local UI primitives (aliased as `ui/*`)
    │   ├── UIKit/               # Wrappers around the vendored ui-kit
    │   ├── Helpers/, Errors/, HOC/, Header/, AuthForm/...
    │   ├── index.js             # AUTO-GENERATED (do not edit)
    │   ├── constants.js         # AUTO-GENERATED
    │   ├── utilities.js         # AUTO-GENERATED
    │   ├── rootComponents.js    # AUTO-GENERATED
    │   └── routes.js            # AUTO-GENERATED
    ├── pages/                   # Static-style pages (ApiError, DynPage)
    ├── settings/                # `settings.js` + `constants.js` (env-driven config)
    ├── helpers/                 # Generic helpers
    ├── css/, fonts/, images/    # Static assets
    ├── initState.js             # Initial app state for lite-react-statemanager
    ├── global.d.ts              # Ambient declarations for *.css, *.module.css, *.svg, *.png
    ├── react-app-env.d.ts       # CRA-generated React ambient types
    └── reportWebVitals.js       # Web Vitals reporting
```

---

## Building & Running

> All commands run from the project root. Node version (per Dockerfile): **Node 22.10** (Alpine). Uses `cross-env` / `cross-env-shell` to handle env vars cross-platform.

### Prerequisites

- Node.js 22.x recommended.
- Vendored `ui-kit` tarball present at `vendors/ui-kit/ui-kit-1.6.13.tgz` (installed via `file:` protocol in `dependencies`).
- For Docker: internal registry `sberosc.sigma.sbrf.ru/docker.io/...` is used.

### Common scripts

| Command | Purpose |
|---|---|
| `npm start` | Dev server. Wipes `build/` + `@mf-types/`, then runs `craco start` with `ESLINT_NO_DEV_ERRORS=true`. |
| `npm run startw` | Same as `start` but enforces ESLint errors. |
| `npm run start:debug` | Starts on `PORT=3100`, type server on `MF_TYPES_PORT=31000`, logs to `webpack.log`. |
| `npm run build` | Production build (HTTPS=true). |
| `npm run build:local` | Local production build without HTTPS. |
| `npm run build:analyze` | Production build + opens `webpack-bundle-analyzer` report. |
| `npm run buildssldev` | Builds into `adm_ui` with `PUBLIC_URL=/adm_ui`, verbose + debug. |
| `npm run storybook` | Storybook dev on port `6006` with debug webpack. |
| `npm run build-storybook` | Static Storybook build. |
| `npm test` | Jest watch mode via CRACO. |
| `npm run test:all` | Jest single run. |
| `npm run test:coverage` | Jest with coverage. |
| `npm run test:coverage:html` | Coverage report in HTML. |
| `npm run test:report:json` | Coverage + JSON report to `reports/`. |
| `npm run test:report:junit` | Coverage + JUnit XML. |
| `npm run ts-check` | `tsc --noEmit` type check. |
| `npm run eslint` | Auto-fix ESLint on given files (`$FILES` env var). |
| `npm run prettier` | Auto-format Prettier on given files. |
| `npm run refresh-module-federation-files` | `rm -rf build && rm -rf @mf-types`. |
| `npm run docker:ci` | `npm ci --legacy-peer-deps` (used inside Docker). |
| `npm run docker:start` | Same as `start`. |

### Environment variables

Set via shell or `.env` (loaded by `scripts/dotenv.js`):

| Var | Purpose | Default |
|---|---|---|
| `PUBLIC_URL` | Frontend URL prefix used by `BrowserRouter` basename | `''` |
| `REACT_APP_BACKEND_PREFIX` | Backend proxy prefix | `'/api'` |
| `REACT_APP_DOMAIN` | Domain prepended to backend/frontend URLs | `''` |
| `ESB_HOST` | Target host for the `/api` dev-server proxy | `'localhost:3001'` |
| `REFERER` | Referer header in proxy requests | `localhost:${PORT}` |
| `MODULE_FEDERATION_CONTAINER_NAME` | Override MF container name | `'ADMINPANEL_UI_COMPONENTS'` |
| `MF_TYPES_PORT` | Port for the MF types server | `31000` |
| `PORT` | Dev server port | `3000` |
| `DISABLE_ESLINT_PLUGIN=true` | Disable ESLint plugin during build | — |
| `BUILD_PATH` | Output directory for `buildssldev` | — |

### Docker

```bash
docker build -f Dockerfile.development -t adminpanel-ui:dev .
```

Build stages: install (`npm ci --legacy-peer-deps`) → build (`npm run build`) → nginx (serves `/usr/share/nginx/html`). Uses `docker/nginx/default.conf.template` for nginx config (must exist alongside the Dockerfile when running).

---

## Development Conventions

### Code style

- **Prettier** (`.prettierrc.json`):
  - 4 spaces, semicolons, single quotes (JS), double quotes (JSX), trailing commas `all`, print width 127.
- **ESLint** (`.eslintrc.js`):
  - Extends: `react/recommended`, `airbnb`, `prettier`, `react-app`, `react-app/jest`.
  - Parses TS via `@typescript-eslint/parser`.
  - Notable relaxations: `react/prop-types: off`, `import/order: off`, `import/no-cycle: off`, `react/destructuring-assignment: 0`, `react/function-component-definition: 0`, `react/prefer-stateless-function: 0`.
  - Notable enforcements: `react-hooks/rules-of-hooks: error`, `react-hooks/exhaustive-deps: warn`, `import/no-unresolved: error`.
  - Unused-vars ignore pattern: `^_`.
- **Husky** is installed via `prepare` script. Git hooks live under `.husky/_/`.

### Language conventions

- **Mixed JS/TS**: The repo allows both. Components are typically `.js`, but new code or types in `.ts`/`.tsx` is welcome. `tsconfig.json` includes `./src/**/*.ts` and `./src/**/*.tsx`; excludes `src/**/*.js`, `src/**/*.jsx`, and `src/**/FlowchartCMP`.
- **Class components** are heavily used throughout the legacy codebase (e.g., `App.js`, `AdminPanel`, route components). New code may use function components; the linter does not enforce either.
- **Imports**: Prefer path aliases (`components/...`, `helpers/...`, `ui/...`) over deep relatives.

### Component organization

Each component under `src/components/<ComponentName>/` is expected to ship a `package.json` with at least:

```json
{
    "codeName": "MyComponent",
    "main": "index.js",
    "rootComponent": true,            // optional — auto-mounted via RootComponents
    "routes": [...],                   // optional — auto-registered in routes.js
    "filenameWithConstantsForTemplate": "...",  // optional
    "filenameWithUtilitiesForTemplate": "..."   // optional
}
```

`scripts/buildSourceForTemplates.js` re-runs on every Webpack start and produces aggregator files. **Never edit these by hand** — they are gitignored:

- `src/components/index.js`
- `src/components/constants.js`
- `src/components/utilities.js`
- `src/components/rootComponents.js`
- `src/components/routes.js`

For Module Federation exposure, add a new entry to `MODULE_FEDERATION_EXPORT_COMPONENTS` in `craco.config.js`. The directory must contain a default-exported React component.

### Module Federation usage (this app = host)

```jsx
// Dynamic / lazy consumption of remote components is also supported via
// the runtime <ModuleFederationCMP> (used in remote apps; see README 2.md).
const LazyComp = React.lazy(() => import('remoteName/ExposedName'));
```

This app itself does **not** consume remote components in its bundle — it only exposes. If you need to consume remotes later, populate the `remotes: {}` field in `ModuleFederationConfigFactory` inside `craco.config.js`.

### TypeScript & Module Federation types

- Remote types are served to `@mf-types/` on port `31000` (overridable via `MF_TYPES_PORT`).
- The `*` TS path alias points at `./@mf-types/*`, so any imported remote component becomes strongly typed once its host is running.
- Run `npm run refresh-module-federation-files` to wipe `build/` and `@mf-types/` if types look stale.

### Testing

- Tests live alongside components (or in `__tests__` folders) using Jest + Testing Library.
- ESM packages that need transpilation by Jest are listed in `craco.config.js` (`jest.configure`) and include `lite-react-statemanager`, `axios`, `bpmn-js`, `@bpmn-io/*`, `diagram-js`, `moddle`, etc.
- Style and image imports are mocked (`identity-obj-proxy`, `<rootDir>/__mocks__/fileMock.js`).
- Coverage exclusions include: `src/components/MetadataGuideList/**`, `src/components/ui/**`, `src/components/UIKit/**`, `src/components/UiKitIcons/**`, `src/components/Utils/**`, all type-definition files (`*.d.ts`, `*.types.ts`, `I*.ts`, `interfaces.ts`, `*/types/**`, `*/@types/**`).

### Routing

Defined in `src/App/App.js`:

- `/` → `Home` (simple link to admin panel)
- `/adminpanel` → `AdminPanelPage` → `<AdminPanel />` (composes `MetadataWindow` + `InspectorWindow` + `AccessMatrixDrawer`)

`BrowserRouter` is mounted in `src/bootstrap.js` with `basename={FRONTEND_PREFIX_PROCESSED}` (derived from `PUBLIC_URL`).

### Error handling

`bootstrap.js` installs a global `error` listener that:
1. Logs to console.
2. Calls `e.stopImmediatePropagation()` to silence React's overlay.
3. Calls `e.preventDefault()` to suppress the browser's console error.

Keep this in mind when debugging — React's default error overlay is intentionally suppressed.

### State management

- Global state uses `lite-react-statemanager` (singleton across MF remotes).
- Initial state defined in `src/initState.js` (modal, flash, user, users/roles update markers, etc.).
- State keys intended to be user-data-dependent are listed in `userDataKeysDepended` inside `src/settings/settings.js`.

---

## Quick Recipes

### Add a new exposed component (Module Federation)

1. Create `src/components/MyComponent/` with a default-exported React component and a `package.json` containing at minimum `{ "codeName": "MyComponent", "main": "index.js" }`.
2. Add `{ dir: 'MyComponent' }` to `MODULE_FEDERATION_EXPORT_COMPONENTS` in `craco.config.js`.
3. Restart `npm start` so `buildSourceForTemplates.js` regenerates `components/index.js` and the MF manifest picks up the new expose.
4. (Optional) If your component should auto-mount globally, add `"rootComponent": true` to its `package.json` — it will be registered in `rootComponents.js`.

### Add a new route

- **Static**: Add a `package.json` with `"routes": [...]` (see existing components) — `buildRoutes` regenerates `components/routes.js`.
- **Direct**: Edit `src/App/App.js` `<Routes>` block for hard-coded routes.

### Run a single test file

```bash
npx craco test --watchAll=false path/to/file.test.tsx
```

### Type-check without emitting

```bash
npm run ts-check
```

### Reset Module Federation state

```bash
npm run refresh-module-federation-files
```

---

## Notes & Gotchas

- The base `README.md` is intentionally minimal (just `# adminpanel`). The authoritative in-repo documentation for **Module Federation** is **`README 2.md`**.
- `src/index.tsx` is a thin shim that performs a dynamic `import('./bootstrap')` — this is what enables `buildSourceForTemplates.js` to run **before** the React app boots.
- `webpackConfig.output.publicPath` is forced to `'auto'` to keep MF dynamic chunk loading correct across origins.
- `react-error-overlay` is pinned via `resolutions` to `6.0.9` to avoid breaking changes.
- `crypto-browserify`, `stream-browserify`, and `path-browserify` are wired up via `resolve.fallback` because several deps (e.g. `node-polyfill-webpack-plugin`) assume Node built-ins.
- The Dockerfile uses an internal Sber container registry (`sberosc.sigma.sbrf.ru/docker.io/...`) — change the `FROM` lines if building outside that environment.
- `jestSonar.reportFile` is set to `sonar-report.xml` for CI/SonarQube integration.
