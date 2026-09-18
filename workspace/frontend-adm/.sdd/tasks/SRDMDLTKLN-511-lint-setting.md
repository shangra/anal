## Задача SRDMDLTKLN-511: Внедрение линтинга по стандарту App Store в `frontend-admin`

### 1. Контекст и архитектурная модель

`frontend-admin` — самостоятельная SPA админ-панели платформы SREDA (npm-имя `adminpanel_ui_app`, display name `adminpanel`), одновременно выступающая **хостом Module Federation** и экспортирующая компоненты в host-приложения. Качество кода критично по двум причинам:

1. **Код публикуется как MF-компоненты** — ошибки, пролезшие в экспорт, моментально попадают во все host-приложения, потребляющие `remoteEntry.js`.
2. **Каждый компонент = мини-пакет** с собственным `package.json` (см. `.sdd/arh.md`, «Структура директории `src/components`»). Без единого стиля репозиторий превращается в зоопарк соглашений.

Стандарт **App Store** в контексте SREDA подразумевает:

- **100% покрытие** линтером всего кода, попадающего в репозиторий и **развивающегося в нём**. Массово исключёнными могут быть только **неэкспортируемые** и **не развивающиеся** в текущем репозитории модули (например, директории, содержащие готовый стабильный код, в который текущая команда не вносит изменений).
- **Pre-commit husky-хук**, запускающий `eslint` + `prettier --check` на staged-файлах.
- **CI-шаг** с запуском `eslint` и `prettier --check` на полном диффе PR.
- **Единые правила** для всех репозиториев платформы — конфигурация линтинга берётся как есть, без локальных ослаблений (за исключениями, явно зафиксированными в `.eslintrc.js` и `.eslintignore`).

### 2. Текущее состояние (baseline на момент актуализации задачи)

Задача **де факто выполнена** в части, касающейся развивающегося кода репозитория. Зафиксированы следующие факты:

| Артефакт | Состояние | Где смотреть |
| --- | --- | --- |
| `.eslintrc.js` | Сконфигурирован: `airbnb + react-app + prettier`, TS-парсер, react-hooks, `no-unused-vars` с pattern `^_`. | `.eslintrc.js` |
| `.eslintignore` | Содержит **массовые исключения**, но только для **неэкспортируемых и не развивающихся** директорий: `ui/`, `UIKit/`, `UiKitIcons/`, `Utils/`, `HOC/`, `Errors/`, `Header/`, `ThemeSwitchAgent/`, `AuthForm/`, `Avatar/`, `ModalError/`, `ModalDetailedError/`, `OffcanvasCMP/`, `WindowsCMP/`, `CommonInput/`, `SelectSubscribeGroup/`, `SortableList/`, `SortableListItem/`, `RankEditor/`, `DRQueryBuilder/`, `CodeEditorCMP/`, `DevelopMacros/`, `PagesTree/`, `AccessRestricted/`, `PrivateComponent/`, `statistics-agent-ui/`, `ProfileCMP/`, `UserAttribute/`, `Users/`, `AdminSearch/`, `Accordion/`, `DetailsHeader/`, `Loader/`, `SkeletonSpinner/`, `SkeletonsCMP/`, `FullscreenViewer/`, `ApiError/`, `Icon/`, `LinkCMP/`, `ModalSuccess/`, `ErrorBoundary/`, `SessionContext/`, и др. (~40 директорий). | `.eslintignore` |
| `.prettierrc.json` | Сконфигурирован: 4 пробела, single quote (JS), double quote (JSX), `trailingComma=all`, `printWidth=127`. | `.prettierrc.json` |
| `.prettierignore` | Зеркалит `.eslintignore` для неэкспортируемых директорий + исключает `*.html`, `*.css`, `*.scss`, `*.json`, `*.sql`. | `.prettierignore` |
| **Под линтером** (НЕ в ignore) | Все компоненты, которые **экспортируются по MF** (`MetadataHier`, `MetadataWindow`, `Inspector`, `InspectorWindow`, `AccessMatrixDrawer`) и **развиваются** в текущем репозитории (новый код, активные фичи). | Сравнение `craco.config.js` `MODULE_FEDERATION_EXPORT_COMPONENTS` против `.eslintignore`. |
| Скрипты `eslint`, `prettier` | `eslint ./src/components --fix --config=.eslintrc.js` и `prettier ./src/components/**/*.{js,jsx,ts,tsx} --write`. | `package.json` |
| Husky | Установлен через `prepare`. `.husky/_/` — пусто (стандартное состояние husky v9, хуки лежат в `.husky/<hook>`). | `.husky/`, `package.json` |
| Webpack-ESLint | Плагин `ESLintWebpackPlugin` **намеренно вырезан** (`removePlugins(webpackConfig, pluginByName('ESLintWebpackPlugin'))`). В сборках выставлен `DISABLE_ESLINT_PLUGIN=true`. В dev — `ESLINT_NO_DEV_ERRORS=true`. | `craco.config.js`, `package.json` |

Таким образом, действующая политика проекта:

> **Линтер покрывает всё, что экспортируется и развивается в текущем репозитории.** Неэкспортируемые/не развивающиеся директории выведены из-под линта как «замороженный код» — изменения в них не планируются, линтер на них экономит время CI и не плодит шум.

### 3. Аудитория и результаты

| Аудитория | Что получает |
| --- | --- |
| Разработчик админ-панели | Локальный линтинг развивающегося кода (`npm run eslint`, IDE-интеграция), pre-commit husky-хук на staged-файлах. Понимание, что legacy-модули в ignore — это сознательное решение, а не забывчивость. |
| Команда SREDA / тех-лид | CI-джоба линтинга на diff PR, которая блокирует merge при наличии ошибок **в коде, попадающем в diff**. Сводка покрытия линтером — какие директории под контролем, какие заморожены. |
| Разработчик host-приложения | Никаких изменений в MF-контракте. Код экспортируемых компонентов под линтером — плюс к качеству. |

### 4. Что осталось сделать

Задача сводится к **фиксации и закрытию остатка**, а не к полному внедрению с нуля.

#### 4.1. Документация baseline'а

Добавить раздел «Линтинг и форматирование» в `src/App/docs/developer-handbook.md` (или создать `src/components/_shared/docs/lint-and-format.md`):

1. Где лежит конфигурация (`.eslintrc.js`, `.prettierrc.json`, `.eslintignore`, `.prettierignore`).
2. Текущая политика исключений: «под линтером — экспортируемые и развивающиеся модули; замороженный код — в ignore с явным обоснованием».
3. Как добавить новый модуль в `.eslintignore` (только если модуль **не экспортируется** и **не будет развиваться** в этом репо — иначе линтить обязательно).
4. Как вывести модуль из-под ignore (если модуль снова начинает развиваться — удалить соответствующую строку из `.eslintignore` / `.prettierignore`, прогнать `eslint --fix`).
5. Husky pre-commit → lint-staged.
6. CI-джоба `lint` (имя/расположение уточнить).
7. Локальные команды:
   - `npm run eslint` — авто-фикс.
   - `npm run eslint -- --no-fix ./src/components/<path>` — только проверка.
   - `npm run prettier` — авто-формат.
   - `npm run prettier -- --check` — только проверка.
8. Политика `// eslint-disable-next-line <rule>` (с обязательным комментарием «почему»).
9. Что делать, если линтер ругается на авто-сгенерированный файл (добавить в `.eslintignore`, не править руками).

#### 4.2. Husky pre-commit (если ещё не настроен)

1. Убедиться, что `.husky/pre-commit` существует и исполняем:

   ```sh
   #!/usr/bin/env sh
   npx --no-install lint-staged
   ```

2. Подключить `lint-staged` (если ещё не подключён) с конфигом в `package.json`:

   ```json
   "lint-staged": {
       "src/components/**/*.{js,jsx,ts,tsx}": [
           "eslint --config=.eslintrc.js --fix",
           "prettier --write"
       ]
   }
   ```

3. Локальная проверка: `git add <file>` → `git commit -m "test"` запускает хук, линтер отрабатывает на staged-файлах (только из не-ignore директорий), коммит блокируется при ошибке.

#### 4.3. CI-джоба `lint` (если ещё не настроена)

В CI-конфиге репозитория (`.gitlab-ci.yml` / `.github/workflows/*.yml` / Jenkinsfile — какой используется, уточнить) добавить джоб `lint`:

```yaml
lint:
    stage: quality
    script:
        - npm ci --legacy-peer-deps
        - npm run eslint -- ./src/components
        - npm run prettier -- ./src/components/**/*.{js,jsx,ts,tsx} --check
    rules:
        - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
        - if: '$CI_COMMIT_BRANCH == "main"'
    allow_failure: false
```

- Добавить в `needs:` основных build/test-джобов (либо в общий `stage: quality`).
- Merge в защищённые ветки заблокировать при упавшем `lint`.

#### 4.4. Комментарии-обоснования в `craco.config.js` и `package.json`

Зафиксировать **почему** в `craco.config.js` удалён `ESLintWebpackPlugin` и почему в `package.json` стоят `DISABLE_ESLINT_PLUGIN=true` / `ESLINT_NO_DEV_ERRORS=true`. Эти меры сознательные — стандарт App Store в SREDA не требует линтить на этапе webpack-сборки (CI и pre-commit достаточно), и двойной прогон избыточен.

Пример комментария рядом с `removePlugins(webpackConfig, pluginByName('ESLintWebpackPlugin'))` в `craco.config.js`:

```javascript
// ESLintWebpackPlugin удалён намеренно: линтинг выполняется pre-commit (husky + lint-staged)
// и в CI-джобе `lint` (см. SRDMDLTKLN-511). В продакшен-сборке дублирующий прогон избыточен.
removePlugins(webpackConfig, pluginByName('ESLintWebpackPlugin'));
```

Аналогичные комментарии — в `package.json` рядом со скриптами `build*`, `storybook`, `docker:start`.

#### 4.5. Политика ввода/вывода ignore-строк

Зафиксировать правило для команды:

| Ситуация | Действие |
| --- | --- |
| Создаётся **новый** компонент в `src/components/<Name>/`, экспортируется по MF или развивается в репо | Не добавлять в `.eslintignore`. Сразу писать по стандарту. |
| Создаётся **новый** компонент, который заведомо не будет экспортироваться и не будет развиваться в этом репо | Добавить в `.eslintignore` с комментарием «замороженный код» рядом со строкой (формат `# <Name>: не экспортируется, не развивается`). |
| Существующий компонент в `.eslintignore` начинает развиваться | Удалить строку из `.eslintignore` / `.prettierignore`, прогнать `npm run eslint --fix`, разрешить конфликты, закоммитить. |
| Существующий компонент выводится из MF-экспорта | Решение оставлять/убирать из `.eslintignore` — по согласованию с тех-лидом: если код всё ещё развивается — оставить под линтером. |

### 5. Чек-листы

#### 5.1. Чек-лист baseline'а

- [ ] В `.eslintignore` / `.prettierignore` нет ни одного **экспортируемого** модуля из `MODULE_FEDERATION_EXPORT_COMPONENTS` (`MetadataHier`, `MetadataWindow`, `Inspector`, `InspectorWindow`, `AccessMatrixDrawer`).
- [ ] В `.eslintignore` / `.prettierignore` нет ни одного модуля, в который текущая команда вносит изменения (по данным `git log --since="6 months ago" src/components/<Name>/`).
- [ ] `npm run eslint -- ./src/components` на развивающихся директориях возвращает **0 ошибок** (или явно зафиксированные `warn`).
- [ ] `npm run prettier -- ./src/components/**/*.{js,jsx,ts,tsx} --check` на развивающихся директориях возвращает **exit code 0**.

#### 5.2. Чек-лист husky + lint-staged

- [ ] `lint-staged` добавлен в `devDependencies` (если ещё не).
- [ ] Конфиг `lint-staged` в `package.json` присутствует.
- [ ] `.husky/pre-commit` создан, исполняемый, закоммичен.
- [ ] Локальная проверка: коммит с умышленно сломанным стилем в развивающейся директории блокируется с понятным сообщением.
- [ ] Коммит в замороженной директории (которая в `.eslintignore`) проходит без ошибок линта.

#### 5.3. Чек-лист CI

- [ ] В CI-конфиге есть джоб `lint`.
- [ ] Джоб запускается на MR/PR и на push в защищённые ветки.
- [ ] Джоб падает с понятным сообщением, если `npm run eslint` или `npm run prettier -- --check` находит нарушения.
- [ ] Merge в защищённые ветки заблокирован при упавшем `lint`.
- [ ] На тестовом PR проверено, что ошибка линта в развивающейся директории реально блокирует merge.

#### 5.4. Чек-лист документации

- [ ] Раздел «Линтинг и форматирование» существует (`src/App/docs/developer-handbook.md` или `src/components/_shared/docs/lint-and-format.md`).
- [ ] Зафиксирована текущая политика исключений (экспортируемые/развивающиеся — линтуются, замороженные — игнорируются с обоснованием).
- [ ] Описаны husky, CI, локальные команды, политика `eslint-disable`.
- [ ] Перекрёстные ссылки на `.eslintrc.js`, `.eslintignore`, `.prettierrc.json`, `.prettierignore`, `.husky/pre-commit`, скрипты `package.json` — рабочие.

### 6. Критерии приёмки

- **Политика зафиксирована:** `.eslintignore` / `.prettierignore` содержат только замороженные/неэкспортируемые модули. Подтверждено сравнением с `craco.config.js` → `MODULE_FEDERATION_EXPORT_COMPONENTS` и `git log` по `src/components/`.
- `npm run eslint -- ./src/components` на **всех директориях, не входящих в `.eslintignore`**, возвращает **0 ошибок**. Ворнинги допустимы, если явно зафиксированы в `.eslintrc.js` как `warn`.
- `npm run prettier -- ./src/components/**/*.{js,jsx,ts,tsx} --check` на **всех директориях, не входящих в `.prettierignore`**, возвращает **exit code 0**.
- `.husky/pre-commit` исполняемый, закоммичен, вызывает `lint-staged`. Локальный коммит в развивающейся директории со сломанным стилем блокируется.
- CI-джоба `lint` существует, запускается на MR/PR и push в защищённые ветки, падение блокирует merge.
- Документация (см. п. 4.1) существует, перекрёстные ссылки рабочие.
- Зафиксированы и прокомментированы места в `craco.config.js` и `package.json`, где `ESLintWebpackPlugin` удалён / `DISABLE_ESLINT_PLUGIN=true` / `ESLINT_NO_DEV_ERRORS=true`.
- `npm run ts-check`, `npm run test:all`, `npm run build:local` остаются зелёными.
- Peer-review второго разработчика пройдено, замечания устранены.
- Ревью руководителя отдела качества пройдено, соответствие корпоративному стандарту App Store подтверждено.

### 7. Связанные источники

- `.sdd/arh.md` — раздел «Стандарты кода», «Тестирование», «Архитектура».
- `GIGACODE.md` — раздел «Code Quality», `tsconfig.json`, `.eslintrc.js`, `.prettierrc.json`.
- `.eslintrc.js` — текущая конфигурация ESLint.
- `.eslintignore`, `.prettierignore` — текущие исключения (содержат только замороженные/неэкспортируемые модули).
- `.prettierrc.json` — текущая конфигурация Prettier.
- `package.json` — скрипты `eslint`, `prettier`, `ts-check`, `test:all`, `build*`, `docker:*`, `prepare` (husky), `lint-staged` (если подключён).
- `craco.config.js` — `removePlugins(webpackConfig, pluginByName('ESLintWebpackPlugin'))`, секция `devServer`.
- `.husky/_/`, `.husky/pre-commit` — текущее состояние husky v9.
- Husky v9+ документация (внешняя) — порядок создания хуков в репозитории.
- `lint-staged` документация (внешняя) — конфигурация staged-хуков.
- Стандарт App Store SREDA — внутренний документ платформы; на него ссылается эта задача.
- CI-конфигурация репозитория — место для джоба `lint`.
- `src/App/docs/developer-handbook.md` (или `src/components/_shared/docs/lint-and-format.md`) — место для раздела «Линтинг и форматирование».
- `Dockerfile.development` — multi-stage build с `DISABLE_ESLINT_PLUGIN=true` на этапе сборки (зафиксировать комментарием «почему»).
- `craco.config.js` → `MODULE_FEDERATION_EXPORT_COMPONENTS` — список экспортируемых модулей (baseline для проверки, что ни один не в ignore).
