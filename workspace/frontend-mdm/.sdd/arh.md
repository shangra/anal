# Архитектура проекта frontend-mdm

`frontend-mdm` (npm-имя `mdm_ui_app`, отображаемое имя **MDM UI Application**) — это React-приложение **модуля управления метаданными платформы SREDA**, которое одновременно является:

1. **Самостоятельным UI** модуля MDM (Master Data Management).
2. **Хостом Module Federation** — экспортирует переиспользуемые React-компоненты (микрофронтенды) из директорий `MDM` и `Flowdemo` для встраивания в другие приложения экосистемы.

Проект построен на ядре «Sreda Frontend» и распространяет общие компоненты по технологии Micro Frontends. Для удобства разработки и документирования компонентов подключён Storybook.

## Ключевые особенности платформы

- **Компонентная архитектура** — каждая функциональная единица живёт в `src/components/<ComponentName>/` как отдельная директория со своим `package.json`. Это позволяет изолировать разработку, тестирование и публикацию отдельных компонентов.
- **Module Federation Host** — приложение экспортирует ограниченный, явно заданный список директорий компонентов (`craco.config.js` → `MODULE_FEDERATION_EXPORT_COMPONENTS`). Каждая директория (`MDM`, `Flowdemo`) раскрывается в плоский набор `exposes` через хелпер `processModuleExportComponentsConfig`. Экспорт меняется только через этот реестр.
- **Согласованные синглтоны** — общие библиотеки (`react`, `react-dom`, `react-router-dom`, `lite-react-statemanager`) шарятся как singletons, чтобы состояние корректно пересекало границы host/remote.
- **Каждый компонент = мини-пакет.** В `package.json` компонента описывается `codeName`, точка входа (`main`), признак авто-монтирования (`rootComponent`), роуты (`routes`), а также опциональные `filenameWithConstantsForTemplate` / `filenameWithUtilitiesForTemplate`. Сборочный скрипт `scripts/buildSourceForTemplates.js` сканирует все `package.json` и генерирует агрегаторы.
- **Сгенерированные файлы** (`src/components/index.js`, `constants.js`, `utilities.js`, `rootComponents.js`, `routes.js`) — артефакты сборки, никогда не редактируются вручную и попадают в `.gitignore` (на практике регенерируются при каждом запуске `npm start` / `npm run build`).
- **Политика изменения чужого компонента** — код уже опубликованного MF-компонента не правится напрямую в этом репо, если изменение нужно downstream-потребителю. Корректировка оформляется как PR в этот репозиторий и выпускается новой версией образа/бандла.

## Технологический стек

| Область | Стек |
| --- | --- |
| Язык | JavaScript + TypeScript (mixed, `allowJs: true`) |
| UI-фреймворк | React 18.2.0, React Router DOM 6.0.2 |
| Сборщик | Webpack 5 через **CRACO** 7.1.0 (override над Create React App 5.0.1) |
| Микро-фронтенды | Webpack `ModuleFederationPlugin` + `@module-federation/typescript` 3.1.3 (`FederatedTypesPlugin`) |
| Стили | Bootstrap 5.3.0, Bootstrap Icons, SASS, внутренний `ui-kit` 1.6.8 (tarball из `vendors/`) |
| Темизация | `ui-kit` ThemeProvider (`GALAXY_THEME` по умолчанию, также `DARK_THEME`) |
| Формы | React Hook Form 7.x + Joi resolvers (`@hookform/resolvers`) |
| Rich-text / визуальные редакторы | EditorJS + Draft.js + DraftJS-to-HTML |
| Таблицы и данные | React Data Grid 7 beta, React Bootstrap, Recharts, ExcelJS |
| Графы / диаграммы / canvas | `@xyflow/react` 12.x, BPMN-JS (`bpmn-js`), gridstack 5.x |
| Состояние | `lite-react-statemanager` 1.0.7 (singleton) |
| HTTP | axios 1.9.0, обёртка `src/helpers/axios.jsx` |
| Observability | OpenTelemetry (web SDK: trace-web, exporter `otlp-http`, instrumentations `fetch`/`xml-http-request`/`document-load`/`user-interaction`) + `web-vitals` |
| Тестирование | Jest + Testing Library (`jest-junit` репортер) |
| Документация / DX | Storybook 7.6.19 (скрипты `storybook`, `build-storybook`) |
| Качество кода | ESLint 8 (`react-app` + `react-app/jest` + `airbnb` + `prettier` + `plugin:react/recommended`, TS parser), Prettier, Husky 9 |

## Репозиторий frontend-mdm

Целевой сервис — SPA модуля MDM. Один репозиторий, один npm-пакет (`mdm_ui_app`), один Dockerfile (`Dockerfile.development`). Разрабатывается в этом репо; публикуется как Docker-образ (`sberosc.sigma.sbrf.ru/...`) для развёртывания за nginx.

### Файловая структура (верхний уровень)

```text
frontend-mdm/
├── craco.config.js              # Webpack/CRACO: MF, алиасы, полифиллы, jest
├── babel.config.js              # Babel preset для тестов (env, react automatic runtime, TS)
├── tsconfig.json                # TS strict, target es2015, paths * -> ./@mf-types/*, jsx=react-jsx
├── .eslintrc.js                 # ESLint: airbnb + react-app + react/recommended + prettier, TS parser
├── .prettierrc.json             # Prettier (4 spaces, single quotes, semi, trailing all, width 127)
├── Dockerfile.development       # Multi-stage: node:22.10-alpine3.19 install/build → nginx:stable-alpine-slim
├── public/                      # Статика (index.html, manifest, favicon, service-worker, images)
├── scripts/                     # Сборочные скрипты (env, dotenv, cryptoEnv, сканирование компонентов, MF config)
│   ├── buildSourceForTemplates.js
│   ├── cryptoEnv.js
│   ├── dotenv.js
│   └── helpers/                 # buildConstantsAndUtilities, buildReactComponents, buildRootComponents,
│                                #   buildRoutes, scanDir, checkIfFileExists, getTreeAST, removeTypeDefinitions,
│                                #   getFileExtension, moduleFederationConfigProcessor
├── vendors/
│   └── ui-kit/                  # Внутренний ui-kit (tgz-зависимость: ui-kit-1.6.8.tgz, рядом ui-kit-1.6.7.tgz)
└── src/
    ├── index.tsx                # Тонкий шим, динамически импортирующий bootstrap
    ├── bootstrap.js             # Точка входа React: createRoot, BrowserRouter, Bootstrap CSS/JS
    ├── App/                     # Корневой компонент + роутинг (/, /mdm)
    │   ├── App.js
    │   ├── App.css
    │   └── routes/
    │       ├── Home/index.tsx
    │       └── MDM/index.js
    ├── components/              # Директории-компоненты (каждая = свой package.json): Mo, Errors, Features,
    │                            #   Loader, MetadataForms, ModalDetailedError, PageHeader, SessionContext,
    │                            #   ThemeSwitchAgent, ui, UIKit, UiKitIcons
    ├── settings/                # env-driven конфигурация (settings.js)
    ├── helpers/                 # Общие хелперы (axios.jsx, console.js, ...)
    ├── css/, fonts/, images/    # Статические ассеты
    ├── vendors/                 # Локальные vendored-ресурсы
    ├── initState.js             # Начальное состояние lite-react-statemanager
    ├── global.d.ts              # Амбиент-декларации (*.css, *.module.css, *.svg, *.png)
    └── react-app-env.d.ts       # CRA-env-типы
```

> **Примечание.** В текущем снимке репозитория отсутствуют `src/pages/` и `.storybook/`. Конфигурация Storybook добавляется по мере необходимости; пути и скрипты (`npm run storybook` / `npm run build-storybook`) уже определены в `package.json` и `craco.config.js`.

## Структура директории `src/components`

Это «сердце» кодовой базы. Каждый компонент живёт в собственной поддиректории и **обязан** содержать `package.json` со следующими полями:

```json
{
    "name": "Mo",
    "version": "1.0.0",
    "typeSBR": "ReactCMS",
    "codeName": "Mo",
    "lazy": false,
    "rootComponent": false,
    "main": "index.js",
    "filenameWithConstantsForTemplate": "",
    "filenameWithUtilitiesForTemplate": "",
    "dependenciesReactCMS": {},
    "dependenciesNodeCMS": {},
    "extensions": {}
}
```

| Поле | Назначение |
| --- | --- |
| `codeName` | Регистрационное имя компонента в сгенерированных агрегаторах. |
| `main` | Точка входа для агрегаторов (по умолчанию `index.js`, встречается `index.tsx`). |
| `rootComponent: true` | Компонент автоматически монтируется на верхнем уровне (через `RootComponents` в `src/App/App.js`). |
| `routes: [...]` | Маршруты, которые попадают в `components/routes.js`. |
| `filenameWithConstantsForTemplate` | Имя файла с константами, который будет собран в общий `constants.js`. |
| `filenameWithUtilitiesForTemplate` | Имя файла с утилитами, который будет собран в общий `utilities.js`. |
| `typeSBR`, `lazy`, `dependenciesReactCMS`, `dependenciesNodeCMS`, `extensions` | Служебные поля платформы SREDA CMS (для совместимости с шаблонами и роутингом). |

Реальные эталоны `package.json` в репо: `src/components/Mo/package.json`, `src/components/PageHeader/package.json` (`main: index.tsx`).

### Агрегаторы, которые генерирует `scripts/buildSourceForTemplates.js`

Каждый запуск Webpack прогоняет сканер и обновляет (при необходимости) следующие файлы:

- `src/components/index.js` — реэкспорт всех компонентов (используется в `bootstrap.js` для инициализации).
- `src/components/constants.js` — объединение констант компонентов.
- `src/components/utilities.js` — объединение утилит компонентов.
- `src/components/rootComponents.js` — авто-монтируемые компоненты (`RootComponents`).
- `src/components/routes.js` — массив роутов для `react-router-dom`.

> **Важно.** Эти файлы попадают в `.gitignore`. Если вы видите пустые или устаревшие агрегаторы — выполните `npm run refresh-module-federation-files` или просто перезапустите `npm start`.

### Состав директории компонента (типичный)

```text
src/components/Mo/
├── package.json
├── index.js                  # точка входа, default-export React-компонента
├── constants.js              # опционально — собирается в общий constants.js
├── utilities.js              # опционально — собирается в общий utilities.js
├── components/               # опционально — внутренние под-компоненты (Mo/Buttons, Mo/Inputs, ...)
├── styles/                   # опционально — *.module.scss / *.scss
└── __tests__/                # опционально — jest-тесты
```

Пример вложенного компонента: `src/components/Mo/` содержит поддиректории `ApiForCubeStringBulder`, `Buttons`, `Inputs` (демонстрирует, что `buildSourceForTemplates.js` рекурсивно обходит подпапки с собственными `package.json`).

## Module Federation

`frontend-mdm` выступает **только хостом** (поле `remotes: {}` в `ModuleFederationPlugin`) и экспортирует строго зафиксированный набор директорий.

### Контейнер и реестр экспорта

Имя MF-контейнера (см. `craco.config.js`):

```text
MDM_UI_COMPONENTS   // по умолчанию (process.env.MODULE_FEDERATION_CONTAINER_NAME ?? 'MDM_UI_COMPONENTS')
```

В `src/settings/settings.js` сохранён исторический алиас: `MODULE_FEDERATION_HOST_CONTAINER_NAME = 'DR_Portal'`. Для прод-публикации используйте `MDM_UI_COMPONENTS`.

Реестр экспортируемых директорий (`craco.config.js`):

```javascript
const MODULE_FEDERATION_EXPORT_COMPONENTS = [
    {
        dir: 'MDM',
        // recursive: true,
        // includeCurrentDir: true,
    }
];
```

Каждая запись маппится на `./src/components/<dir>` и регистрируется в `exposes` через хелпер `processModuleExportComponentsConfig` (см. `scripts/helpers/moduleFederationConfigProcessor/index.js`). Хелпер поддерживает рекурсивный обход вложенных директорий (`recursive`, `includeCurrentDir`, `excludePattern`). По умолчанию (`recursive: false`, `includeCurrentDir: true`) раскрывается плоский список директорий верхнего уровня внутри `MDM`.

> **Планируемые/дополнительные директории экспорта:** исторический шаблон документации упоминает также директорию `Flowdemo` (её нужно создать и добавить в `MODULE_FEDERATION_EXPORT_COMPONENTS` при необходимости — в текущем снимке она ещё не создана).

### Shared-зависимости

```javascript
shared: {
    react: { singleton: true, requiredVersion: pkg.dependencies.react },           // ^18.3.1
    'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] }, // ^18.3.1
    'react-router-dom': { singleton: true, requiredVersion: pkg.dependencies['react-router-dom'] }, // 6.0.2
    'lite-react-statemanager': { singleton: true, requiredVersion: pkg.dependencies['lite-react-statemanager'] }, // 1.0.7
},
```

Синглтоны обязательны — иначе состояние и контексты будут задвоены на стыке host/remote.

### Типизация MF

Плагин `FederatedTypesPlugin` из `@module-federation/typescript`:

- публикует типы экспортируемых модулей в директорию `@mf-types/` (отдельный сервер на порту `MF_TYPES_PORT`, по умолчанию `31000`, host `localhost`);
- `tsconfig.json` содержит `"paths": { "*": ["./@mf-types/*"] }` — TypeScript подхватывает remote-типы автоматически;
- `downloadRemoteTypesTimeout: 2000`, `maxRetryAttempts: 2`, `retryDelay: 1000`, `shouldRetryOnTypesNotFound: false`, `shouldRetry: true`;
- при проблемах со stale-типами — `npm run refresh-module-federation-files`.

### Способы подключения MF-компонентов в host-приложениях

#### Static (через `craco.config.js`)

```javascript
new ModuleFederationPlugin({
    name: 'HostContainer',
    remotes: {
        MDM: 'MDM_UI_COMPONENTS@http://<host>/remoteEntry.js',
    },
    shared: { /* … те же singletons … */ },
});
```

```jsx
const MDMWindow = React.lazy(() => import('MDM/<ComponentName>'));
```

#### Runtime (через `<ModuleFederationCMP>`)

```jsx
<ModuleFederationCMP
    remoteModuleInfo={{
        remoteUrl: 'http://<host>/remoteEntry.js',
        containerName: 'MDM_UI_COMPONENTS',
        module: './<ComponentName>',
    }}
    remoteComponentProps={{ /* пропсы */ }}
    loader={<Loader />}
/>
```

## Сборка и окружение

### npm-скрипты (основные)

| Скрипт | Назначение |
| --- | --- |
| `npm start` | Dev-сервер. Чистит `build/` и `@mf-types/`, запускает `craco start` с `ESLINT_NO_DEV_ERRORS=true`. |
| `npm run startw` | То же, что `start`, но ESLint-ошибки не подавляются. |
| `npm run start:debug` | `PORT=3100`, `MF_TYPES_PORT=31000`, лог в `webpack.log`. |
| `npm run build` | Прод-сборка (`HTTPS=true`, `DISABLE_ESLINT_PLUGIN=true`). |
| `npm run build:local` | Прод-сборка без HTTPS, `DISABLE_ESLINT_PLUGIN=true`. |
| `npm run build:analyze` | Прод-сборка + отчёт `webpack-bundle-analyzer`. |
| `npm run buildssldev` | Сборка в `mdm_ui` с `PUBLIC_URL=/mdm_ui`, verbose + debug. |
| `npm run storybook` | Storybook dev на `:6006` с `debug-webpack`. |
| `npm run build-storybook` | Статическая сборка Storybook. |
| `npm test` | Jest в watch-режиме через CRACO. |
| `npm run test:all` | Jest однократно (`--watchAll=false`). |
| `npm run test:coverage` | Jest + coverage. |
| `npm run test:coverage:html` | Coverage HTML-отчёт. |
| `npm run test:report:json` | Coverage + JSON-отчёт в `reports/`. |
| `npm run test:report:junit` | Coverage + JUnit XML. |
| `npm run ts-check` | `tsc` (без флагов) — проверка типов без эмита. |
| `npm run eslint` | Auto-fix ESLint по `FILES` env (cross-env-shell). |
| `npm run prettier` | Auto-format Prettier по `FILES` env (cross-env-shell). |
| `npm run refresh-module-federation-files` | `rm -rf build && rm -rf @mf-types`. |
| `npm run docker:ci` | `npm ci --legacy-peer-deps` (для Docker). |
| `npm run docker:start` | Аналог `npm start`. |
| `npm run prepare` | Устанавливает Husky-хуки. |

### Переменные окружения

Подгружаются `scripts/dotenv.js` (см. также `src/settings/settings.js`).

| Переменная | Назначение | По умолчанию |
| --- | --- | --- |
| `PUBLIC_URL` | Префикс URL для `BrowserRouter.basename` (`FRONTEND_PREFIX_PROCESSED`) | `''` |
| `REACT_APP_BACKEND_PREFIX` | Префикс backend-прокси (`BACKEND_PREFIX_PROCESSED`) | `'/api'` |
| `REACT_APP_DOMAIN` | Домен, добавляемый к backend/frontend URL (`DOMAIN`) | `''` |
| `ESB_HOST` | Цель для dev-server-прокси `/api` | `'localhost:3001'` |
| `REFERER` | Referer-заголовок в прокси-запросах | `localhost:${PORT}` |
| `MODULE_FEDERATION_CONTAINER_NAME` | Override MF container name (в `craco.config.js`) | `'MDM_UI_COMPONENTS'` |
| `MF_TYPES_PORT` | Порт MF types-сервера (`FederatedTypesPlugin.typeServeOptions.port`) | `31000` |
| `PORT` | Порт dev-сервера | `3000` |
| `DISABLE_ESLINT_PLUGIN` | Отключить ESLint в сборке | `false` |
| `BUILD_PATH` | Куда собирать (`buildssldev` → `mdm_ui`) | `build` |
| `HTTPS` | Включить HTTPS для сборки | `true` (прод) |

`.env` шифруется в `.cryptoenv` через `scripts/cryptoEnv.js` (`DotEnv.config` пытается прочитать `.cryptoenv` и расшифровать его, при отсутствии — fallback на стандартный `dotenv`).

### Docker

`Dockerfile.development` — multi-stage:

1. `install`: `sberosc.sigma.sbrf.ru/docker.io/node:22.10-alpine3.19`, `npm ci --frozen-lockfile --legacy-peer-deps` (с прокинутым секретом `npmrc`), копирование `vendors/` для tarball-зависимости `ui-kit`.
2. `build`: `npm run build` с `NODE_OPTIONS=--max-old-space-size=4096`, `DISABLE_ESLINT_PLUGIN=true`, `BUILD_PATH=build`, `PUBLIC_URL=/`.
3. `nginx`: финальный образ на `sberosc.sigma.sbrf.ru/docker.io/nginx:stable-alpine-slim`, статика раздаётся из `/usr/share/nginx/html`, шаблон конфига — `docker/nginx/default.conf.template`.

Сборка:

```bash
docker build -f Dockerfile.development -t mdm-ui:dev .
```

В dev-сервере CRACO дополнительно выставляется cookie `SID=s%DEVELOPED_REACT_PROJECT_FOR_SBER--.NotSecure` (debug-режим).

## Состояние

Глобальное состояние — `lite-react-statemanager` (singleton, доступен и в remote-приложениях). Начальное состояние задаётся в `src/initState.js` и включает модальные окна, off-canvas, flash-сообщения, текущего пользователя, маркеры обновления пользователей/ролей/правил/групп/страниц/виджетов/шаблонов/файлов/событий/рассылок, состояние таблицы (`SELECTED_TABLE_ROW_STATE`, `NEED_TABLE_FORCE_UPDATE_STATE`, `NEED_TABULAR_PART_FORCE_SAVE_STATE`, `RECENT_TABLE_ID_STATE`), `markdelPages/Template/Widgets/Files` (с `localStorage`), `errorViews` (302/401/403/423/504 → `ErrorAuth` / `ErrorAuthSber` / `ErrorGatewayTimeout`).

Ключи состояния, зависящие от пользовательских данных, перечислены в `userDataKeysDepended` (`src/settings/settings.js`):

```javascript
export const userDataKeysDepended = ['SelfBoard', 'theme', 'assistant', 'backgroundImageHash'];
```

Дополнительно: `src/components/ui/windows.helper.js` предоставляет API `$windows.open/close` для запуска модальных окон в отдельных окнах (через `StateManager.setState({ windows: ... })`).

## Маршрутизация

Точка входа — `src/bootstrap.js`, в которой создаётся root и монтируется `<BrowserRouter basename={FRONTEND_PREFIX_PROCESSED}>`. Перед этим в глобальный `window` ставится `error`-листенер, глушащий дефолтный React-error-overlay.

В `src/App/App.js` (class-component) объявлены маршруты:

- `/` → `Home` (`src/App/routes/Home/index.tsx`) — landing-страница со ссылкой на `/mdm`.
- `/mdm` → `MDMPage` (`src/App/routes/MDM/index.js`) → рендерит `<MDM interfaceId="1eac9e46-d836-4917-9474-be7cdd498104" />`.

На верхнем уровне App оборачивает приложение в `<SessionContext>` (темизация + контекст сессии), `<ThemeProvider theme={GALAXY_THEME}>` и `<RootComponents />` (авто-монтируемые компоненты из `src/components/rootComponents.js`).

Дополнительные роуты публикуются компонентами через поле `routes` в их `package.json` — они автоматически попадают в `components/routes.js` (генератор `scripts/helpers/buildRoutes.js` создаёт `ExtRoutes` со всеми `<Route>`).

## Расширение функциональности (аналог «хуков» backend-платформы)

В backend-SREDA перегрузки делались через `extensions`. Здесь аналог — **композиция** + **MF-экспорт нового компонента**:

1. **Добавить новый компонент** в `src/components/<Name>/` с собственным `package.json` (`codeName`, `main`, при необходимости `typeSBR: "ReactCMS"`, `rootComponent`, `routes`).
2. **Зарегистрировать экспорт** в `craco.config.js` (`MODULE_FEDERATION_EXPORT_COMPONENTS`) — добавить директорию верхнего уровня (`MDM`, `Flowdemo` или новую).
3. **Добавить маршрут**, если требуется — через `routes` в `package.json` компонента (попадёт в `components/routes.js`).
4. **Сделать авто-монтируемым** — `rootComponent: true` в `package.json` (попадёт в `<RootComponents />` в `App.js`).
5. **Перезапустить** `npm start` (или `npm run refresh-module-federation-files`) — сканер пересоберёт агрегаторы и MF-манифест.

Изменять код уже экспортируемого компонента можно, но это считается breaking change для потребителей — оформляется отдельной задачей с changelog и (при необходимости) расширением списка `exposes`, чтобы не ломать старый контракт.

## Тестирование

- Фреймворк: Jest + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@testing-library/dom`).
- Конфигурация Jest живёт в `craco.config.js` (`jest.configure`):
  - Все `.js/.jsx/.ts/.tsx/.mjs` идут через `babel-jest` (`@babel/preset-env`, `@babel/preset-react` automatic, `@babel/preset-typescript`).
  - Список ESM-пакетов, требующих трансформации (`transformIgnorePatterns`): `lite-react-statemanager`, `axios`, `bpmn-js`, `@bpmn-io`, `diagram-js`, `diagram-js-ui`, `diagram-js-direct-editing`, `vfile`, `dmn-js-shared`, `react-markdown`, `vfile-message`, `min-dash`, `min-dom`, `tiny-svg`, `ids`, `moddle`, `moddle-xml`, `object-refs`, `path-intersection`.
  - Стили и ассеты мокаются (`identity-obj-proxy` для CSS/SCSS/LESS/SASS, `<rootDir>/__mocks__/fileMock.js` для картинок).
  - `testEnvironment: 'jsdom'`.
  - `collectCoverageFrom` исключает `*.d.ts`, `*.types.ts`, `*.type.ts`, `types.ts`, `types/**`, `typings/**`, `@types/**`, `interfaces.ts`, `interface.ts`, `I*.ts`, `*.interface.ts`, а также `MetadataGuideList/`, `ui/`, `UIKit/`, `UiKitIcons/`, `Utils/`.
  - Доп. расширения модулей: `mjs, js, jsx, ts, tsx, json`.
- Репортеры: `jest-junit` 16, JSON, HTML-coverage, Cobertura, LCOV, Sonar (`sonar-report.xml` через `jestSonar.reportFile`).

Запуск:

```bash
npm test                              # watch
npm run test:all                      # однократно
npm run test:coverage                 # coverage
npx craco test --watchAll=false path/to/file.test.tsx   # один файл
```

## Observability

В браузере работает OpenTelemetry Web SDK (`@opentelemetry/sdk-trace-web`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/api`, `@opentelemetry/resources`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/semantic-conventions`, `@opentelemetry/context-zone`, instrumentations: `fetch`, `xml-http-request`, `document-load`, `user-interaction`). Дополнительно — `reportWebVitals.js` для web-vitals (`web-vitals` 2.x).

## Стандарты кода

- **Prettier** (`.prettierrc.json`): `tabWidth=4`, `semi=true`, `singleQuote=true`, `jsxSingleQuote=false`, `trailingComma=all`, `bracketSpacing=true`, `bracketSameLine=false`, `arrowParens=always`, `printWidth=127`, `singleAttributePerLine=false`.
- **ESLint** (`.eslintrc.js`): наследует `plugin:react/recommended`, `airbnb`, `prettier`, `react-app`, `react-app/jest`; TS парсится через `@typescript-eslint/parser`; правила — `react/jsx-filename-extension: [2, { extensions: ['.js', '.jsx', 'tsx'] }]`, `no-console: ['warn', { allow: ['warn', 'error'] }]`, отключены `react/prop-types`, `react/destructuring-assignment`, `react/sort-comp`, `import/order` и др.
- **Husky**: устанавливается через `prepare`. Git-хуки в `.husky/_/`.
- **Именование**:
  - компоненты и `codeName` — `PascalCase`;
  - функции/переменные — `camelCase`;
  - директории компонентов — `PascalCase` (как имя компонента).
- **Импорты**: предпочтительны алиасы (`components/...`, `helpers/...`, `ui-kit`), но `tsconfig.json` формально описывает только `paths: { "*": ["./@mf-types/*"] }`; глубокие относительные пути допустимы.

## TypeScript

`tsconfig.json`:
- `target: es2015`, `module: esnext`, `moduleResolution: node`, `jsx: react-jsx`.
- `strict: true`, `noFallthroughCasesInSwitch: true`, `forceConsistentCasingInFileNames: true`, `esModuleInterop: true`, `allowSyntheticDefaultImports: true`, `isolatedModules: true`, `resolveJsonModule: true`, `noEmit: true`.
- `paths: { "*": ["./@mf-types/*"] }` — remote-типы MF.
- `include: ["./src/**/*.ts", "./src/**/*.tsx"]`, `exclude: ["node_modules", "build", "dist", "src/**/*.js", "src/**/*.jsx", "src/**/FlowchartCMP"]`.
- `allowJs: true` — JS-файлы допустимы рядом с TS.

Проверка: `npm run ts-check` (= `tsc` без аргументов). Stale-типы — `npm run refresh-module-federation-files`.

## Обработка ошибок

`src/bootstrap.js` устанавливает глобальный `window.error`-листенер, который:

1. Логирует ошибку в `console.error`.
2. Вызывает `e.stopImmediatePropagation()` — глушит дефолтный React-error-overlay.
3. Вызывает `e.preventDefault()` — подавляет браузерное всплытие ошибки.

> Это сделано намеренно (чтобы MF-remotes не «роняли» host-overlay). При локальной отладке компонентов учитывайте это: ошибки видны только в консоли.

Дополнительно `src/initState.js` мапит HTTP-ошибки на визуальные вью: 302/401/403 → `<ErrorAuth />`, 423 → `<ErrorAuthSber />`, 504 → `<ErrorGatewayTimeout />`.

## Сводный реестр компонентов (актуальный набор)

Каталог `src/components/` (текущий снимок):

- **MF-экспортируемые директории** (`craco.config.js` → `MODULE_FEDERATION_EXPORT_COMPONENTS`):
  - `MDM` — целевая директория экспорта (в текущем снимке ещё не создана, зарезервирована).
- **Базовые компоненты** (есть в `src/components/`):
  - `Mo` — пример «мини-пакета» с под-компонентами `ApiForCubeStringBulder`, `Buttons`, `Inputs` (есть собственный `package.json` с `codeName: "Mo"`, `main: index.js`).
  - `Errors` — error-вью (`ErrorAuth`, `ErrorAuthSber`, `ErrorGatewayTimeout`).
  - `Features` — фиче-компоненты.
  - `Loader` — компонент загрузки.
  - `MetadataForms` — формы метаданных.
  - `ModalDetailedError` — детальная модалка ошибки.
  - `PageHeader` — заголовок страницы (`main: index.tsx`, `codeName: "PageHeader"`).
  - `SessionContext` — контекст сессии, оборачивает приложение в `App.js`.
  - `ThemeSwitchAgent` — агент переключения тем.
  - `ui` — UI-инфраструктура (включая `windows.helper.js`).
  - `UIKit`, `UiKitIcons` — обёртки/иконки.
- **Корень `src/components/`** — также лежит файл `lite-react-statemanager.d.ts` (амбиент-типы singleton-стейт-менеджера).
- **Сгенерированные файлы** (`.gitignore`, регенерируются при каждом билде): `src/components/index.js`, `constants.js`, `utilities.js`, `rootComponents.js`, `routes.js`.

> Имена директорий должны совпадать с `codeName` (PascalCase) и соблюдать правила для `rootComponent`, `routes`, `main` в `package.json`. Полный список директорий верхнего уровня внутри `MDM`/`Flowdemo` будет определён по мере разработки.

## Где живёт документация

В этом репозитории **нет** корневой директории `docs/`. Документация хранится рядом с кодом, к которому относится:

| Тип документации | Расположение |
| --- | --- |
| Документация конкретного компонента (developer/integration guide, changelog, описание пропсов) | `src/components/<ComponentName>/docs/` |
| Документация приложения уровнем выше (карта роутов, общие ENV, сквозные соглашения) | `src/App/docs/` |
| Сквозная/общая документация на несколько компонентов (общий MF-контракт, общие правила стилизации, общие правила тестирования) | `src/components/_shared/docs/` (создаётся по мере необходимости) |
| Сквозная/общая документация на всё репо (архитектура, CI/CD, релизный процесс) | `.sdd/` (этот каталог), `GIGACODE.md`, `README.md` |

Правило: если документация обновляется при изменении конкретного компонента, она лежит **внутри** его директории. Это снижает шанс того, что документ отстанет от кода — ревьюер видит их в одном PR.

## Источники истины

- `craco.config.js` — реестр MF-экспорта, алиасы, jest-конфиг, `FederatedTypesPlugin`.
- `package.json` — npm-скрипты, список зависимостей, resolutions, browserslist, `dependenciesReactCMS`.
- `src/settings/settings.js` — env-driven конфигурация URL/префиксов (`FRONTEND_PREFIX_PROCESSED`, `BACKEND_PREFIX_PROCESSED`, `userDataKeysDepended`, `MODULE_FEDERATION_HOST_CONTAINER_NAME`).
- `src/App/App.js` — корневые роуты (`/`, `/mdm`), `SessionContext`, `ThemeProvider`, `<RootComponents />`.
- `src/bootstrap.js` — точка монтирования React и BrowserRouter, глобальный error-листенер.
- `src/initState.js` — начальное состояние `lite-react-statemanager`.
- `scripts/buildSourceForTemplates.js` — генератор агрегаторов компонентов (`index.js`, `constants.js`, `utilities.js`, `rootComponents.js`, `routes.js`).
- `scripts/dotenv.js` + `scripts/cryptoEnv.js` — загрузка и расшифровка `.cryptoenv`/`.env`.
- `GIGACODE.md` — компактный контекст для ИИ-ассистента.
- `README.md` — детальное описание Module Federation (Static + Runtime, типизация).
- `Dockerfile.development` — multi-stage: `sberosc.sigma.sbrf.ru/docker.io/node:22.10-alpine3.19` → `sberosc.sigma.sbrf.ru/docker.io/nginx:stable-alpine-slim`.
