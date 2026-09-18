## Задача SRDMDLTKLN-504: Удаление неиспользуемых и устаревших модулей из `frontend-admin`

### 1. Контекст и архитектурная модель

`frontend-admin` построен на модели **«каждый компонент = мини-пакет»** (см. `.sdd/arh.md`, раздел «Структура директории `src/components`»): каждая директория в `src/components/<ComponentName>/` содержит собственный `package.json` с обязательными полями `codeName`, `main`, опционально — `rootComponent`, `routes`, `filenameWithConstantsForTemplate`, `filenameWithUtilitiesForTemplate`. Сканер `scripts/buildSourceForTemplates.js` на каждом запуске Webpack обходит эти манифесты и пересобирает авто-генерируемые агрегаторы (`src/components/{index,constants,utilities,rootComponents,routes}.{js,ts}`), которые **заgitignoreны**.

Одновременно `frontend-admin` — **хост Module Federation**: реестр `MODULE_FEDERATION_EXPORT_COMPONENTS` в `craco.config.js` жёстко фиксирует список компонентов, доступных host-приложениям через `remoteEntry.js`. Изменение экспортируемой номенклатуры — **breaking change** для downstream-потребителей и оформляется отдельной задачей.

Под **«модулем»** в этой задаче понимается **любая** из трёх сущностей:

| Тип модуля | Где живёт | Чем идентифицируется |
| --- | --- | --- |
| Внутренний компонент | `src/components/<Name>/` | Собственный `package.json` (`codeName`, `main`), импорты через `components/<Name>` |
| Внешняя npm-зависимость | `package.json` → `dependencies` / `devDependencies` | Имя пакета, версия, lock-файл |
| Ресурсный модуль (статический ассет, шрифт, иконка) | `src/css/`, `src/fonts/`, `src/images/`, `public/` | Импорты из кода, упоминания в `index.html` / Storybook-конфиге |

Под **«неиспользуемым»** понимается модуль, на который **нет ни одного импорта/ссылки** в исходном коде, конфигах, тестах, Storybook-историях, микро-фронтенд-манифестах и документации. Под **«устаревшим (legacy)»** — модуль, который:

- заменён другим компонентом (например, `MetadataUiKit` замещён `Accordion`/`AdminUiKit` — см. `src/components/Inspector/helpers/FormBuilderMetadata.tsx`, где `item.component === 'MetadataUiKit.Tabs'` транслируется в `Accordion`);
- ссылается на неподдерживаемые/необновляемые пакеты;
- не имеет покрытия тестами и не зарегистрирован в `MODULE_FEDERATION_EXPORT_COMPONENTS`;
- оставлен в дереве «по инерции» — раньше использовался, но был вытеснен новой реализацией.

### 2. Текущее состояние (baseline на момент актуализации задачи)

На дату актуализации задачи зафиксированы следующие следы legacy, подлежащие ревизии:

| Где | Что | Источник |
| --- | --- | --- |
| `src/components/Inspector/helpers/FormBuilderMetadata.tsx` | Хардкод-маппинг `MetadataUiKit.Tabs` → `Accordion` | Это означает, что legacy-имя `MetadataUiKit.*` всё ещё приходит извне (из метаданных) и транслируется в актуальные компоненты. |
| `src/components/Metadata/package.json` | `"MetadataUiKit": "^1.0.0"` в `dependencies` | Legacy-зависимость, перенесённая в локальный `package.json`. |
| `src/components/Inspector/README.md`, `src/components/MetadataForms/MetaInput/README.md` | Устаревшие ссылки на `MetadataUiKit.*` в примерах конфигурации метаданных | Документация отстала от кода. |

Каталог `src/components/` (~40 директорий, см. `list_directory src/components`) уже содержит **актуальные** модули (`ui/`, `UIKit/`, `UiKitIcons/`, `AdminUiKit/`, `Utils/`, `Accordion`, `Loader`, `SkeletonSpinner` и др.) — они являются приёмниками legacy-имён. Сами legacy-каталоги (`MetadataUiKit/`) в репозитории **отсутствуют**, что означает: либо они никогда не были директорией в `src/components/`, либо уже удалены в рамках ранних итераций.

> **Гипотеза к проверке:** legacy-привязки `MetadataUiKit.*` живут только как **имена компонентов в payload метаданных** (строка, приходящая с backend), а не как npm-пакеты или локальные директории. В этом случае полное удаление невозможно — нужно лишь держать актуальную таблицу транслитерации в `Inspector/helpers/FormBuilderMetadata.tsx`.

### 3. Аудитория и результаты

| Аудитория | Что получает |
| --- | --- |
| Разработчик админ-панели | Регламент: как определить, что модуль — кандидат на удаление; безопасный порядок удаления (без поломки MF-контракта и авто-агрегаторов). |
| Команда SREDA / тех-лид | Итоговый список удалённых модулей с обоснованиями (legacy-замена, не используется, дублирует функциональность), подтверждение, что ни один MF-экспорт не сломан. |
| Разработчик host-приложения | Никаких изменений в MF-контракте в рамках этой задачи. Если по итогам ревизии потребуется убрать что-то из `MODULE_FEDERATION_EXPORT_COMPONENTS` — оформляется **отдельной** задачей с changelog и отдельным PR. |

> **Важно.** Эта задача — про **чистку внутри репозитория `frontend-admin`**. Изменение состава экспортируемых MF-компонентов в `craco.config.js` не входит в скоуп, если только это не явное удаление компонента, который не используется ни одним host-приложением (см. п. 6 «Критерии приёмки»).

### 4. Подход и порядок выполнения

#### 4.1. Инвентаризация кандидатов на удаление

Сформировать таблицу кандидатов. Каждая строка — отдельный модуль, претендующий на удаление.

| Поле | Источник |
| --- | --- |
| Имя модуля | `src/components/<Name>/package.json` → `codeName` либо `package.json` → `dependencies/<name>` |
| Тип | Внутренний компонент / внешний пакет / ресурсный модуль |
| Где упоминается | `grep_search` по `src/`, `craco.config.js`, `scripts/`, `Storybook`-историям, `.sdd/`, `README*.md` |
| Есть ли MF-экспорт | `craco.config.js` → `MODULE_FEDERATION_EXPORT_COMPONENTS` |
| Есть ли `rootComponent: true` / `routes` | `src/components/<Name>/package.json` |
| Тестовое покрытие | Наличие `src/components/<Name>/__tests__/` |
| Обоснование удаления | legacy-замена / не используется / дублирует / не поддерживается |
| Риск | низкий / средний / высокий (ломает MF / Storybook / сборку) |

Команды инвентаризации:

```bash
# Внутренние ссылки на компонент
grep -RIn --include='*.{js,jsx,ts,tsx,json,md}' "<Name>" src/ craco.config.js scripts/

# Внешние ссылки в MF-реестре
grep -n "<Name>" craco.config.js

# Внешние ссылки в Storybook / README
grep -RIn "<Name>" src/components/<Name>/README.md 2>/dev/null || true

# Использование в собранных агрегаторах (если они есть в момент проверки)
grep -n "<Name>" src/components/{index,rootComponents,routes}.js 2>/dev/null || true

# Проверка зависимости в корневом package.json
node -e "const p=require('./package.json'); console.log(p.dependencies['<pkg>'], p.devDependencies['<pkg>'])"
```

#### 4.2. Классификация кандидатов

По итогам инвентаризации каждый кандидат попадает в одну из корзин:

1. **Удалить безусловно** — нет упоминаний ни в одном месте кода/конфигов (включая документацию и Storybook).
2. **Удалить после замены ссылок** — есть упоминания, но они подлежат замене на актуальные модули (например, `MetadataUiKit.Tabs` → `Accordion`). Перед удалением — выполнить замену и убедиться, что замены работают.
3. **Удалить из MF-экспорта** (отдельный шаг, отдельный PR) — модуль не востребован ни одним host-приложением, но ещё значится в `MODULE_FEDERATION_EXPORT_COMPONENTS`. Удаление из реестра — отдельная задача с changelog.
4. **Не удалять** — обоснованно нужен (используется, MF-экспортируется, есть тесты, ссылается актуальный код).

#### 4.3. Безопасный порядок удаления

Для каждого модуля из корзины 1 или 2:

1. **Снять с MF-экспорта** (если был) — отдельным коммитом/PR **до** физического удаления директории. Фиксирует состояние «больше не экспортируется» независимо от того, удалена ли папка.
2. **Заменить ссылки** (для корзины 2) — через `grep_search` найти все вхождения и заменить на актуальные модули. Прогнать `npm run ts-check` и `npm run test:all` на промежуточном коммите.
3. **Удалить директорию компонента** — `git rm -r src/components/<Name>/`.
4. **Удалить внешнюю зависимость** (если удаляется внешний пакет) — убрать из `dependencies` / `devDependencies` в `package.json`, прогнать `npm install --legacy-peer-deps`, убедиться, что `package-lock.json` обновлён.
5. **Обновить реестры**:
   - `craco.config.js` → `MODULE_FEDERATION_EXPORT_COMPONENTS` (если модуль там был и относится к корзине 3 — отдельной задачей).
   - `.sdd/arh.md` → раздел «Сводный реестр компонентов».
   - `src/App/docs/`, `src/components/_shared/docs/` — если есть документация, ссылающаяся на удаляемый модуль.
6. **Перегенерировать агрегаторы** — `npm run refresh-module-federation-files` или перезапустить `npm start`, чтобы `scripts/buildSourceForTemplates.js` пересобрал `src/components/{index,constants,utilities,rootComponents,routes}.js`. Проверить `git status` — изменённые агрегаторы **не должны попадать в коммит** (они в `.gitignore`).
7. **Финальная проверка** — `npm run ts-check`, `npm run test:all`, `npm run build:local`, `npm run eslint`, `npm run prettier`. Storybook — `npm run storybook`, убедиться, что удалённый модуль не появляется в навигации.

#### 4.4. Удаление ресурсных модулей

Для статических ассетов дополнительно проверить упоминания в `src/bootstrap.js` (глобальные CSS/JS импорты), `public/index.html`, Storybook-конфиге, относительные пути из кода.

#### 4.5. Особый случай: legacy-имена в payload метаданных

Если инвентаризация показывает, что `MetadataUiKit.*` упоминается **только** в:

- `src/components/Inspector/helpers/FormBuilderMetadata.tsx` (транслитерация);
- README-файлах компонентов (примеры конфигурации);
- payload-строках, приходящих с backend,

— то полное удаление невозможно. Действия в этом случае:

- Добавить раздел «Legacy-транслитерация имён компонентов» в `.sdd/arh.md` с явным указанием маппинга.
- Актуализировать README — заменить примеры с `MetadataUiKit.*` на актуальные компоненты (`Accordion`, `CodeEditorCMP`, …), оставив сноску: «если в метаданных встречается `MetadataUiKit.*` — оно автоматически транслируется в актуальный компонент через `FormBuilderMetadata.tsx`».
- Удалить декларацию `"MetadataUiKit": "^1.0.0"` из `src/components/Metadata/package.json` (только если в коде этого модуля действительно нет `import` из пакета `MetadataUiKit` — проверить `grep_search` по `src/components/Metadata/`).

### 5. Чек-листы

#### 5.1. Чек-лист перед удалением модуля

- [ ] Модуль идентифицирован однозначно (тип, точное имя, путь).
- [ ] Заполнена таблица инвентаризации (п. 4.1) — все упоминания найдены.
- [ ] Для компонент: проверены `package.json`, `__tests__/`, `rootComponent: true` / `routes`.
- [ ] Для внешнего пакета: проверены `package.json` (`dependencies`, `devDependencies`, `peerDependencies`, `resolutions`), `package-lock.json`.
- [ ] Для ресурса: проверены `src/bootstrap.js`, `public/index.html`, Storybook-конфиг.
- [ ] Если модуль в `MODULE_FEDERATION_EXPORT_COMPONENTS` — зафиксировано, что снятие с экспорта идёт **отдельным PR** (не смешивается с удалением).
- [ ] Если модуль имеет ссылки в коде — выполнена замена на актуальные модули, прогнан `npm run ts-check`.
- [ ] В `.sdd/arh.md` зафиксировано упоминание модуля (чтобы после удаления обновить «Сводный реестр компонентов»).

#### 5.2. Чек-лист во время удаления

- [ ] Удаление директории / пакета выполнено одним коммитом с осмысленным сообщением (`SRDMDLTKLN-504: remove <Name>`).
- [ ] Если модуль был в `MODULE_FEDERATION_EXPORT_COMPONENTS` — PR на снятие с экспорта оформлен **отдельно и смержен первым**.
- [ ] Если модуль был в `package.json` — обновлены `dependencies` / `devDependencies` / `peerDependencies` / `resolutions`, `npm install --legacy-peer-deps` отработал, `package-lock.json` закоммичен.
- [ ] Если есть ссылки в коде — выполнена замена и закоммичена отдельным коммитом **до** удаления.
- [ ] После физического удаления выполнен `npm run refresh-module-federation-files` или `npm start`.

#### 5.3. Чек-лист после удаления

- [ ] `npm run ts-check`, `npm run test:all`, `npm run build:local`, `npm run eslint`, `npm run prettier` — без ошибок.
- [ ] `npm run storybook` — удалённого модуля нет в навигации.
- [ ] `grep_search` по `src/`, `craco.config.js`, `scripts/` — упоминаний удалённого модуля не осталось.
- [ ] `git status` — авто-генерируемые файлы (`src/components/{index,constants,utilities,rootComponents,routes}.{js,ts}`, `@mf-types/`, `build/`) **не попали** в коммит.
- [ ] `.sdd/arh.md` → «Сводный реестр компонентов» обновлён.
- [ ] Storybook-конфиг / `.storybook/` обновлён, если удалённый модуль там фигурировал.

### 6. Критерии приёмки

- Сформирована и приложена к задаче **таблица инвентаризации** со всеми кандидатами на удаление (тип, источник, упоминания, обоснование, риск).
- Каждый модуль из корзины «удалить» физически отсутствует в репозитории (`git ls-files | grep -F "<Name>"` возвращает пусто), не упоминается ни в одном файле кода/конфигов (проверено `grep_search`).
- Если какой-либо из удалённых модулей был в `MODULE_FEDERATION_EXPORT_COMPONENTS` — соответствующий **отдельный PR на снятие с экспорта** оформлен и смержен **до** физического удаления директории.
- `package.json` и `package-lock.json` не содержат удалённых внешних зависимостей (проверено `node -e "Object.keys(require('./package.json').dependencies)"`).
- `npm run ts-check`, `npm run test:all`, `npm run build:local`, `npm run storybook` зелёные на финальном коммите.
- Документация (`.sdd/arh.md`, `src/components/_shared/docs/`, `src/App/docs/`, Storybook-описания) актуализирована — ссылки на удалённые модули отсутствуют.
- Для случая legacy-имён в payload (см. п. 4.5): актуализированы README, в `.sdd/arh.md` добавлен раздел «Legacy-транслитерация имён компонентов», таблица маппинга в `FormBuilderMetadata.tsx` покрыта unit-тестами.
- Авто-генерируемые файлы (`src/components/{index,constants,utilities,rootComponents,routes}.{js,ts}`, `@mf-types/`, `build/`) **не закоммичены**.
- Diff PR содержит только осмысленные изменения.
- Peer-review второго разработчика пройдено, замечания устранены.
- Ревью руководителя отдела качества пройдено.

### 7. Связанные источники

- `.sdd/arh.md` — каноническое описание архитектуры `frontend-admin`, разделы «Сводный реестр компонентов», «Структура директории `src/components`», «Расширение функциональности».
- `GIGACODE.md` — компактный контекст проекта, разделы «Component organization», «Module Federation usage».
- `craco.config.js` — реестр `MODULE_FEDERATION_EXPORT_COMPONENTS`, хелпер `processModuleExportComponentsConfig`.
- `scripts/buildSourceForTemplates.js` — генератор агрегаторов.
- `package.json` — `dependencies`, `devDependencies`, `peerDependencies`, `resolutions`, скрипты `refresh-module-federation-files`, `eslint`, `prettier`, `ts-check`, `test:all`, `build:local`, `storybook`.
- `src/components/<Name>/package.json` — обязательные поля `codeName`, `main`, `rootComponent`, `routes`, `filenameWithConstantsForTemplate`, `filenameWithUtilitiesForTemplate`.
- `src/components/<Name>/__tests__/` — Jest + Testing Library, конфиг в `craco.config.js` (`jest.configure`).
- `.gitignore` — список авто-генерируемых и сборочных артефактов, которые не должны попадать в коммит.
- `src/components/Inspector/helpers/FormBuilderMetadata.tsx` — пример транслитерации legacy-имён (`MetadataUiKit.Tabs` → `Accordion`), образец для п. 4.5.
- `src/components/Metadata/package.json` — пример legacy-зависимости `MetadataUiKit` в `dependencies` локального компонента.
- `src/components/Inspector/README.md`, `src/components/MetadataForms/MetaInput/README.md` — устаревшие ссылки на `MetadataUiKit` в README.
- `src/components/ui/`, `src/components/UIKit/`, `src/components/UiKitIcons/`, `src/components/AdminUiKit/`, `src/components/Utils/`, `src/components/CodeEditorCMP/` — кандидаты на роль «актуальной замены» для legacy-модулей.
