# Модуль `MetadataHier`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Архитектура](#architecture)
3. [Система иконок](#icon-system)
4. [Особенности применения](#apply-features)
5. [Интерфейсы данных](#data-interfaces)
6. [Actions и компоненты](#actions-and-components)
7. [TODO и доработки](#todo-and-upgrades)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Модуль `MetadataHier` реализует иерархическое дерево метаданных. Это основной компонент для навигации и управления объектами метаданных в системе.

**Основные функции**:
- Отображение иерархической структуры метаданных
- Динамическая загрузка узлов (lazy/eager loading)
- Выбор узлов (single и multi-select режимы)
- Управление узлами: добавление, редактирование, удаление, сортировка
- Поиск узлов по имени с поддержкой auto-expand путей
- Редактирование прав доступа через `AccessMatrixDrawer`
- Контекстное меню действий для каждого узла

## 2. Архитектура <a id="architecture" name="architecture"></a>

### Основные компоненты

```
MetadataHier (контейнер)
    ├─ TreeCMP (отображение дерева с поиском)
    │   ├─ Input (поле поиска)
    │   └─ TreeControlled (ui-kit компонент)
    └─ MetadataHierActions (кнопки действий над узлом)
```

### Используемые модули

| Модуль | Назначение | Тип |
|--------|------------|-----|
| `StateManager` | Глобальное состояние сервера | библиотека |
| `TreeCMP` | Компонент отображения дерева | внутренний |
| `MetadataHierActions` | Компонент кнопок действий | внутренний |
| `lib/service.ts` | Основная логика работы с деревом | TypeScript |
| `lib/scope.ts` | Управление scope в StateManager | TypeScript |
| `lib/normalize.ts` | Нормализация сырых данных узлов | TypeScript |
| `lib/flatAdapter.ts` | Адаптация к FlatTreeNode | TypeScript |
| `lib/treeMemo.ts` | Кэширование данных дерева | TypeScript |
| `lib/getActions.tsx` | Контекстное меню узла | TypeScript |
| `lib/keys.ts` | Вспомогательные функции ключей | TypeScript |
| `api/api.ts` | API запросы к бэкенду | TypeScript |
| `actions/` | Компоненты действий | внутренние |

### Состояние (ScopeState)

Каждый сервер имеет свою область видимости (scope) в StateManager:

```typescript
interface ScopeState {
    nodes: Map<string, NormalizedNode>;        // Все узлы дерева
    rootId: string | null;                      // ID корневого узла
    selectedIds: Set<string>;                   // Выбранные узлы
    expandedIds: Set<string>;                   // Развернутые узлы
    multiSelectMode: boolean;                   // Режим множественного выбора
    treeVersion: number;                        // Версия дерева (для обновлений)
}
```

### Нормализованный узел (NormalizedNode)

```typescript
interface NormalizedNode {
    nodeKey: string;        // Уникальный ключ узла (path в дереве: "rootId/childId")
    id: string;             // ID из базы данных (UUID)
    name: string;           // Наименование
    description: string;    // Описание
    crud: string[];         // CRUD-права: ['r', 'w', 'd'] - read, write, delete
    needToLoading: boolean; // Требуется ли загрузка детей
    ownerId: string | null; // ID владельца (class_id при отсутствии отдельного ownerId)
    classId: string | null; // ID класса
    class: string | null;   // Название класса (Fields, Indexes, Keys и т.д.)
    routes: string | null;  // Маршрут для API запросов
    parentId: string | null;// nodeKey непосредственного UI-предка в дереве
    childrenIds: string[];  // Массив ключей детей
    depth: number;          // Глубина в дереве (0 для корня)
    expandable: boolean;    // Может ли быть развернут (есть ли дети)
    isExpanded: boolean;    // Текущее состояние развертывания
    isLoading: boolean;     // Идет ли загрузка
    isLoaded: boolean;      // Загружены ли дети
    sortOrder: 'asc' | 'desc';  // Порядок сортировки детей
    loadStrategy: 'lazy' | 'eager';  // Стратегия загрузки детей
    icon: string | null;    // Токен иконки от backend (null — нет токена, используется эвристика)
}
```

### Стратегии загрузки

| Стратегия | Описание |
|-----------|----------|
| `lazy` | Дети загружаются при первом разворачивании узла (по умолчанию для большинства узлов) |
| `eager` | Дети загружаются вместе с родителем (когда `needToLoading === false` или узел имеет вложенные дети) |

### Публикация глобального выбора

При изменении выбора в дереве, результат публикуется в глобальное состояние:

```typescript
interface MetadataSelected {
    server: string;         // Имя сервера
    nodeKey: string;        // Ключ выбранного узла
    node: NormalizedNode;   // Данные выбранного узла
}
```

Это используется другими компонентами (например, `InspectorWindow`) для открытия инспектора выбранного объекта.

**Правила публикации** (из `service.ts`):
- Если включен множественный выбор → сброс глобального выбора
- Если выбрано не один узел → сброс глобального выбора
- Если узел не найден → сброс глобального выбора

### Ключи в StateManager

```javascript
// Scope для сервера (объект с состоянием дерева)
scopeKey(server) = `mh:${server}`

// Ключ для глобального выбора узла
METADATA_SELECTED_KEY = 'metadataSelected'

// Ключ для изменений узлов (для синхронизации между компонентами)
changeNodeKey(server) = `mh:${server}:changeNode`

// Ключ для редактируемых окон
EDIT_WINDOWS_KEY = 'editWindowKeys'

// Ключ для открытия редактора доступа
nodeAccessId = 'nodeAccessId'
```

### Система ключей

```typescript
// keys.ts
buildNodeKey(parentNodeKey: string | null, rawId: string): string
// Пример: buildNodeKey("root", "child-id") → "root/child-id"

isRootNodeKey(nodeKey: string): boolean
// Проверяет, является ли узел корневым (не содержит '/')
```

## 3. Система иконок <a id="icon-system" name="icon-system"></a>

Иконки для узлов выбираются через функцию `getIcon(node, nodes)` в `flatAdapter.ts`
по следующему приоритету:

### Приоритет 1: Токен от backend

Если в `NormalizedNode.icon` пришёл распознанный токен, он имеет абсолютный приоритет
над любой эвристикой:

| Backend-токен | Иконка (ui-kit) |
|---------------|-----------------|
| `folder` | `FolderIcon` |
| `wrench` | `SettingWrenchIcon` |
| `axis` | `AxisIcon` |
| `pencil` | `EditIcon` |
| `indexes` | `IndicatorBarIcon` |
| `keys` | `AccessGiveIcon` |
| `fkeys` | `AttachmentIcon` |

### Приоритет 2: Эвристика (fallback)

Если `icon === null` или токен не распознан (не находится в `icons`),
используется эвристика по `depth`, `class` и имени родителя:

| Условие | Иконка |
|---------|--------|
| `depth === 1` | `FolderIcon` |
| `depth === 2` | `SettingWrenchIcon` |
| `class === 'Fields'` | `AxisIcon` |
| `class === 'Indexes'` | `IndicatorBarIcon` |
| `class === 'Keys'` | `AccessGiveIcon` |
| `class === 'ForeignKeys'` | `AttachmentIcon` |
| `depth === 4` и родитель `name === 'Поля'` | `EditIcon` |
| **По умолчанию** (не подошло ни одно) | `FolderIcon` |

### Пример

Backend может прислать токен `"axis"` для узла таблицы индексов — иконка оси будет
использована независимо от `depth` и `class`. Если токен не прислан или неизвестен,
сработает эвристика по глубине/классу.
```

## 4. Особенности применения <a id="apply-features" name="apply-features"></a>

### Основной компонент

```typescript
interface IProps {
    actions: ReactNode[] | '*';   // Массив компонентов действий или '*' для всех
    server: string;               // Имя сервера ('mdm', 'analytics', '' для metadata)
}

<MetadataHier server="mdm" actions={[]} />
```

### Инициализация и жизненный цикл

```javascript
componentDidMount(): void {
    // Подписка на изменения состояния
    StateManager.subscribeState({
        [scopeKey(this.props.server)]: { [this.subName]: this.sync },
        [changeNodeKey(this.props.server)]: { [this.changeSubName]: this.onChangeNode },
    });

    // Загрузка корня дерева
    loadRoot(this.props.server).catch(console.error);
    this.sync();  // Синхронизация состояния
}

componentWillUnmount(): void {
    // Отписка от событий
    StateManager.unsubscribeState({
        [scopeKey(this.props.server)]: [this.subName],
        [changeNodeKey(this.props.server)]: [this.changeSubName],
    });

    // Очистка ресурсов
    this.clickTimers.forEach((t) => clearTimeout(t));
    this.clickTimers.clear();

    // Сброс выделения для этого сервера
    const sel = readMetadataSelected();
    if (sel?.server === this.props.server) writeMetadataSelected(null);

    clearScope(this.props.server);
    this.treeCache.reset();
}
```

### Развертывание узла (`onExpand`)

```javascript
private onExpand = (node: TreeDataControlled): void => {
    const { willLoad } = toggleExpanded(server, node.id);
    if (willLoad) loadChildren(server, node.id).catch(console.error);
};
```

Алгоритм:
1. Узел добавляется/удаляется из `expandedIds`
2. Если узел не загружен (`!isLoaded && !isLoading`) → `willLoad = true`
3. При `willLoad = true` → запускается `loadChildren()`

### Загрузка детей (`loadChildren`)

```javascript
async function loadChildren(server: string, nodeKey: string): Promise<void>
```

Алгоритм:
1. Проверяет, не загружен ли уже узел
2. Устанавливает `isLoading = true`
3. Отправляет запрос: `GET /{server}/metadata/v3/tree/{parentId}?order=[["name","ASC"]]`
4. Мержит детей в дерево (функция `mergeChildren`)
5. Обновляет состояние родителя: `isLoaded = true`, `isLoading = false`

### Клик по узлу (`onClick`)

```javascript
private onClick = (node: TreeDataControlled): void => {
    const { server } = this.props;
    const nodeKey = node.id;

    // Двойной клик (300ms) → открытие редактирования
    if (this.clickTimers.has(nodeKey)) {
        clearTimeout(this.clickTimers.get(nodeKey)!);
        this.clickTimers.delete(nodeKey);
        openEditNoEvent(server, nodeKey);  // Открыть форму редактирования
        return;
    }

    // Одинарный клик → выделение
    const t = window.setTimeout(() => {
        this.clickTimers.delete(nodeKey);
        handleNodeClick(server, nodeKey);  // Выделить узел
    }, 300);

    this.clickTimers.set(nodeKey, t);
};
```

### Режимы выбора

| Режим | Описание |
|-------|----------|
| **Single select** (по умолчанию) | Выделен один узел, который публикуется в `metadataSelected` для открытия инспектора |
| **Multi select mode** | Выделено множество узлов, активируется переключателем "множ. выбор" |

### Кнопки действий

```typescript
export enum Actions {
    EDIT = 'edit',                  // Редактирование узла
    ADD = 'add',                    // Добавление нового узла
    DELETE = 'delete',              // Удаление узла (поддерживает multi-select)
    SORT = 'sort',                  // Сортировка детей узла
    EDIT_ACCESS = 'edit-access',    // Редактирование прав доступа
    UPDATE = 'update',              // Обновление поддерева (поддерживает multi-select)
    OPEN_FILE_MANAGER = 'open-file-manager',  // Открытие файл-менеджера для узлов files
}
```

```javascript
<MetadataHierActions
    actions={[
        Actions.ADD,
        Actions.SORT,
        Actions.DELETE,
        Actions.EDIT_ACCESS,
        Actions.UPDATE,
        Actions.OPEN_FILE_MANAGER,
    ]}
    nodes={nodes}
/>
```

**Передача `'*'`**: отображает все доступные действия

### Поддержка множественного выбора

Каждое действие получает массив `nodes: TreeDataControlled[]` и самостоятельно
определяет, что с ним делать:

| Действие | Поведение при `nodes.length > 1` |
|----------|----------------------------------|
| `ADD`, `EDIT`, `EDIT_ACCESS`, `SORT`, `OPEN_FILE_MANAGER` | Скрываются (`return null`) |
| `DELETE` | Показывается, если хотя бы один узел имеет право `crud.includes('d')`. Удаляются только узлы с этим правом, после действия выделение сбрасывается |
| `UPDATE` | Показывается, если хотя бы один узел имеет `loadStrategy === 'lazy'` и развёрнут, либо среди них есть корень. Не учитываются узлы с `loadStrategy: 'eager'`. После действия выделение сбрасывается |

Действия в контекстном меню (`getContextMenuActions`) всегда работают
по отношению к одному узлу — контекстное меню вызывается только для одного
узла, поэтому массив `nodes` всегда содержит ровно один элемент.

### Поиск в дереве

```javascript
<TreeCMP
    server={server}
    data={treeData}
    searchValue={this.state.searchValue}
    onSearch={this.onSearch}
    searchFn={this.search}
/>
```

**Функция поиска (`searchFn`)**:
1. Преобразует запрос в нижний регистр
2. Ищет совпадения по имени узла
3. Строит множество найденных узлов (`matched`)
4. Строит множество узлов для показа (`show`), включая родителей найденных узлов
5. Строит множество развернутых узлов (`expanded`)
6. Возвращает отфильтрованный массив `FlatTreeNode[]`

### Движок обновлений

Компонент использует `treeVersion` для обновления дерева при изменениях:

```typescript
patch(server: string, p: Partial<ScopeState>): ScopeState {
    const prev = readScope(server);
    const bump = VERSIONED_FIELDS.some((f) => f in p);
    const next = {
        ...prev,
        ...p,
        treeVersion: bump ? prev.treeVersion + 1 : prev.treeVersion,
    };
    writeScope(server, next);
    publishGlobalSelectedIfNeeded(server, prev, next);
    return next;
}
```

`VERSIONED_FIELDS = ['nodes', 'expandedIds', 'selectedIds', 'rootId']`

## 5. Интерфейсы данных <a id="data-interfaces" name="data-interfaces"></a>

### RawNode (от API)

```typescript
interface RawBaseNode {
    id: string;             // UUID узла
    name: string;
    description: string;
    crud: string[];         // CRUD-права (например: ['r', 'w'])
    needToLoading: boolean; // Требуется ли загрузка детей
    icon?: string | null;   // Токен иконки от backend (null — нет токена)
}

interface RawRootNode extends RawBaseNode {}

interface RawChildNode extends RawBaseNode {
    owner_id: string;       // ID владельца
    class_id: string;       // ID класса
    class: string;          // Название класса (Fields, Indexes, Keys и т.д.)
    routes: string;         // Маршрут API
    children?: RawChildNode[];  // Вложенные дети
}
```

### API endpoints

```javascript
// Загрузка корня
GET /{server}/metadata/v3/tree?hideSubTree=true

// Загрузка детей
GET /{server}/metadata/v3/tree/{parentId}
    ?order=[["name","ASC"]]
    &hideSubTree=true
```

### Функции нормализации

```typescript
normalizeRootNode(raw: RawRootNode): NormalizedNode
normalizeChildNode(raw: RawChildNode, parentNodeKey: string, parentDepth: number): NormalizedNode
toRawNode(node: NormalizedNode): RawChildNode  // Для отправки на сервер при удалении
```

### Адаптация к ui-kit (flatAdapter.ts)

```typescript
buildFlatFromMap(
    rootKey: string,
    nodes: TreeMap,
    expandedIds: Set<string>,
    selectedIds: Set<string>,
    server: string,
): FlatTreeNode[]

adaptSingleNode(
    node: NormalizedNode,
    nodes: TreeMap,
    expandedIds: Set<string>,
    selectedIds: Set<string>,
    server: string,
): FlatTreeNode
```

**Структура FlatTreeNode** (из ui-kit):
```typescript
interface FlatTreeNode {
    id: string;                     // nodeKey
    title: string;                  // name
    parentId: string | null;
    level: number;
    opened: boolean;                // isExpanded
    contextMenuActions: ReactNode[]; // Контекстное меню
    icon: { icon: Icon, color: string };
    hasChildren: boolean;
    loading: boolean;
    isSelected: boolean;
}
```

### Получение списка выделенных узлов (service.ts)

Для передачи текущего выделения в `TreeCMP` и `MetadataHierActions` используется
хелпер `getSelectedFlatNodes`, возвращающий адаптированные узлы для всех
выделенных `nodeKey` (включая режим multi-select):

```typescript
getSelectedFlatNodes(server: string): FlatTreeNode[]
```

Если выделение пустое — возвращается пустой массив. Используется в `MetadataHier.render`:

```typescript
<TreeCMP
    server={server}
    current={getSelectedFlatNodes(server)}
    data={treeData}
    actions={this.renderActions}
/>
```

## 6. Actions и компоненты <a id="actions-and-components" name="actions-and-components"></a>

### AddAction

**Файл**: `actions/add/index.tsx`

**Props**:
```typescript
interface IActionProps {
    server: string;
    nodes: TreeDataControlled[];   // Массив узлов; при length > 1 действие скрывается
    children?: React.ReactNode;
    isInContextMenu?: boolean;    // Признак вызова из контекстного меню
}
```

**Функционал**:
- Возвращает `null`, если `nodes.length > 1` (только одиночное выделение).
- Проверяет наличие `routes` у узла
- Загружает форму создания через `fetchCreateForm(routes)`
- Открывает окно с `RenderFormBuilder`
- После сохранения вызывает `onSuccess()` для перезагрузки детей

**API**:
```javascript
GET  /{routes}/metadata                    // Форма создания
POST /{server}/{routes}/metadata           // Сохранение нового узла
PUT  /{server}/{routes}/metadata/{id}      // Обновление существующего
```

---

### EditAction

**Файл**: `actions/edit/index.tsx`

**Функционал**:
- Возвращает `null`, если `nodes.length > 1` (только одиночное выделение).
- Открывает окно редактирования через `openEditNoEvent()`
- Загружает существующую форму: `GET /{routes}/metadata/{id}`
- Использует `inspectorOnSave` из StateManager
- Отслеживает открытые окна через `editWindowKeys`
- При закрытии окна удаляет из списка: `removeOpenedEdit(winKey)`

---

### DeleteAction

**Файл**: `actions/delete/index.tsx`

**Функционал**:
- Фильтрует узлы по `crud.includes('d')`; если ни один узел не подходит — действие скрыто.
- Удаляет выбранные узлы (один или несколько при multi-select).
- Показывает подтверждение через `PopConfirm` с разным текстом для одного/нескольких объектов.
- Отправляет запрос: `DELETE /{routes}/metadata/{id}` для каждого узла параллельно.
- После успешного удаления:
  - Обновляет состояние через `handleNodeDelete()`
  - Сбрасывает выделение `clearSelectedIds()` (только если действие вызвано НЕ из контекстного меню)
  - Показывает сообщение об успехе

---

### UpdateAction

**Файл**: `actions/update/index.tsx`

**Функционал**:
- Из выделенных узлов фильтрует подходящие для обновления:
  - корневой узел (всегда);
  - узлы с `loadStrategy === 'lazy'`, которые сейчас развёрнуты.
  - Узлы с `loadStrategy: 'eager'` игнорируются.
- Если в выборке есть корень — выполняется `clearCache + reloadRootRecursively`.
- Иначе параллельно вызывается `handleReloadNode` для каждой цели.
- Если действие вызвано для нескольких узлов (`nodes.length > 1`), после успешного
  обновления выделение сбрасывается.

---

### SortAction

**Файл**: `actions/sort/index.tsx`

**Функционал**:
- Возвращает `null`, если `nodes.length > 1` (только одиночное выделение).
- Изменяет порядок сортировки детей узла (asc/desc)
- Доступен только для развернутых узлов с детьми
- Устанавливает `sortOrder` в состояние узла
- Обновляет `treeVersion` для перерисовки

---

### EditAccessAction

**Файл**: `actions/editAccess/index.tsx`

**Функционал**:
- Возвращает `null`, если `nodes.length > 1` (только одиночное выделение).
- Открывает `AccessMatrixDrawer` для редактирования прав доступа
- Устанавливает `nodeAccessId` в StateManager
- Drawer реагирует на это событие и открывается с `AccessMatrix`

---

### OpenFileManagerAction

**Файл**: `actions/openFileManager/index.tsx`

**Функционал**:
- Возвращает `null`, если `nodes.length > 1` (только одиночное выделение).
- Отображается только для узлов с `node.class === 'files'` (узел «Файлы» из `metadata-files`).
- При клике открывает окно `AdminUiKit.FileManagerWindow` (по аналогии с двойным кликом по узлу).

---

### getContextMenuActions (lib/getActions.tsx)

Возвращает массив действий для контекстного меню узла:

```typescript
getContextMenuActions(node: NormalizedNode, server: string): ReactNode[]
```

**Действия**:
1. Добавить
2. Сортировать
3. Удалить

Каждое действие имеет иконку и текстовую метку.

---

### styles.module.css

```css
.buttonContainer {
    cursor: pointer;
    padding-left: 5px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--ui-kit-colors-text-primary)
}

.buttonContainer:hover {
    background-color: var(--ui-kit-colors-basic-primary);
}
```

## 7. TODO и доработки <a id="todo-and-upgrades" name="todo-and-upgrades"></a>

- [ ] **Унификация API**: Синхронизировать формат данных между MetadataHier и другими модулями (например, MetadataForms)
- [ ] **Типизация**: Добавить строгую типизацию для всех API response и request
- [ ] **Контекст для доступа**: Создать `MetadataContext` для передачи `server` и других параметров без пропсов
- [ ] **Лоадеры при загрузке**: Добавить спиннеры при первоначальной загрузке дерева
- [ ] **Кастомизация иконок**: Позволить передавать кастомные иконки для классов
- [ ] **Debounce**: Добавить debounce для функции поиска
- [ ] **Lazy loading**: Реализовать ленивую загрузку компонентов действий
- [ ] **Пакетная обработка**: При массовых операциях (удаление нескольких узлов) использовать batch-запросы
- [ ] **События StateManager**: Унифицировать события (использовать Action types вместо строк)
- [ ] **Общие компоненты**: Вынести общие компоненты из модуля, напр. Actions
- [ ] **Форма редактирования**: Интеграция `FormBuilder` с `MetadataHier` без посредника `InspectorWindow`
- [ ] **Тесты**: Добавить юнит и интеграционные тесты

### Баги и неочевидное поведение
- [ ] **Синхронизация окон**: При открытии окна редактирования и инспектора одновременно возможны конфликты
- [ ] **Race conditions**: При быстром развертывании/сворачивании возможны race conditions в загрузке
- [ ] **Память**: При частом открытии/закрытии окон не всегда происходит полная очистка
