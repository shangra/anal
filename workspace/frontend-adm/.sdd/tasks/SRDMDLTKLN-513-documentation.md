## Задача SRDMDLTKLN-513: Документация для разработчиков и пользователей фронтенд-модуля админ-панели SREDA

### 1. Контекст и модель публикации

Репозиторий **frontend-admin** (npm-имя `adminpanel_ui_app`, display name `adminpanel`) — это **самостоятельный SPA** платформенной админ-панели SREDA, который одновременно является **хостом Module Federation** и экспортирует переиспользуемые React-компоненты в виде микро-фронтендов.

Артефакты публикации:

| Канал | Назначение |
| --- | --- |
| Docker-образ (multi-stage `Dockerfile.development` → nginx) | Развёртывание админ-панели как самостоятельного сервиса. Базовый образ — `sberosc.sigma.sbrf.ru/docker.io/nginx:stable-alpine-slim`. |
| `remoteEntry.js` (Module Federation) | Встраивание компонентов `MetadataHier`, `MetadataWindow`, `Inspector`, `InspectorWindow`, `AccessMatrixDrawer` в host-приложения экосистемы. |
| `@mf-types/` (через `FederatedTypesPlugin`) | TypeScript-типы экспортируемых модулей, раздаются отдельным сервером на `MF_TYPES_PORT` (по умолчанию `31000`). |
| Storybook (`npm run storybook`, `npm run build-storybook`) | Документация и изолированная разработка компонентов (порт `6006`). |

Существуют две основные роли пользователей этого репозитория:

| Роль | Кто | Где работает |
| --- | --- | --- |
| **Разработчик админ-панели** | Frontend-инженер команды SREDA, ведёт `frontend-admin`. | Внутри этого репозитория: добавляет компоненты, регистрирует MF-экспорт, обновляет админ-панель. |
| **Разработчик host-приложения** | Frontend-инженер смежной команды, который встраивает экспортируемые компоненты в свой фронтенд (через Static или Runtime MF). | В **своём** репозитории: подключает `ADMINPANEL_UI_COMPONENTS@<host>/remoteEntry.js`, потребляет типы из `@mf-types/`. |

Жизненный цикл изменения:

1. Разработка ведётся в `src/components/<ComponentName>/` этого репозитория.
2. Локальная проверка: `npm start` (dev-сервер, `PORT=3000`), `npm run storybook` (изолированный показ компонента), `npm test` / `npm run test:all`, `npm run ts-check`.
3. Если компонент должен экспортироваться по MF — добавить в `MODULE_FEDERATION_EXPORT_COMPONENTS` в `craco.config.js`, после чего регенерируется MF-манифест.
4. Сборка: `npm run build` (прод, `HTTPS=true`), опционально `npm run build:analyze` для профилирования бандла.
5. Публикация: Docker-образ загружается в `sberosc.sigma.sbrf.ru/docker.io/...` и поднимается за nginx; host-приложения переключают `remoteUrl` на новый адрес и обновляют типы (`npm run refresh-module-federation-files`).

Источник истины по архитектуре: `.sdd/arh.md`, `GIGACODE.md`, `README.md`, `craco.config.js`, `src/settings/settings.js`, реальные компоненты в `src/components/`.

### 2. Аудитория и результаты

Документация пишется для двух разных аудиторий, в разных файлах и разным языком.

> **Где лежит документация.** В отличие от backend-SREDA, в этом репозитории **нет** корневой директории `docs/`. Документация каждого публикуемого компонента хранится **внутри самого компонента**, по пути `src/components/<ComponentName>/docs/`. Если документация общая для всего репо (карта компонентов, сквозные правила, описание MF-контракта в целом) — она кладётся в `src/components/_shared/docs/` либо в `src/App/docs/` (для вещей уровня приложения). Ниже, для краткости, пути в примерах указываются как `docs/...`, но подразумевается именно `<корень-области>/docs/...`.

#### A. `src/components/<ComponentName>/docs/developer-guide.md` — для разработчика админ-панели (внутренняя)
Аудитория — frontend-разработчик команды SREDA, ведущий `frontend-admin`. Описывает, как добавить/изменить компонент, зарегистрировать его в MF, написать тесты, прогнать типы, собрать и опубликовать. Живёт рядом с кодом компонента, чтобы документация не отставала от изменений в API.

#### B. `src/components/<ComponentName>/docs/integration-guide.md` — для разработчика host-приложения (внешняя)
Аудитория — frontend-разработчик **потребительского** сервиса, который встраивает экспортируемые компоненты в свой фронтенд. Описывает, как подключить MF-контейнер (`ADMINPANEL_UI_COMPONENTS`), какие ENV обязательны, как разрешать версии shared-зависимостей, как подхватить типы из `@mf-types/`, как откатиться на прошлую версию. Также кладётся в `src/components/<ComponentName>/docs/`, чтобы потребитель, скачавший snapshot репо, сразу видел контракт рядом с компонентом, который собирается подключать.

Для сквозной/общей документации (общая карта MF-контракта, общие ENV, общие правила версионирования — общие для нескольких компонентов) — место по умолчанию `src/components/_shared/docs/` (создаётся по мере необходимости).

### 3. Содержание `src/components/<ComponentName>/docs/developer-guide.md`

1. **Назначение репозитория.** `frontend-admin` — самостоятельная SPA админ-панели платформы SREDA и одновременно хост Module Federation. Запускается локально на `PORT=3000` (dev), собирается в Docker-образ на базе `nginx:stable-alpine-slim`.
2. **Структура репозитория** — `craco.config.js`, `src/App/`, `src/components/`, `src/pages/`, `src/settings/`, `src/helpers/`, `scripts/`, `vendors/`, `public/`, корневой `Dockerfile.development`. Скопировать из `GIGACODE.md`.
3. **Бутстрап окружения** — `npm ci --legacy-peer-deps` (с tarball-зависимостью `vendors/ui-kit/ui-kit-1.6.13.tgz`), `npm start` (3000), `npm run storybook` (6006). Раздел по прокидыванию `.env` (переменные `PUBLIC_URL`, `REACT_APP_BACKEND_PREFIX`, `REACT_APP_DOMAIN`, `ESB_HOST`, `REFERER`, `MODULE_FEDERATION_CONTAINER_NAME`, `MF_TYPES_PORT`, `PORT`, `DISABLE_ESLINT_PLUGIN`, `BUILD_PATH`, `HTTPS`).
4. **Карта существующих компонентов** — таблица «директория → назначение → MF-экспорт? → rootComponent? → routes?», взять реальные `package.json`:
   - MF-экспортируемые: `MetadataHier`, `MetadataWindow`, `Inspector`, `InspectorWindow`, `AccessMatrixDrawer`;
   - каркас админ-панели: `AdminPanel`, `Header`, `Metadata`, `MetadataForms`, `MetadataTable`, `PagesTree`, `AccessMatrix`, `MatrixTable`, `AdminSearch`;
   - UI-инфраструктура: `ui/`, `UIKit/`, `UiKitIcons`, `AdminUiKit`, `Utils`, `HOC`, `Errors`, `SessionContext`, `ThemeSwitchAgent`, `withPrivate`, `withRouter`;
   - формы/редакторы: `FormMetadata`, `CodeEditorCMP`, `LinkCMP`, `RankEditor`, `SelectSubscribeGroup`, `CommonInput`, `DRQueryBuilder`, `SortableList`, `SortableListItem`;
   - модальные/нотификации: `ModalError`, `ModalDetailedError`, `ModalSuccess`, `WindowsCMP`, `OffcanvasCMP`, `SkeletonSpinner`, `SkeletonsCMP`, `Loader`, `ApiError`, `FullscreenViewer`;
   - пользователи/атрибуты: `Users`, `UserAttribute`, `ProfileCMP`, `AuthForm`, `Avatar`, `Inspector`, `InspectorButtons`, `InspectorWindow`;
   - визуализация: `TreeCMP`, `Accordion`, `Icon`, `DevelopMacros`, `DetailsHeader`;
   - прочее: `AccessRestricted`, `statistics-agent-ui`, `PrivateComponent`, `sberComponents`, `Settings`.
5. **Создание нового компонента в `src/components/<Name>/`** — пошагово:
   - Создать директорию и обязательный `package.json`:
     ```json
     {
         "codeName": "MyComponent",
         "main": "index.js",
         "rootComponent": false,
         "routes": []
     }
     ```
   - Сделать `index.js` с default-export React-компонента.
   - Опционально — `constants.js` / `utilities.js` (подхватятся в общие агрегаторы через `filenameWithConstantsForTemplate` / `filenameWithUtilitiesForTemplate`).
   - Если компонент должен рендериться на верхнем уровне — `rootComponent: true`.
   - Если нужны роуты — описать `routes: [...]` в `package.json`.
   - Зарегистрировать в MF (если нужно встраивать извне): добавить `{ dir: 'MyComponent' }` в `MODULE_FEDERATION_EXPORT_COMPONENTS` (`craco.config.js`).
   - Перезапустить `npm start` (или `npm run refresh-module-federation-files`) — `scripts/buildSourceForTemplates.js` регенерирует `src/components/{index,constants,utilities,rootComponents,routes}.{js,ts}`.
   - Использовать алиасы (`components/...`, `helpers/...`, `ui/...`) вместо глубоких относительных путей.
6. **Регистрация нового MF-экспорта** — отдельный мини-раздел:
   - Добавить запись в `MODULE_FEDERATION_EXPORT_COMPONENTS`.
   - Убедиться, что директория содержит default-export React-компонент.
   - Проверить, что `shared` покрывает все используемые библиотеки (добавить запись, если нет).
   - Если в host-приложениях нужны типы — убедиться, что `FederatedTypesPlugin` подхватит директорию (см. `craco.config.js`).
7. **Маршрутизация** — короткий раздел со ссылкой на `.sdd/arh.md`:
   - Корневые роуты — в `src/App/App.js`.
   - Роуты компонентов — через `routes` в их `package.json`, попадают в `src/components/routes.js`.
   - `BrowserRouter.basename` берётся из `FRONTEND_PREFIX_PROCESSED` (`PUBLIC_URL`).
8. **Состояние** — `lite-react-statemanager` как singleton, инициализация в `src/initState.js`, ключи пользовательских данных — `userDataKeysDepended` в `src/settings/settings.js`.
9. **Стилизация** — Bootstrap 5 + SASS; компоненты импортируют CSS/SCSS локально; глобальные стили подключаются в `src/bootstrap.js` (`bootstrap/dist/css/bootstrap.min.css`, `bootstrap/dist/js/bootstrap.bundle.min.js`, `@fortawesome/fontawesome-free/css/all.min.css`).
10. **Формы** — React Hook Form + Joi resolvers; EditorJS и Draft.js для rich-text; типовые поля — в `MetadataForms`.
11. **Тестирование** — структура `src/components/<Name>/__tests__/*.test.{js,jsx,ts,tsx}`, Jest + Testing Library. Моки стилей/ассетов (`identity-obj-proxy`, `<rootDir>/__mocks__/fileMock.js`) уже настроены в `craco.config.js`. ESM-пакеты (`lite-react-statemanager`, `axios`, `bpmn-js`, `@bpmn-io/*`, `diagram-js`, `moddle`, `react-markdown`) включены в `transformIgnorePatterns`. Запуск: `npm test` (watch) / `npm run test:all` / `npx craco test --watchAll=false path/to/file.test.tsx`.
12. **Стандарты кода** — Prettier (4 пробела, одинарные кавычки в JS, двойные в JSX, `trailingComma=all`, `printWidth=127`), ESLint 8 (`airbnb` + `react-app` + `prettier`, TS parser), Husky через `prepare`. Class- и function-компоненты допустимы; новый код предпочтительно на function-компонентах. Imports — алиасы `components/*`, `helpers/*`, `ui/*`.
13. **Типы и TS** — `tsconfig.json` (strict, `baseUrl=src`, `paths`, `jsx=react-jsx`), `*` → `./@mf-types/*` для remote-типов. Проверка: `npm run ts-check`. Stale-типы — `npm run refresh-module-federation-files`.
14. **Сборка и публикация**:
    - Прод-сборка: `npm run build` (`HTTPS=true`), `npm run build:local` (без HTTPS), `npm run buildssldev` (в `adm_ui`, `PUBLIC_URL=/adm_ui`, verbose + debug), `npm run build:analyze` (BundleAnalyzer).
    - Storybook: `npm run storybook` (dev, 6006) / `npm run build-storybook` (статика).
    - Docker: `docker build -f Dockerfile.development -t adminpanel-ui:dev .` (multi-stage: `node:22.10-alpine3.19` install → build → `nginx:stable-alpine-slim`).
    - Изменения MF-контракта — через bump версии образа и changelog; host-приложения должны обновить `remoteUrl` и `npm run refresh-module-federation-files`.
15. **Observability** — OpenTelemetry Web SDK (`@opentelemetry/sdk-trace-web`, экспорт `otlp-http`, instrumentations `fetch`/`xml-http-request`/`document-load`/`user-interaction`), `reportWebVitals.js` для web-vitals.
16. **Обработка ошибок** — глобальный `window.error`-листенер в `src/bootstrap.js` глушит дефолтный React-error-overlay (намеренно). При локальной отладке — учитывать: ошибки видны только в console.
17. **Чек-лист перед PR** — см. ниже.

### 4. Содержание `src/components/<ComponentName>/docs/integration-guide.md`

1. **Что такое `ADMINPANEL_UI_COMPONENTS`** — Module Federation-контейнер, публикуемый `frontend-admin`. Экспортирует: `./MetadataHier`, `./MetadataWindow`, `./Inspector`, `./InspectorWindow`, `./AccessMatrixDrawer`. Контракт стабилен в рамках мажорной версии образа.
2. **Требования к host-приложению** — React 18, Webpack 5 + `ModuleFederationPlugin`, либо runtime через `<ModuleFederationCMP>`. Обязательные shared-зависимости с теми же версиями, что и в `frontend-admin/package.json`:
   ```json
   "shared": {
       "react": { "singleton": true, "requiredVersion": "^18.2.0" },
       "react-dom": { "singleton": true, "requiredVersion": "^18.2.0" },
       "react-router-dom": { "singleton": true, "requiredVersion": "6.0.2" },
       "lite-react-statemanager": { "singleton": true, "requiredVersion": "^1.0.7" }
   }
   ```
   Версии брать из `craco.config.js` и `package.json` текущего `frontend-admin`. Несоответствие мажорных версий = риск дублирования контекстов и состояний.
3. **Подключение через Static MF (рекомендуемый путь)** — `craco.config.js` host-приложения:
   ```javascript
   new ModuleFederationPlugin({
       name: 'HostContainer',
       remotes: {
           AdminPanel: 'ADMINPANEL_UI_COMPONENTS@https://<adminpanel-host>/remoteEntry.js',
       },
       shared: { /* см. п.2 */ },
   });
   ```
   Использование:
   ```jsx
   const MetadataWindow = React.lazy(() => import('AdminPanel/MetadataWindow'));
   // <Suspense fallback={<Loader />}><MetadataWindow {...props} /></Suspense>
   ```
4. **Подключение через Runtime MF (`<ModuleFederationCMP>`)** — для случаев, когда `remoteUrl`/`containerName`/`module` приходят из конфигурации:
   ```jsx
   <ModuleFederationCMP
       remoteModuleInfo={{
           remoteUrl: 'https://<adminpanel-host>/remoteEntry.js',
           containerName: 'ADMINPANEL_UI_COMPONENTS',
           module: './MetadataWindow',
       }}
       remoteComponentProps={{ /* пропсы */ }}
       loader={<Loader />}
   />
   ```
5. **Типизация** — `FederatedTypesPlugin` поднимает сервер на `MF_TYPES_PORT=31000` и складывает типы в `@mf-types/`. Host должен:
   - запустить свой dev-сервер с доступом к `MF_TYPES_PORT` (или проксировать);
   - в `tsconfig.json` добавить `"paths": { "*": ["./@mf-types/*", ...] }`;
   - при проблемах со stale-типами — `npm run refresh-module-federation-files` в host-репо.
6. **Обязательные ENV host-приложения** — таблица переменных, влияющих на интеграцию:
   | Var | Назначение | По умолчанию |
   | --- | --- | --- |
   | `PUBLIC_URL` | basename `BrowserRouter` | `''` |
   | `REACT_APP_BACKEND_PREFIX` | префикс backend-прокси | `'/api'` |
   | `REACT_APP_DOMAIN` | домен для URL | `''` |
   | `ESB_HOST` | цель для dev-прокси `/api` | `'localhost:3001'` |
   | `REFERER` | referer в прокси-запросах | `localhost:${PORT}` |
   | `MODULE_FEDERATION_CONTAINER_NAME` | override MF container | `'ADMINPANEL_UI_COMPONENTS'` |
   | `MF_TYPES_PORT` | порт MF types-сервера | `31000` |
   | `PORT` | порт dev-сервера | `3000` |
   | `DISABLE_ESLINT_PLUGIN` | отключить ESLint в сборке | `false` |
   | `BUILD_PATH` | каталог сборки | — |
   | `HTTPS` | включить HTTPS (прод) | `true` |
7. **Развёртывание adminpanel в Docker** — `docker build -f Dockerfile.development -t adminpanel-ui:dev .`, запуск за `nginx:stable-alpine-slim`, шаблон конфига — `docker/nginx/default.conf.template`. URL образа — `https://<adminpanel-host>/remoteEntry.js`.
8. **Что делать, если компонент сломался** — диагностика:
   - Проверить совпадение версий `shared` (см. п.2).
   - Проверить, что `ADMINPANEL_UI_COMPONENTS@<host>/remoteEntry.js` доступен и отдаёт 200.
   - Включить `WRITE_HTTP_LOG` (если предусмотрен в host) и смотреть сетевые ошибки.
   - Воспроизвести на dev-stend `frontend-admin`: `npm start`, открыть компонент в Storybook (`npm run storybook`).
   - Если воспроизводится — открыть issue/PR в `frontend-admin` с шагами воспроизведения (аналог `sbr publish --cr`). Не патчить компонент локально через fork без согласования.
9. **Как запросить новую фичу в компоненте** — issue/PR в `frontend-admin` в формате «Что / Зачем / Как воспроизвести / Сценарий в Storybook». Изменения контракта экспорта (props, перечень роутов) согласуются с владельцем `frontend-admin`.
10. **Версионирование и совместимость** — компоненты следуют semver в части MF-контракта (props, `exposes`). Перед bump мажорной версии — читать changelog `frontend-admin` и обновлять host-приложение. Если мажор несовместим — старый экспорт остаётся в `exposes` до окончания deprecation-периода.
11. **Чек-лист после подключения** — см. ниже.

### 5. Чек-листы

#### 5.1. Чек-лист перед PR (разработчик админ-панели)
- [ ] Директория компонента `src/components/<Name>/` создана, имя совпадает с `codeName` в `package.json`.
- [ ] `package.json` компонента содержит `codeName`, `main`, при необходимости `rootComponent: true`, `routes: [...]`, опционально `filenameWithConstantsForTemplate` / `filenameWithUtilitiesForTemplate`.
- [ ] `index.js` содержит default-export React-компонента.
- [ ] Если компонент экспортируется по MF — он добавлен в `MODULE_FEDERATION_EXPORT_COMPONENTS` (`craco.config.js`).
- [ ] Все shared-зависимости компонента (`react`, `react-dom`, `react-router-dom`, `lite-react-statemanager`, прочие импорты) указаны в `shared` `craco.config.js`.
- [ ] `scripts/buildSourceForTemplates.js` отрабатывает без ошибок (запускается автоматически при `npm start` / `npm run build`).
- [ ] `npm run ts-check` проходит без ошибок.
- [ ] `npm run test:all` (или `npm test` для затронутых файлов) зелёный.
- [ ] `npm run eslint` / `npm run prettier` без замечаний на изменённых файлах.
- [ ] Если компонент визуальный — добавлена Storybook-история (`*.stories.js|tsx`).
- [ ] Изменения MF-контракта отражены в changelog/README и не ломают существующие host-приложения (semver).
- [ ] Нет изменений в `src/components/{index,constants,utilities,rootComponents,routes}.{js,ts}` — это авто-генерируемые файлы, в git они не коммитятся.

#### 5.2. Чек-лист после подключения MF (разработчик host-приложения)
- [ ] Версии `react`, `react-dom`, `react-router-dom`, `lite-react-statemanager` в host совпадают (semver-compatible) с `frontend-admin/package.json` (см. `.sdd/arh.md`).
- [ ] `ADMINPANEL_UI_COMPONENTS@<adminpanel-host>/remoteEntry.js` отдаёт 200.
- [ ] `MF_TYPES_PORT=31000` доступен из host-окружения (для TS).
- [ ] В `tsconfig.json` host добавлен `"paths": { "*": ["./@mf-types/*", ...] }`.
- [ ] `npm run ts-check` в host не падает на remote-импортах.
- [ ] Runtime-проверка: компонент рендерится через `React.lazy(() => import('AdminPanel/<Name>'))` или `<ModuleFederationCMP>` без ошибок в консоли.
- [ ] Пропсы передаются согласно changelog текущей мажорной версии.
- [ ] Локально выполнен `npm run refresh-module-federation-files` после обновления `@mf-types/`.
- [ ] Если что-то не работает — открыт issue/PR в `frontend-admin`, а не локальный fork компонента.

### 6. Критерии приёмки

- Документы `src/components/<ComponentName>/docs/developer-guide.md` и `src/components/<ComponentName>/docs/integration-guide.md` (а также общие — `src/components/_shared/docs/`) существуют, отрендерены, перекрёстные ссылки не битые. Корневой `docs/` в репозитории **не используется**.
- Каждая команда (`npm ci`, `npm start`, `npm run build`, `npm run storybook`, `npm test`, `npm run ts-check`, `npm run eslint`, `npm run prettier`, `npm run refresh-module-federation-files`, `npm run build:analyze`, `npm run buildssldev`, `docker build -f Dockerfile.development …`) взята из реальных источников (корневой `package.json`, `.sdd/arh.md`, `README 2.md`, `craco.config.js`) и проверена локально.
- Все упоминаемые директории компонентов (`MetadataHier`, `MetadataWindow`, `Inspector`, `InspectorWindow`, `AccessMatrixDrawer`, …) реально присутствуют в `src/components/`.
- Таблица обязательных ENV совпадает с разделами «Переменные окружения» в `GIGACODE.md` и `src/settings/settings.js`.
- Кодовые фрагменты отформатированы по `.prettierrc.json` и проходят `eslint` (где есть `lint`-скрипт).
- Инструкция для разработчика выполнена «вхолостую»: создан компонент `src/components/ExampleDocCMP` со своим `package.json`, добавлен в `MODULE_FEDERATION_EXPORT_COMPONENTS` (опционально), `npm start` поднял dev-сервер, `npm test` зелёный, `npm run ts-check` проходит, Storybook-история рендерится.
- Инструкция для host-разработчика выполнена «вхолостую»: в минимальном host-репо подключён `ADMINPANEL_UI_COMPONENTS@http://localhost:3000/remoteEntry.js`, `React.lazy(() => import('AdminPanel/MetadataHier'))` рендерится, `tsc` на host не падает.
- Peer-review второго разработчика пройден, замечания устранены.
- Ревью руководителя отдела качества пройдено, соответствие корпоративным стандартам подтверждено.

### 7. Связанные источники

- `.sdd/arh.md` — каноническое описание архитектуры `frontend-admin`, MF-контракта, сборки, окружения.
- `GIGACODE.md` — компактный контекст проекта для ИИ-ассистента.
- `README 2.md` — детальное описание Module Federation (static + runtime, типизация).
- `README.md` — минимальная точка входа (`# adminpanel`).
- `craco.config.js` — реестр `MODULE_FEDERATION_EXPORT_COMPONENTS`, `shared`, `FederatedTypesPlugin`, jest-конфиг.
- `package.json` — npm-скрипты, `dependencies`, `devDependencies`, `resolutions`, `browserslist`.
- `src/settings/settings.js` — env-driven конфигурация (`PUBLIC_URL`, `REACT_APP_BACKEND_PREFIX`, `MODULE_FEDERATION_HOST_CONTAINER_NAME`, `userDataKeysDepended`).
- `src/App/App.js` — корневые роуты (`/`, `/adminpanel`).
- `src/bootstrap.js` — точка монтирования React + BrowserRouter + глобальный error-листенер.
- `scripts/buildSourceForTemplates.js` — генератор `components/{index,constants,utilities,rootComponents,routes}.{js,ts}`.
- `src/components/<Name>/` — каталог компонентов, эталоны: `AdminPanel`, `MetadataHier`, `MetadataWindow`, `Inspector`, `InspectorWindow`, `AccessMatrixDrawer`, `Metadata`, `MetadataForms`, `MetadataTable`, `AccessMatrix`, `Users`, `UserAttribute`, `FormMetadata`.
- `Dockerfile.development` — multi-stage: `node:22.10-alpine3.19` install → build → `nginx:stable-alpine-slim`.
