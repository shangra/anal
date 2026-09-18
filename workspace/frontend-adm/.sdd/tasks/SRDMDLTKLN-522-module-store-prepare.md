## Задача SRDMDLTKLN-522: Перевод импортов MF-экспортируемых модулей `frontend-admin` на абсолютные пути и алиасы

### 1. Контекст и архитектурная модель

`frontend-admin` — **хост Module Federation** (см. `.sdd/arh.md`, раздел «Module Federation»). Через `craco.config.js` → `MODULE_FEDERATION_EXPORT_COMPONENTS` репозиторий экспортирует строго зафиксированный набор React-компонентов, которые загружаются в host-приложения через `remoteEntry.js` либо runtime-через `<ModuleFederationCMP>`. На момент актуализации задачи в реестре экспорта:

```javascript
const MODULE_FEDERATION_EXPORT_COMPONENTS = [
    { dir: 'MetadataHier' },
    { dir: 'MetadataWindow' },
    { dir: 'Inspector' },
    { dir: 'InspectorWindow' },
    { dir: 'AccessMatrixDrawer' },
];
```

Помимо этого, **фактически опубликованными** (через локальные `package.json` с полями `dependenciesReactCMS` / `dependenciesNodeCMS` или как дополнительные npm-пакеты) считаются также:

| Модуль | `codeName` | Где лежит |
| --- | --- | --- |
| `AccessMatrix` | `AccessMatrix` | `src/components/AccessMatrix/` |
| `AccessMatrixDrawer` | `AccessMatrixDrawer` | `src/components/AccessMatrixDrawer/` |
| `AdminUiKit` | `AdminUiKit` | `src/components/AdminUiKit/` |
| `Inspector` | `Inspector` | `src/components/Inspector/` |
| `InspectorButtons` | `InspectorButtons` | `src/components/InspectorButtons/` |
| `InspectorWindow` | `InspectorWindow` | `src/components/InspectorWindow/` |
| `MatrixTable` | `MatrixTable` | `src/components/MatrixTable/` |
| `MetadataForms` | `MetadataForms` | `src/components/MetadataForms/` |
| `MetadataHier` | `MetadataHier` | `src/components/MetadataHier/` |
| `MetadataTable` | `MetadataTable` | `src/components/MetadataTable/` |
| `MetadataWindow` | `MetadataWindow` | `src/components/MetadataWindow/` |
| `TreeCMP` | `TreeCMP` | `src/components/TreeCMP/` |

Пример декларации зависимостей в локальном `package.json` модуля (см. `src/components/MetadataWindow/package.json`):

```json
{
    "name": "metadata-window",
    "dependencies": { "react": "^18.2.0" },
    "dependenciesNodeCMS": {},
    "dependenciesReactCMS": {
        "MetadataHier": "^1.0.0"
    }
}
```

### 2. Текущее состояние (baseline на момент актуализации задачи)

Задача **де факто выполнена** в части, касающейся **межмодульных** импортов. Зафиксированы следующие факты:

| Проверка | Результат | Источник |
| --- | --- | --- |
| Поиск относительных импортов во всех 12 публикуемых модулях: `from '\.\./'`, `from '\./'` | **0 совпадений** | `grep -RInE "from\s+['\"]\.\.?" src/components/AccessMatrix/ src/components/AccessMatrixDrawer/ src/components/AdminUiKit/ src/components/Inspector/ src/components/InspectorButtons/ src/components/InspectorWindow/ src/components/MatrixTable/ src/components/MetadataForms/ src/components/MetadataHier/ src/components/MetadataTable/ src/components/MetadataWindow/ src/components/TreeCMP/` |
| Поиск относительных импортов по **всему** `src/components/` | **0 совпадений** | `grep -RInE "from\s+['\"]\.\.?" src/components/` |

То есть **межмодульных относительных импортов в публикуемых компонентах нет** — все импорты между модулями идут через алиасы `components/*`, `helpers/*`, `ui/*` (см. `craco.config.js` → `resolve.alias`).

При этом **внутримодульные** относительные импорты **допустимы и присутствуют** — это сознательное решение:

| Файл | Относительный импорт | Почему это нормально |
| --- | --- | --- |
| `src/components/MetadataWindow/index.tsx:4` | `import style from './md-window.module.css';` | Стиль лежит в одной папке с импортирующим файлом. |
| `src/components/MetadataWindow/SimpleModal.tsx:3` | `import styles from './md-window.module.css';` | То же. |
| `src/components/MetadataHier/index.tsx:12,22` | `import { ... } from './lib/service';`, `from './lib/scope';` | Внутри одной директории модуля (`MetadataHier/`). |
| `src/components/MetadataHier/actions/update/index.tsx:8` | `import { ... } from '../../lib/service';` | Внутри одного модуля, выход за пределы папки файла, но **внутри** `MetadataHier/`. |
| `src/components/MetadataHier/actions/{add,edit,delete,sort,editAccess}/index.tsx` | `import style from '../styles.module.css';` | Ассет модуля, путь стабилен относительно `MetadataHier/`. |

### 3. Политика импортов (принятое правило)

> **Внутри одного модуля (`src/components/<Module>/**`) относительные импорты допустимы — они остаются стабильными при рефакторинге внутренней структуры модуля и не зависят от того, как модуль публикуется.**
>
> **Между модулями — только алиасы.** Импорт другого компонента через `'../<OtherModule>/...'` запрещён; используется `'components/<OtherModule>/...'`.

Это правило зафиксировано в `.sdd/arh.md` и поддерживается следующими инвариантами:

1. **`craco.config.js` → `resolve.alias`** определяет базовые алиасы: `components` → `src/components`, `helpers` → `src/helpers`, `ui` → `src/components/ui`.
2. **В `tsconfig.json` (корневом) — `compilerOptions.paths`** дублирует эти алиасы, чтобы TypeScript резолвил то же самое при `tsc --noEmit`.
3. **В `.eslintrc.js` → `settings.import.resolver`** подключён `node` с `moduleDirectory: ['node_modules', 'src/', 'src/components']`, чтобы ESLint видел алиасы при линтинге.
4. **`shared` в `craco.config.js`** объявляет `react`, `react-dom`, `react-router-dom`, `lite-react-statemanager` как singletons — это гарантирует, что host и remote не подтянут разные экземпляры при стыковке.

### 4. Аудитория и результаты

| Аудитория | Что получает |
| --- | --- |
| Разработчик админ-панели | Чёткий стандарт: что можно, что нельзя. Возможность рефакторить структуру файлов внутри модуля без риска сломать импорты. |
| Разработчик host-приложения | Возможность встроить MF-компонент через `remoteEntry.js` (или npm-пакет) **без** воспроизведения внутренней файловой геометрии `frontend-admin`. Декларации `dependenciesReactCMS` совпадают с реальными импортами. |
| Тех-лид / владелец репозитория | Контракт публикации зафиксирован: «опубликованный модуль = package.json c явными зависимостями + алиасы для cross-module + допустимые относительные для внутримодульных». |

### 5. Что осталось сделать

Задача сводится к **закреплению baseline'а** и **устранению остаточных расхождений** (если они обнаружатся при ревью). Ниже — чек-лист финальных шагов.

#### 5.1. Закрепить baseline

1. Убедиться, что baseline-инварианты **не сломаны** на момент закрытия задачи:

   ```bash
   # Должно вернуть пусто
   grep -RInE "from\s+['\"]\.\.\?/.*components/" src/components/ \
       --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx'

   # Должно вернуть пусто (cross-module относительных нет)
   grep -RInE "from\s+['\"]\.\./" src/components/ \
       --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' | grep -v "styles.module.css"
   ```

2. Прогнать полную проверку:

   ```bash
   npm run refresh-module-federation-files
   npm run build:local          # сборка проходит
   npm run ts-check             # типы в порядке
   npm run test:all             # тесты зелёные
   npm run eslint -- ./src/components        # линтер зелёный (на не-ignore директориях)
   ```

3. Smoke-тест MF-потребления: поднять минимальный host-проект, подключить `ADMINPANEL_UI_COMPONENTS@http://localhost:3000/remoteEntry.js`, убедиться, что `React.lazy(() => import('AdminPanel/MetadataHier'))` и остальные 4 компонента рендерятся без `Cannot resolve module` ошибок.

#### 5.2. Сверка `package.json` модулей

Для каждого из 12 модулей проверить:

1. Прочитать `src/components/<Module>/package.json`.
2. Зафиксировать фактические импорты через `grep_search` (фильтр: только npm-импорты и `components/*`-импорты в другие локальные модули).
3. Сопоставить с `dependencies` / `dependenciesReactCMS` / `dependenciesNodeCMS`. Зафиксировать расхождения:
   - Фактический импорт есть, декларации нет → **добавить** декларацию (с версией, согласованной с корневым `package.json` или локальным `package.json` соответствующего модуля).
   - Декларация есть, импорта нет → **зафиксировать как кандидата на удаление**, передать в SRDMDLTKLN-504.
4. Версии `dependenciesReactCMS` должны соответствовать локальным `package.json` соседних модулей; версии `dependencies` — корневому `package.json`.

#### 5.3. Линтер-правило (опционально, как страховка)

Подключить (или перевести из `0` в `error`) правило, запрещающее относительные cross-module импорты в 12 публикуемых директориях:

```javascript
// .eslintrc.js
overrides: [
    {
        files: [
            'src/components/AccessMatrix/**',
            'src/components/AccessMatrixDrawer/**',
            'src/components/AdminUiKit/**',
            'src/components/Inspector/**',
            'src/components/InspectorButtons/**',
            'src/components/InspectorWindow/**',
            'src/components/MatrixTable/**',
            'src/components/MetadataForms/**',
            'src/components/MetadataHier/**',
            'src/components/MetadataTable/**',
            'src/components/MetadataWindow/**',
            'src/components/TreeCMP/**',
        ],
        rules: {
            'import/no-relative-packages': 'error',
        },
    },
],
```

Поскольку baseline уже чист (0 cross-module относительных импортов), включение правила сразу даёт `0 ошибок` и автоматически блокирует регрессию в новых PR.

#### 5.4. Документация

Добавить раздел «Правила импортов в публикуемых модулях» в `src/App/docs/developer-handbook.md` или `src/components/_shared/docs/mf-publishing.md`:

1. Таблица алиасов (`components/*`, `helpers/*`, `ui/*`).
2. **Правило:** внутри модуля — относительные; между модулями — только алиасы.
3. Примеры (правильно/неправильно).
4. Ссылка на `.eslintrc.js` правило (если подключено).
5. Ссылка на `craco.config.js` → `resolve.alias` и `shared`.
6. Ссылка на `tsconfig.json` → `compilerOptions.paths`.
7. Что делать, если линтер/типы ругаются на cross-module относительный импорт.

### 6. Чек-листы

#### 6.1. Чек-лист baseline'а

- [ ] `grep -RInE "from\s+['\"]\.\.?" src/components/` — возвращает **только** внутримодульные импорты (`./foo`, `../foo` в пределах одного `<Module>/`).
- [ ] Внутримодульные импорты: каждый `..` ведёт в файл внутри того же `<Module>/` (проверить по `realpath` или вручную).
- [ ] `npm run build:local`, `npm run ts-check`, `npm run test:all`, `npm run eslint` зелёные.

#### 6.2. Чек-лист сверки `package.json` (на модуль)

- [ ] Прочитан `src/components/<Module>/package.json`.
- [ ] Фактические импорты модуля зафиксированы.
- [ ] Расхождения с `dependencies` / `dependenciesReactCMS` / `dependenciesNodeCMS` обработаны (добавлены недостающие / переданы в SRDMDLTKLN-504 лишние).
- [ ] Версии `dependenciesReactCMS` соответствуют локальным `package.json` соседних модулей.
- [ ] Версии `dependencies` соответствуют корневому `package.json`.

#### 6.3. Чек-лист MF smoke-теста

- [ ] Поднят минимальный host-проект.
- [ ] Подключён `ADMINPANEL_UI_COMPONENTS@http://localhost:3000/remoteEntry.js`.
- [ ] `React.lazy(() => import('AdminPanel/MetadataHier'))` рендерится без ошибок.
- [ ] То же для `MetadataWindow`, `Inspector`, `InspectorWindow`, `AccessMatrixDrawer`.
- [ ] В консоли host-приложения нет `Module not found` / `Cannot resolve module`.

#### 6.4. Чек-лист линтер-правила

- [ ] `import/no-relative-packages` подключён для 12 публикуемых директорий (если принято решение усилить защиту).
- [ ] `npm run eslint -- ./src/components` — 0 ошибок (baseline + новое правило).

#### 6.5. Чек-лист документации

- [ ] Раздел «Правила импортов в публикуемых модулях» существует.
- [ ] Зафиксированы: алиасы, правило «внутри — относительные, между — алиасы», примеры, ссылка на правило ESLint.
- [ ] Перекрёстные ссылки на `craco.config.js`, `tsconfig.json`, `.eslintrc.js` — рабочие.

### 7. Критерии приёмки

- В каждом из 12 модулей (`AccessMatrix`, `AccessMatrixDrawer`, `AdminUiKit`, `Inspector`, `InspectorButtons`, `InspectorWindow`, `MatrixTable`, `MetadataForms`, `MetadataHier`, `MetadataTable`, `MetadataWindow`, `TreeCMP`) **нет относительных cross-module импортов**. Внутримодульные относительные импорты сохранены как норма. Подтверждено `grep_search` по всему `src/components/`.
- Каждый из 12 `src/components/<Module>/package.json` содержит **полный** набор зависимостей, соответствующих фактическим импортам:
  - npm-импорты → `dependencies` / `devDependencies`,
  - импорты в другие локальные компоненты → `dependenciesReactCMS` / `dependenciesNodeCMS`.
- `npm run ts-check`, `npm run test:all`, `npm run build:local`, `npm run storybook` зелёные.
- Smoke-тест MF-потребления (минимальный host-проект) проходит для всех 5 компонентов из `MODULE_FEDERATION_EXPORT_COMPONENTS`.
- В `.eslintrc.js` подключено правило `import/no-relative-packages` для 12 указанных директорий (если принято решение усилить защиту).
- Документация (`src/App/docs/developer-handbook.md` или `src/components/_shared/docs/mf-publishing.md`) содержит раздел «Правила импортов в публикуемых модулях» со ссылкой на правило и таблицей алиасов.
- Авто-генерируемые файлы (`src/components/{index,constants,utilities,rootComponents,routes}.{js,ts}`, `@mf-types/`, `build/`) **не закоммичены**.
- Peer-review второго разработчика пройдено, замечания устранены.
- Ревью руководителя отдела качества пройдено.

### 8. Связанные источники

- `.sdd/arh.md` — разделы «Module Federation», «Структура директории `src/components`», «Расширение функциональности».
- `GIGACODE.md` — разделы «Module Federation usage», «Component organization», «Path aliases».
- `craco.config.js` — `MODULE_FEDERATION_EXPORT_COMPONENTS`, `resolve.alias`, `shared`, `FederatedTypesPlugin`.
- `tsconfig.json` (корневой) — `compilerOptions.paths` для алиасов.
- `.eslintrc.js` — `settings.import.resolver`, `rules.import/no-relative-packages`.
- `package.json` (корневой) — версии `dependencies` для сверки.
- `src/components/MetadataWindow/package.json` — пример структуры `dependencies` / `dependenciesReactCMS` / `dependenciesNodeCMS`.
- `src/components/<Module>/package.json` (12 файлов) — действующие манифесты модулей.
- `src/components/MetadataWindow/index.tsx`, `src/components/MetadataHier/index.tsx`, `src/components/MetadataHier/actions/**/index.tsx` — примеры текущих внутримодульных относительных импортов (baseline).
- `scripts/buildSourceForTemplates.js` — генератор агрегаторов; не должен менять поведение от этой задачи.
- `Dockerfile.development` — baseline окружения.
- `src/App/docs/developer-handbook.md` (или `src/components/_shared/docs/mf-publishing.md`) — место для раздела «Правила импортов в публикуемых модулях».
- `README 2.md` — описание static/runtime MF-подключения.
- SRDMDLTKLN-504 — связанная задача: туда передаются «лишние» декларации зависимостей (есть в `package.json`, нет в импортах).
- SRDMDLTKLN-513 — задача по документации.
