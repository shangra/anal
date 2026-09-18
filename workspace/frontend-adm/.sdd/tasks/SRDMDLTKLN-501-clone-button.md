## Задача SRDMDLTKLN-501: Кнопка `Duplicate` в инспекторе сущности метаданных

### 1. Контекст и место в системе

`frontend-admin` (см. `.sdd/arh.md`) — Module Federation host и одновременно SPA админ-панели SREDA. В дереве `MetadataHier` сущности редактируются через инспектор (`InspectorWindow` / `AdminPanel`), правая часть которого собирается из набора кнопок-инспекторов (`src/components/InspectorButtons/<Name>/`). Каждая кнопка — отдельная директория со своим `package.json` (`codeName`) и `index.tsx`, автоматически подхватываемая билд-скриптом `scripts/buildSourceForTemplates.js` в агрегаторы (`src/components/index.js`, `src/components/InspectorButtons/index.js` и т. д.).

До этой задачи в инспекторе уже были `MetaCopyPaste`, `MetaEye`, `MetaMatrix`, `MetaCached`, `MetaDumpDB`, `MetaSchemaMigration`, `MetaConnectorTest`, `MetaOLAPPage`, `MetaPushToML` и т. д. **Кнопки дублирования сущности не было** — пользователь мог только скопировать/вставить значение поля (`MetaCopyPaste`), но не создать полную копию объекта с новыми именем и описанием.

### 2. Что должна делать кнопка

Пользователь открывает сущность метаданных в дереве → кликает «Дублировать» в инспекторе → открывается модальное окно с двумя полями:

- **«Наименование объекта»** — обязательное, валидируется по тому же правилу, что и в `FormBuilderMetadata` (`cleanString`: разрешены только латиница/кириллица/цифры, первый символ — буква).
- **«Описание объекта»** — автозаполняется из имени по тому же алгоритму, что и в `FormBuilderMetadata` (`convertNameToDescription`: перед каждой заглавной буквой имени вставляется пробел, первая буква описания приводится к верхнему регистру).

Пока имя пустое (после `cleanString`), кнопка «Дублировать» неактивна. По подтверждении:

1. Отправляется `POST /<server>/<route>/metadata` с телом:
   ```json
   {
     "owner_id": "<class_id если owner_id источника == ZERO_UUID, иначе owner_id>",
     "class_id": "...",
     "class": "...",
     "name": "<новое имя>",
     "description": "<новое описание>",
     "settings": { ...savedForm.data },
     "events": {}
   }
   ```
   Копируется только `savedForm.data` (последняя сохранённая версия), несохранённые изменения в инспекторе **не** переносятся.
2. После успешного POST перезагружается узел дерева родителя (`handleNodeAdd(server, parentKey)`), чтобы новый объект появился в дереве.
3. Публикуется событие `changeNode` в глобальный state (`StateManager`), чтобы другие окна (инспектор, таблицы, формы) могли отреагировать.
4. Закрывается модальное окно, показывается сообщение «Объект успешно дублирован».

### 3. Архитектурные решения

#### 3.1. Источник данных исходного узла — `readMetadataSelected()`

Для формирования тела POST нужно знать `routes`, `class_id`, `class`, `owner_id`, `parentId`. Эти поля лежат в `NormalizedNode`, который дерево хранит в scope'е `lite-react-statemanager`. В scope'е узлы индексируются по **nodeKey** (`<root>/<parentId>/<id>`), а в пропсы `MetaDuplicate` приходит только `id` (из JSON-схемы формы, как и у других кнопок-инспекторов).

Источник истины — глобальный singleton `METADATA_SELECTED_KEY` (`src/components/MetadataHier/lib/scope.ts`), в который `MetadataHier` пишет `{ server, nodeKey, node }` текущего выделенного узла. Поэтому:

- `getSourceNode()` берёт `readMetadataSelected()` и проверяет, что `selected.server === this.server` и `selected.node.id === this.props.id` (защита от рассинхрона при переключении сервера между открытием инспектора и кликом «Дублировать»).
- Если узел не выделен (например, пользователь открыл форму без выделения в дереве, либо выделение было сброшено другим действием) — пользователю показывается понятное сообщение «Не удалось получить данные исходного объекта (узел не выделен в дереве)» и POST не отправляется.

#### 3.2. Резолв маршрута (`resolveRoute`)

Приоритет:

1. Пропс `route` (если хост-схема его задаёт явно).
2. `sourceNode.routes` из scope (берётся бесплатно, без сети).
3. Fallback `metadataAPI.getAllMetadataInfoAboutEntity(id)` — только если 1) и 2) не сработали.

Это минимизирует дополнительные GET-запросы в типичном сценарии.

#### 3.3. Резолв `parentKey` для перезагрузки дерева

`handleNodeAdd(server, nodeKey)` (`MetadataHier/lib/service.ts`) принимает **nodeKey**, а `NormalizedNode.parentId` содержит **id** родителя (а не nodeKey). Поэтому в `MetaDuplicate` добавлен приватный `findNodeKeyById(parentId)` — линейный проход по `readScope(server).nodes` в поисках записи с `node.id === parentId`. Найденный nodeKey передаётся в `handleNodeAdd`.

> ⚠️ Альтернатива — вынести `findNodeKeyById` в публичный API `service.ts` (`getKeyByNodeId`). На текущей итерации оставлено приватным в `MetaDuplicate`, чтобы не трогать смежный модуль `MetadataHier`. Если поиск понадобится ещё где-то — выносится отдельной задачей.

Если `findNodeKeyById` возвращает `null` (родитель ещё не загружен в scope, например, корень или ленивый ancestor) — перезагрузка дерева молча скипается, чтобы не падать.

#### 3.4. Событие `changeNode`

Публикуется через `StateManager.setState({ changeNode: {...} })` — в той же форме, как это делает `InspectorWindow` и другие места. Соответствует контракту «источник события — произвольная строка» (`source: 'MetaDuplicate'`).

> Примечание: в `scope.ts` есть typed-хелпер `emitChangeNode(server, payload)`, использующий server-namespaced ключ `mh:<server>:changeNode`. Текущая задача оставлена на верхнеуровневом ключе `changeNode`, чтобы не ломать обратную совместимость с существующими потребителями. Миграция на typed-хелпер — отдельная задача.

#### 3.5. Авто-описание (логика `FormBuilderMetadata`)

Алгоритм `cleanString` / `capitalizeFirstLetter` / `convertNameToDescription` скопирован 1:1 из `src/components/MetadataHier/components/FormBuilderMetadata.tsx`. Это сознательное дублирование, обоснованное:

- README новой кнопки явно указывает «по тому же алгоритму, что и в `FormBuilderMetadata`» — это контрактное требование, не оптимизация.
- Извлечение в общий модуль выходит за рамки этой задачи и должно согласовываться с владельцами `FormBuilderMetadata` (см. п. 7).

`autoDescription` сбрасывается, как только пользователь вручную меняет описание (поле больше не пересчитывается из имени). При первом открытии модалки флаг выставляется, если текущее описание совпадает с `convertNameToDescription(name)` — иначе считается, что пользователь уже правил описание, и автоматика не включается.

### 4. Реализация

#### 4.1. Файлы

| # | Файл | Тип | Назначение |
| --- | --- | --- | --- |
| 1 | `src/components/InspectorButtons/MetaDuplicate/index.tsx` | создан | Сам компонент (class component). |
| 2 | `src/components/InspectorButtons/MetaDuplicate/package.json` | создан | Манифест компонента (`codeName: "MetaDuplicate"`, `main: "index.tsx"`). |
| 3 | `src/components/InspectorButtons/index.js` | изменён | Добавлены импорт и named export `MetaDuplicate`. |
| 4 | `src/components/InspectorButtons/README.md` | изменён | Описание компонента, параметры, пример JSON-конфигурации. |
| 5 | `src/components/index.js` | авто-регенерируется | Билд-скриптом `scripts/buildSourceForTemplates.js`. На текущей итерации обновлён вручную для немедленной консистентности (файл в `.gitignore`). |

> В репозитории есть файл `nul` (артефакт Windows) — не относится к задаче, удалить отдельно.

#### 4.2. Структура компонента

```tsx
export class MetaDuplicate extends Component<MetaDuplicateProps, MetaDuplicateState> {
    // props: id (обязателен), route?, title?, server?
    // state: opened, loading, saving, name, description, autoDescription, savedForm

    // server вычисляется в конструкторе: (props.server || '').replace(/\/+$/gm, '')

    // Хелперы имени:
    //   cleanString, capitalizeFirstLetter, convertNameToDescription
    //   (скопированы из FormBuilderMetadata)

    // Резолв данных:
    //   getSourceNode()        — через readMetadataSelected()
    //   findNodeKeyById(id)    — линейный поиск nodeKey в scope по id
    //   resolveRoute()         — пропс → sourceNode.routes → API fallback

    // UI flow:
    //   loadSavedForm()        — открывает модалку, GET /<server>/<route>/metadata/<id>
    //   handleNameChange       — cleanString + автопересчёт description
    //   handleDescriptionChange — ручное изменение, сброс autoDescription
    //   handleDuplicate        — POST + handleNodeAdd + emit changeNode
    //   handleCloseModal       — закрытие (no-op при saving)
    //   resetState             — сброс state
}
```

#### 4.3. Расположение кнопок «Отмена» / «Дублировать»

В модальном окне ui-kit пропс `actions` рендерится в шапке рядом с заголовком. Чтобы вынести кнопки в нижнюю часть окна, они помещены в `children`, в отдельный блок под полями ввода с `justify-content: flex-end`. Поведение идентично варианту «в actions»: «Отмена» закрывает модалку, «Дублировать» неактивна при пустом имени и во время сохранения.

### 5. Использование (JSON-схема)

Добавляется в форму (по аналогии с `MetaCopyPaste`):

```json
{
    "name": "MetaDuplicate",
    "component": "MetaDuplicate",
    "props": {
        "id": "1858caf2-b845-4175-9463-b1da250914e1",
        "title": "Дублировать"
    }
}
```

- `id` — обязателен, должен совпадать с `id` выделенного в дереве узла.
- `title` — tooltip на кнопке.
- `route` — опционально (в большинстве случаев определяется автоматически).
- `server` — опционально (по умолчанию берётся из контекста).

### 6. Аудитория и результаты

| Аудитория | Что получает |
| --- | --- |
| Оператор админ-панели | Кнопка «Дублировать» в инспекторе позволяет за секунды создать копию сущности с новым именем без повторного заполнения формы. |
| Backend-разработчик | Не меняется: POST-контракт `/<server>/<route>/metadata` уже поддерживался через `createSaveHandler` в `MetadataHier/actions/add/api/api.ts`. |
| Frontend-разработчик `frontend-admin` | Образец кнопки-инспектора с модалкой и авто-описанием; расширяемая структура для будущих похожих кнопок. |

### 7. Что осталось / открытые вопросы

- [ ] **Дублирование хелперов `cleanString` / `capitalizeFirstLetter` / `convertNameToDescription` с `FormBuilderMetadata.tsx`** — осознанная копия, контрактное требование. Вынести в общий модуль (например, `src/components/MetadataHier/lib/nameFormat.ts`) — отдельная задача, требует согласования с владельцами `FormBuilderMetadata`.
- [ ] **`ZERO_UUID` определён локально**, в `MetadataHier/lib/normalize.ts:64` тот же литерал. Экспорт из `normalize.ts` — отдельная задача.
- [ ] **`findNodeKeyById` приватный в `MetaDuplicate`**; при появлении второго потребителя — вынести в `service.ts` как `getKeyByNodeId`.
- [ ] **Миграция на `emitChangeNode`** (typed-хelper из `scope.ts`) — отдельная задача, требует аудита всех потребителей `changeNode`.
- [ ] **Inline-стили в `render()`** — Bootstrap-классы (`d-flex`, `gap-3`, `mt-2`, `justify-content-end`) могут заменить `style={{...}}` для консистентности с соседями (`MetaEye`, `MetaMatrix`). Не блокер.
- [ ] **Unit-тесты** — не написаны. Существующие кнопки (`MetaCopyPaste`, `MetaEye`) тоже без тестов; если тесты появятся, они должны покрыть: 1) авто-описание при изменении имени; 2) сброс `autoDescription` при ручном редактировании описания; 3) неактивность кнопки при пустом имени; 4) ветку «узел не выделен»; 5) перезагрузку дерева через `handleNodeAdd`.

### 8. Чек-листы

#### 8.1. Реализация

- [x] Создан `src/components/InspectorButtons/MetaDuplicate/index.tsx`.
- [x] Создан `src/components/InspectorButtons/MetaDuplicate/package.json` с `codeName: "MetaDuplicate"`.
- [x] Добавлен импорт и named export в `src/components/InspectorButtons/index.js`.
- [x] Обновлён `src/components/index.js` (генерируется автоматически, но обновлён вручную для немедленной консистентности).
- [x] Обновлён `src/components/InspectorButtons/README.md` (раздел `MetaDuplicate` в оглавлении, экспортах, полное описание).
- [x] Резолв `parentKey` через `findNodeKeyById` — перезагрузка дерева работает корректно.
- [x] Резолв `sourceNode` через `readMetadataSelected()` — защита от рассинхрона.

#### 8.2. Проверки

- [x] `npm run ts-check` — без новых ошибок (3 предсуществующие ошибки в `WindowsCMP/__tests__/tests/index.test.ts` к задаче не относятся).
- [x] `npx eslint src/components/InspectorButtons/MetaDuplicate/index.tsx` — без замечаний.
- [x] `npx prettier --check src/components/InspectorButtons/MetaDuplicate/index.tsx` — без замечаний.

#### 8.3. Проверки в runtime

- [x] Открытие модалки → поля предзаполнены текущими `name` / `description`.
- [x] Изменение имени → описание пересчитывается автоматически.
- [x] Ручное изменение описания → автопересчёт прекращается.
- [x] Пустое имя (после `cleanString`) → «Дублировать» неактивна.
- [x] POST → новый объект появляется в дереве родителя.
- [x] Закрытие модалки во время `saving` — игнорируется.

### 9. Связанные источники

- `src/components/InspectorButtons/MetaCopyPaste/` — ближайший аналог (использует `$modal` + `$api` + `StateManager`).
- `src/components/InspectorButtons/MetaEye/` — пример чтения `routes` через `getAllMetadataInfoAboutEntity`.
- `src/components/MetadataHier/components/FormBuilderMetadata.tsx` — источник `cleanString`, `capitalizeFirstLetter`, `convertNameToDescription`, `autoDescription` (скопировано).
- `src/components/MetadataHier/actions/add/api/api.ts` — источник паттерна `createSaveHandler` (форма тела POST).
- `src/components/MetadataHier/lib/service.ts` — `handleNodeAdd`, `getNodeByKey`.
- `src/components/MetadataHier/lib/scope.ts` — `readMetadataSelected`, `readScope`, `ChangeNodePayload`.
- `src/components/MetadataHier/lib/normalize.ts` — `toRawNode`, `NormalizedNode`.
- `src/components/MetadataHier/types.ts` — `NormalizedNode` (type).
- `src/components/MetadataHier/actions/types.ts` — `FormSchema`.
- `src/components/Metadata/MetadataAPI` — `getAllMetadataInfoAboutEntity` (fallback для route).
- `src/components/ui/MyFlash/message.helper` — `$message`.
- `helpers/axios` — `$api`.
- `lite-react-statemanager` — `StateManager` (singleton состояния).
- `ui-kit` — `Modal`, `IconButton`, `Input`, `Button`, `DublicateIcon`.
- `scripts/buildSourceForTemplates.js` — автогенерация агрегаторов `src/components/index.js` и т. д.
- `craco.config.js` — `MODULE_FEDERATION_EXPORT_COMPONENTS` (для этого компонента НЕ добавляется, поскольку задача про инспекторскую кнопку, а не про MF-экспорт).
- `.sdd/arh.md` — общая архитектура `frontend-admin`.
- `.sdd/tasks/SRDMDLTKLN-417-icons-from-back.md` — пример формата `tasks/*.md`.
- `.sdd/tasks/SRDMDLTKLN-410-metadataforms-server-required.md` — пример подробного анализа задачи.
