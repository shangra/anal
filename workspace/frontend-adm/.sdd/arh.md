# Архитектура проекта frontend-admin

`frontend-admin` (npm-имя `adminpanel_ui_app`, отображаемое имя `adminpanel`) — это React-приложение **админ-панели платформы SREDA**, которое одновременно является:

1. **Самостоятельным UI** для управления метаданными, матрицей доступа, инспектором и пользовательскими атрибутами.
2. **Хостом Module Federation** — экспортирует переиспользуемые React-компоненты (микрофронтенды) для встраивания в другие приложения экосистемы.

Проект построен на ядре «Sreda Frontend» и распространяет общие компоненты по технологии Micro Frontends. Для удобства разработки и документирования компонентов подключён Storybook.

## Ключевые особенности платформы

- **Компонентная архитектура** — каждая функциональная единица живёт в `src/components/<ComponentName>/` как отдельная директория со своим `package.json`. Это позволяет изолировать разработку, тестирование и публикацию отдельных компонентов.
- **Module Federation Host** — приложение экспортирует ограниченный, явно заданный список компонентов (`craco.config.js` → `MODULE_FEDERATION_EXPORT_COMPONENTS`). Экспорт меняется только через этот реестр.
- **Согласованные синглтоны** — общие библиотеки (`react`, `react-dom`, `react-router-dom`, `lite-react-statemanager`) шарятся как singletons, чтобы состояние корректно пересекало границы host/remote.
- **Каждый компонент = мини-пакет.** В `package.json` компонента описывается `codeName`, точка входа (`main`), признак авто-монтирования (`rootComponent`) и роуты (`routes`). Сборочный скрипт `scripts/buildSourceForTemplates.js` сканирует эти манифесты и генерирует агрегаторы.
- **Сгенерированные файлы** (`src/components/index.js`, `constants.js`, `utilities.js`, `rootComponents.js`, `routes.js`) — артефакты сборки, никогда не редактируются вручную и попадают в `.gitignore`.
- **Политика изменения чужого компонента** — код уже опубликованного MF-компонента не правится напрямую в этом репо, если изменение нужно downstream-потребителю. Корректировка оформляется как PR в этот репозиторий и выпускается новой версией образа/бандла.

## Технологический стек

| Область | Стек |
| --- | --- |
| Язык | JavaScript + TypeScript (mixed) |
| UI-фреймворк | React 18, React Router DOM v6 |
| Сборщик | Webpack 5 через **CRACO** (override над Create React App) |
| Микро-фронтенды | Webpack `ModuleFederationPlugin` + `@module-federation/typescript` |
| Стили | Bootstrap 5, Bootstrap Icons, SASS, внутренний `ui-kit` (tarball из `vendors/`) |
| Формы | React Hook Form + Joi resolvers |
| Rich-text / визуальные редакторы | EditorJS, Draft.js |
| Таблицы и данные | React Data Grid, React Bootstrap, Recharts, ExcelJS |
| Графы / диаграммы / canvas | `@xyflow/react`, BPMN-JS, gridstack |
| Состояние | `lite-react-statemanager` (lite + shared singleton) |
| Observability | OpenTelemetry (web SDK) |
| Тестирование | Jest + Testing Library (`jest-junit` репортер) |
| Документация / DX | Storybook 7 |
| Качество кода | ESLint (airbnb + react-app + prettier), Prettier, Husky |

## Репозиторий frontend-admin

Целевой сервис — SPA админ-панели. Один репозиторий, один npm-пакет (`adminpanel_ui_app`), один Dockerfile (`Dockerfile.development`). Разрабатывается в этом репо; публикуется как Docker-образ (`sberosc.sigma.sbrf.ru/...`) для развёртывания за nginx.

### Файловая структура (верхний уровень)

```text
frontend-admin/
├── craco.config.js              # Webpack/CRACO: MF, алиасы, полифиллы, jest
├── babel.config.js              # Babel preset для тестов (env, react automatic runtime, TS)
├── tsconfig.json                # TS strict, baseUrl=src, paths, jsx=react-jsx
├── .eslintrc.js                 # ESLint: airbnb + react-app + prettier, TS parser
├── .prettierrc.json             # Prettier (4 spaces, single quotes, semi, trailing all)
├── Dockerfile.development       # Multi-stage: node:22 install/build → nginx:stable-alpine
├── public/                      # Статика (index.html, manifest, favicon, service-worker)
├── scripts/                     # Сборочные скрипты (env, сканирование компонентов, MF config)
│   └── helpers/                 # Хелперы для buildSourceForTemplates.js
├── vendors/
│   └── ui-kit/                  # Внутренний ui-kit (tarball-зависимость)
└── src/
    ├── index.tsx                # Тонкий шим, динамически импортирующий bootstrap
    ├── bootstrap.js             # Точка входа React: createRoot, BrowserRouter, Bootstrap CSS/JS
    ├── App/                     # Корневой компонент + роутинг
    ├── components/              # ~60 директорий-компонентов (каждая = свой package.json)
    ├── pages/                   # Статичные страницы (ApiError, DynPage)
    ├── settings/                # env-driven конфигурация
    ├── helpers/                 # Общие хелперы
    ├── css/, fonts/, images/    # Статические ассеты
    ├── initState.js             # Начальное состояние lite-react-statemanager
    └── global.d.ts              # Амбиент-декларации (*.css, *.module.css, *.svg, *.png)
```

## Структура директории `src/components`

Это «сердце» кодовой базы. Каждый компонент живёт в собственной поддиректории и **обязан** содержать `package.json` со следующими полями:

```json
{
    "codeName": "MetadataHier",
    "main": "index.js",
    "rootComponent": false,
    "routes": [],
    "filenameWithConstantsForTemplate": "constants.js",
    "filenameWithUtilitiesForTemplate": "utilities.js"
}
```

| Поле | Назначение |
| --- | --- |
| `codeName` | Регистрационное имя компонента в сгенерированных агрегаторах. |
| `main` | Точка входа для агрегаторов (по умолчанию `index.js`). |
| `rootComponent: true` | Компонент автоматически монтируется на верхнем уровне (через `rootComponents.js`). |
| `routes: [...]` | Массив роутов, которые попадают в `components/routes.js`. |
| `filenameWithConstantsForTemplate` | Имя файла с константами, который будет собран в общий `constants.js`. |
| `filenameWithUtilitiesForTemplate` | Имя файла с утилитами, который будет собран в общий `utilities.js`. |

### Агрегаторы, которые генерирует `scripts/buildSourceForTemplates.js`

Каждый запуск Webpack прогоняет сканер и обновляет (при необходимости) следующие файлы:

- `src/components/index.js` — реэкспорт всех компонентов.
- `src/components/constants.js` — объединение констант компонентов.
- `src/components/utilities.js` — объединение утилит компонентов.
- `src/components/rootComponents.js` — авто-монтируемые компоненты.
- `src/components/routes.js` — массив роутов для `react-router-dom`.

> **Важно.** Эти файлы попадают в `.gitignore`. Если вы видите пустые или устаревшие агрегаторы — выполните `npm run refresh-module-federation-files` или просто перезапустите `npm start`.

### Состав директории компонента (типичный)

```text
src/components/MetadataHier/
├── package.json
├── index.js                  # точка входа, default-export React-компонента
├── constants.js              # опционально — собирается в общий constants.js
├── utilities.js              # опционально — собирается в общий utilities.js
├── components/               # опционально — внутренние под-компоненты
├── styles/                   # опционально — *.module.scss / *.scss
└── __tests__/                # опционально — jest-тесты
```

## Module Federation

`frontend-admin` выступает **только хостом** (не подключает удалённые модули в свой прод-бандл) и экспортирует строго зафиксированный набор компонентов.

### Контейнер и реестр экспорта

Имя MF-контейнера (см. `craco.config.js` и `src/settings/settings.js`):

```text
ADMINPANEL_UI_COMPONENTS   // по умолчанию
DR_Portal                  // историческое имя в src/settings/settings.js
```

Переопределяется переменной `MODULE_FEDERATION_CONTAINER_NAME`.

Реестр экспортируемых компонентов (`craco.config.js`):

```javascript
const MODULE_FEDERATION_EXPORT_COMPONENTS = [
    { dir: 'MetadataHier' },
    { dir: 'MetadataWindow' },
    { dir: 'Inspector' },
    { dir: 'InspectorWindow' },
    { dir: 'AccessMatrixDrawer' },
];
```

Каждая запись маппится на `./src/components/<dir>` и регистрируется в `exposes` через хелпер `processModuleExportComponentsConfig`. Хелпер также поддерживает рекурсивный обход вложенных директорий (`recursive`, `includeCurrentDir`, `excludePattern`).

### Shared-зависимости

```javascript
shared: {
    react: { singleton: true, requiredVersion: pkg.dependencies.react },
    'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] },
    'react-router-dom': { singleton: true, requiredVersion: pkg.dependencies['react-router-dom'] },
    'lite-react-statemanager': { singleton: true, requiredVersion: pkg.dependencies['lite-react-statemanager'] },
},
```

Синглтоны обязательны — иначе состояние и контексты будут задвоены на стыке host/remote.

### Типизация MF

Плагин `FederatedTypesPlugin` из `@module-federation/typescript`:

- публикует типы экспортируемых модулей в директорию `@mf-types/` (отдельный сервер на порту `MF_TYPES_PORT`, по умолчанию `31000`);
- `tsconfig.json` содержит `"paths": { "*": ["./@mf-types/*", ...] }` — TypeScript подхватывает remote-типы автоматически;
- при проблемах со stale-типами — `npm run refresh-module-federation-files`.

### Способы подключения MF-компонентов в host-приложениях

#### Static (через `craco.config.js`)

```javascript
new ModuleFederationPlugin({
    name: 'HostContainer',
    remotes: {
        AdminPanel: 'ADMINPANEL_UI_COMPONENTS@http://<host>/remoteEntry.js',
    },
    shared: { /* … те же singletons … */ },
});
```

```jsx
const AdminPanelWindow = React.lazy(() => import('AdminPanel/MetadataWindow'));
```

#### Runtime (через `<ModuleFederationCMP>`)

```jsx
<ModuleFederationCMP
    remoteModuleInfo={{
        remoteUrl: 'http://<host>/remoteEntry.js',
        containerName: 'ADMINPANEL_UI_COMPONENTS',
        module: './MetadataWindow',
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
| `npm run build` | Прод-сборка (`HTTPS=true`). |
| `npm run build:local` | Прод-сборка без HTTPS. |
| `npm run build:analyze` | Прод-сборка + отчёт `webpack-bundle-analyzer`. |
| `npm run buildssldev` | Сборка в `adm_ui` с `PUBLIC_URL=/adm_ui`, verbose + debug. |
| `npm run storybook` | Storybook dev на `:6006` с debug-webpack. |
| `npm run build-storybook` | Статическая сборка Storybook. |
| `npm test` | Jest в watch-режиме через CRACO. |
| `npm run test:all` | Jest однократно. |
| `npm run test:coverage` | Jest + coverage. |
| `npm run test:coverage:html` | Coverage HTML-отчёт. |
| `npm run test:report:json` | Coverage + JSON-отчёт в `reports/`. |
| `npm run test:report:junit` | Coverage + JUnit XML. |
| `npm run ts-check` | `tsc --noEmit` — проверка типов без эмита. |
| `npm run eslint` | Auto-fix ESLint по `FILES` env. |
| `npm run prettier` | Auto-format Prettier по `FILES` env. |
| `npm run refresh-module-federation-files` | `rm -rf build && rm -rf @mf-types`. |
| `npm run docker:ci` | `npm ci --legacy-peer-deps` (для Docker). |
| `npm run docker:start` | Аналог `npm start`. |

### Переменные окружения

Подгружаются `scripts/dotenv.js` (см. также `src/settings/settings.js`).

| Переменная | Назначение | По умолчанию |
| --- | --- | --- |
| `PUBLIC_URL` | Префикс URL для `BrowserRouter.basename` | `''` |
| `REACT_APP_BACKEND_PREFIX` | Префикс backend-прокси | `'/api'` |
| `REACT_APP_DOMAIN` | Домен, добавляемый к backend/frontend URL | `''` |
| `ESB_HOST` | Цель для dev-server-прокси `/api` | `'localhost:3001'` |
| `REFERER` | Referer-заголовок в прокси-запросах | `localhost:${PORT}` |
| `MODULE_FEDERATION_CONTAINER_NAME` | Override MF container name | `'ADMINPANEL_UI_COMPONENTS'` |
| `MF_TYPES_PORT` | Порт MF types-сервера | `31000` |
| `PORT` | Порт dev-сервера | `3000` |
| `DISABLE_ESLINT_PLUGIN` | Отключить ESLint в сборке | `false` |
| `BUILD_PATH` | Куда собирать `buildssldev` | — |
| `HTTPS` | Включить HTTPS для dev/prod | `true` (прод) |

### Docker

`Dockerfile.development` — multi-stage:

1. `install`: `node:22.10-alpine3.19`, `npm ci --frozen-lockfile --legacy-peer-deps`, прокидывание секрета `npmrc`.
2. `build`: `npm run build` с `NODE_OPTIONS=--max-old-space-size=4096`, `DISABLE_ESLINT_PLUGIN=true`, `BUILD_PATH=build`, `PUBLIC_URL=/`.
3. `nginx`: финальный образ на `nginx:stable-alpine-slim`, статика раздаётся из `/usr/share/nginx/html`, шаблон конфига — `docker/nginx/default.conf.template`.

Сборка:

```bash
docker build -f Dockerfile.development -t adminpanel-ui:dev .
```

## Состояние

Глобальное состояние — `lite-react-statemanager` (singleton, доступен и в remote-приложениях). Начальное состояние задаётся в `src/initState.js` и включает модальные окна, flash-сообщения, текущего пользователя, маркеры обновления списков пользователей/ролей и т. п.

Ключи состояния, зависящие от пользовательских данных, перечислены в `userDataKeysDepended` (`src/settings/settings.js`):

```javascript
export const userDataKeysDepended = ['SelfBoard', 'theme', 'assistant', 'backgroundImageHash'];
```

## Маршрутизация

Точка входа — `src/bootstrap.js`, в которой создаётся root и монтируется `<BrowserRouter basename={FRONTEND_PREFIX_PROCESSED} />`.

В `src/App/App.js` объявлены маршруты:

- `/` → `Home` (простая landing-страница со ссылкой на `/adminpanel`).
- `/adminpanel` → `AdminPanelPage` → `<AdminPanel />` — собирает `MetadataWindow` + `InspectorWindow` + `AccessMatrixDrawer`.

Дополнительные роуты публикуются компонентами через поле `routes` в их `package.json` — они автоматически попадают в `components/routes.js`.

## Расширение функциональности (аналог «хуков» backend-платформы)

В backend-SREDA перегрузки делались через `extensions`. Здесь аналог — **композиция** + **MF-экспорт нового компонента**:

1. **Добавить новый компонент** в `src/components/<Name>/` с собственным `package.json` (`codeName`, `main`).
2. **Зарегистрировать экспорт** в `craco.config.js` (`MODULE_FEDERATION_EXPORT_COMPONENTS`), если компонент должен быть доступен извне.
3. **Добавить маршрут**, если требуется — через `routes` в `package.json` компонента (попадёт в `components/routes.js`).
4. **Сделать авто-монтируемым** — `rootComponent: true` в `package.json`.
5. **Перезапустить** `npm start` (или `npm run refresh-module-federation-files`) — сканер пересоберёт агрегаторы и MF-манифест.

Изменять код уже экспортируемого компонента можно, но это считается breaking change для потребителей — оформляется отдельной задачей с changelog и (при необходимости) расширением списка `exposes`, чтобы не ломать старый контракт.

## Тестирование

- Фреймворк: Jest + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`).
- Конфигурация Jest живёт в `craco.config.js` (`jest.configure`):
  - Все `.js/.jsx/.ts/.tsx/.mjs` идут через `babel-jest`.
  - Список ESM-пакетов, требующих трансформации (`transformIgnorePatterns`): `lite-react-statemanager`, `axios`, `bpmn-js`, `@bpmn-io`, `diagram-js`, `moddle`, `react-markdown` и др.
  - Стили и ассеты мокаются (`identity-obj-proxy`, `<rootDir>/__mocks__/fileMock.js`).
  - `testEnvironment: 'jsdom'`.
  - `collectCoverageFrom` исключает `ui/`, `UIKit/`, `UiKitIcons/`, `Utils/`, `MetadataGuideList/`, все `*.d.ts`, `*.types.ts`, `I*.ts`, `interfaces.ts`, `types/**`, `@types/**`.
- Репортеры: `jest-junit`, JSON, HTML-coverage, Sonar (`sonar-report.xml` через `jestSonar.reportFile`).

Запуск:

```bash
npm test                              # watch
npm run test:all                      # однократно
npm run test:coverage                 # coverage
npx craco test --watchAll=false path/to/file.test.tsx   # один файл
```

## Observability

В браузере работает OpenTelemetry Web SDK (`@opentelemetry/sdk-trace-web`, `@opentelemetry/exporter-trace-otlp-http`, instrumentations: `fetch`, `xml-http-request`, `document-load`, `user-interaction`). Дополнительно — `reportWebVitals.js` для web-vitals.

## Стандарты кода

- **Prettier** (`.prettierrc.json`): 4 пробела, точки с запятой, одинарные кавычки (JS), двойные (JSX), trailing commas `all`, print width 127.
- **ESLint** (`.eslintrc.js`): наследует `react/recommended`, `airbnb`, `prettier`, `react-app`, `react-app/jest`; TS парсится через `@typescript-eslint/parser`.
- **Husky**: устанавливается через `prepare`. Git-хуки в `.husky/_/`.
- **Именование**:
  - компоненты и `codeName` — `PascalCase`;
  - функции/переменные — `camelCase`;
  - директории компонентов — `PascalCase` (как имя компонента).
- **Импорты**: предпочитать алиасы (`components/...`, `helpers/...`, `ui/...`) глубоким относительным путям.

## Обработка ошибок

`src/bootstrap.js` устанавливает глобальный `window.error`-листенер, который:

1. Логирует ошибку в консоль.
2. Вызывает `e.stopImmediatePropagation()` — глушит дефолтный React-error-overlay.
3. Вызывает `e.preventDefault()` — подавляет браузерное всплытие ошибки.

> Это сделано намеренно (чтобы MF-remotes не «роняли» host-overlay). При локальной отладке компонентов учитывайте это: ошибки видны только в консоли.

## Сводный реестр компонентов (актуальный набор)

Каталог `src/components/` (~60 директорий). Ключевые группы:

- **MF-экспортируемые** (`craco.config.js`): `MetadataHier`, `MetadataWindow`, `Inspector`, `InspectorWindow`, `AccessMatrixDrawer`.
- **Каркас админ-панели**: `AdminPanel`, `Header`, `Metadata`, `MetadataForms`, `MetadataTable`, `PagesTree`, `AccessMatrix`, `MatrixTable`, `AdminSearch`.
- **UI-инфраструктура**: `ui/`, `UIKit/`, `UiKitIcons`, `AdminUiKit`, `Utils`, `HOC`, `Errors`, `SessionContext`, `ThemeSwitchAgent`, `withPrivate`, `withRouter`.
- **Формы / редакторы**: `FormMetadata`, `CodeEditorCMP`, `LinkCMP`, `RankEditor`, `SelectSubscribeGroup`, `CommonInput`, `DRQueryBuilder`, `SortableList`, `SortableListItem`.
- **Модальные / нотификации**: `ModalError`, `ModalDetailedError`, `ModalSuccess`, `WindowsCMP`, `OffcanvasCMP`, `SkeletonSpinner`, `SkeletonsCMP`, `Loader`, `ApiError`, `FullscreenViewer`.
- **Пользователи / атрибуты**: `Users`, `UserAttribute`, `ProfileCMP`, `AuthForm`, `Avatar`, `Inspector`, `InspectorButtons`, `InspectorWindow`.
- **Визуализация**: `TreeCMP`, `Accordion`, `Icon`, `DevelopMacros`, `DetailsHeader`.
- **Прочее**: `AccessRestricted`, `statistics-agent-ui`, `PrivateComponent`, `sberComponents`, `Settings`.

> Имена директорий должны совпадать с `codeName` (PascalCase) и соблюдать правила для `rootComponent`, `routes`, `main` в `package.json`.

## Где живёт документация

В этом репозитории **нет** корневой директории `docs/`. Документация хранится рядом с кодом, к которому относится:

| Тип документации | Расположение |
| --- | --- |
| Документация конкретного компонента (developer/integration guide, changelog, описание пропсов) | `src/components/<ComponentName>/docs/` |
| Документация приложения уровнем выше (карта роутов, общие ENV, сквозные соглашения) | `src/App/docs/` |
| Сквозная/общая документация на несколько компонентов (общий MF-контракт, общие правила стилизации, общие правила тестирования) | `src/components/_shared/docs/` (создаётся по мере необходимости) |
| Сквозная/общая документация на всё репо (архитектура, CI/CD, релизный процесс) | `.sdd/` (этот каталог), `GIGACODE.md`, `README 2.md` |

Правило: если документация обновляется при изменении конкретного компонента, она лежит **внутри** его директории. Это снижает шанс того, что документ отстанет от кода — ревьюер видит их в одном PR.

## Источники истины

- `craco.config.js` — реестр MF-экспорта, алиасы, jest-конфиг.
- `package.json` — npm-скрипты, список зависимостей, resolutions.
- `src/settings/settings.js` — env-driven конфигурация URL/префиксов.
- `src/App/App.js` — корневые роуты.
- `src/bootstrap.js` — точка монтирования React и BrowserRouter.
- `scripts/buildSourceForTemplates.js` — генератор агрегаторов компонентов.
- `GIGACODE.md` — компактный контекст для ИИ-ассистента.
- `README 2.md` — детальное описание Module Federation.
