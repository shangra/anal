# listSettings — Управление настройками списков (Facets)

## Overview

`listSettings` — это хелпер-пакет для управления **настройками отображения списков метаданных** (фильтрация, группировка, сортировка, условное форматирование). Пакет реализует **facet-архитектуру**: каждая настройка — независимый «фасет» со своим хранилищем, но все они общаются через единый **revision bus** для синхронизации перерисовки React.

---

## Directory Structure

```
listSettings/
├── index.ts                           # Публичный API — barrel export всего пакета
│
├── core/                              # === ОБЩЕЕ ЯДРО ===
│   ├── types.ts                       # FacetId, Scope
│   ├── revisionBus.ts                 # Pub/Sub шина ревизий (уведомления о изменениях)
│   └── createFacetStore.ts            # Фабрика универсальных facet-хранилищ
│
├── facets/                            # === ФАСЕТЫ (настройки) ===
│   ├── selection/                     # Отбор (фильтры)
│   │   ├── types.ts                   # SelectionNode, SelectionCondition, SelectionGroup,
│   │   │                              # 10 операторов сравнения, mapping по типам полей
│   │   ├── tree.ts                    # immutable tree manipulation (add/remove/group/move)
│   │   ├── store.ts                   # selectionSettingsActions (CRUD + group/ungroup)
│   │   └── apply.ts                   # Matching engine (фильтрация строк по условиям)
│   │
│   ├── grouping/                      # Группировка по полям
│   │   ├── types.ts                   # GroupingSettingsState (selected + disabled)
│   │   ├── store.ts                   # groupingSettingsActions (add/remove/reorder/toggle)
│   │   └── apply.ts                   # applyGroupingToFlatRows → groupTableRows()
│   │
│   ├── sort/                          # Сортировка (заглушка)
│   │   ├── types.ts                   # SortRule, SortSettingsState
│   │   └── store.ts                   # sortSettingsActions (CRUD + reorder + toggle)
│   │
│   └── conditionalFormatting/         # Условное форматирование
│       ├── types.ts                   # ConditionalFormattingRule, ConditionalAppearance
│       ├── store.ts                   # conditionalFormattingSettingsActions
│       └── apply.ts                   # formatCellBy1CFormat, appearanceToCssProperties
│
├── fields/                            # === ТИПЫ ПОЛЕЙ ===
│   ├── types.ts                       # ListFieldDataType (6 канонических типов)
│   └── catalog.ts                     # Field catalog + lookup утилиты
│
├── pipeline/                          # === ИСПОЛНИТЕЛЬНЫЙ ПАЙПЛАЙН ===
│   ├── types.ts                       # ActiveListView, ListViewApplyResult
│   ├── getActiveListView.ts           # Агрегация активного состояния всех фасетов
│   └── applyListView.ts               # Execution pipeline (selection → grouping)
│
└── react/                             # === REACT ИНТЕГРАЦИЯ ===
    └── attachRevision.ts              # Подключение React-компонентов к revision bus
```

---

## Архитектура

### High-level схема

```
listSettings (пакет)
 │
 ├── Core (ядро)
 │    ├── createFacetStore<T>() — фабрика фасет-хранилищ
 │    │    ├── localStorage persistence (с legacy migration)
 │    │    ├── StateManager интеграция
 │    │    └── emitListSettingsRevision() после каждого commit
 │    │
 │    └── revisionBus — pub/sub шина
 │         ├── subscribeListSettingsRevision(name, listener)
 │         ├── emitListSettingsRevision() — bump revision + notify
 │         └── unsubscribeListSettingsRevision(name)
 │
 ├── Facets (настройки)
 │    │
 │    ├── SELECTION (отбор/фильтры)
 │    │    ├── types.ts     — Модель дерева: SelectionNode = Condition | Group
 │    │    ├── tree.ts      — Immutable tree manipulation
 │    │    ├── store.ts     — selectionSettingsActions (CRUD + group/ungroup + move)
 │    │    └── apply.ts     — Matching engine (10 операторов сравнения)
 │    │
 │    ├── GROUPING (группировка)
 │    │    ├── types.ts     — State: selectedGroupFields + disabledGroupFields
 │    │    ├── store.ts     — groupingSettingsActions (add/remove/reorder/toggle)
 │    │    └── apply.ts     — groupTableRows(rows, activeGroupFields)
 │    │
  │    ├── SORT (сортировка)
  │    │    ├── types.ts     — Model: SortRule, SortSettingsState
  │    │    └── store.ts     — sortSettingsActions (add/remove/reorder/toggle/direction)
  │    │
  │    └── CONDITIONAL FORMATTING (условное форматирование)
  │         ├── types.ts     — Model: ConditionalFormattingRule, ConditionalAppearance
  │         ├── store.ts     — conditionalFormattingSettingsActions (CRUD + move)
  │         └── apply.ts     — formatCellBy1CFormat, appearanceToCssProperties, ruleMatchesCondition
 │
 ├── Fields (типы полей)
 │    ├── normalizeListFieldDataType(raw) → ListFieldDataType
 │    └── listFieldCatalog() → { value, label, dataType }[]
 │
 ├── Pipeline (исполнение)
 │    ├── getActiveListView() → ActiveListView (агрегация всех фасетов)
 │    └── applyListViewToFlatRows(rows, view) → ICell[][] | ITreeRow[]
 │         │
 │         ├── Шаг 1: applySelectionToFlatRows(rows, selectionNodes) — фильтр
 │         └── Шаг 2: applyGroupingToFlatRows(selected, groupFields) — группировка
 │
 └── React (интеграция)
      └── attachListSettingsRevision(host, name) → unsubscribe
           └── host.setState({ listSettingsRevision: current })
```

### Поток данных

```
User action (в UI)
    │
    ▼
selectionSettingsActions.addSelectionConditions(['field1'])
    │
    ├── findNodeLocation() → ищем в дереве
    ├── updateSelectionNodeById() → immutable update
    ├── store.commit({ selectionNodes }) → StateManager + localStorage
    └── emitListSettingsRevision() → revision++ → notify listeners
                                         │
                                         ▼
                              React components re-render
                                         │
                                         ▼
                              applyListViewToFlatRows(rows)
                                         │
                                         ├── filter by selection
                                         └── group by fields
```

---

## Facet: Selection (Отбор / Фильтры)

### Модель данных

Дерево узлов, каждый узел — либо условие, либо группа:

```typescript
type SelectionNode = SelectionCondition | SelectionGroup

interface SelectionCondition {
    id: string                    // уникальный ID
    field: string                 // ключ поля
    comparison: SelectionComparison // оператор
    value: string                 // значение для сравнения
    enabled: boolean              // вкл/выкл
}

interface SelectionGroup {
    id: string
    logic: 'and' | 'or' | 'not'   // логика группы
    enabled: boolean
    children: SelectionNode[]     // вложенные узлы
}
```

### Операторы сравнения

| Код | Название | Требует значение | Доступно для |
|-----|----------|------------------|--------------|
| `eq` | Равно | ✅ | все типы |
| `ne` | Не равно | ✅ | все типы |
| `gt` | Больше | ✅ | number, date |
| `gte` | Больше или равно | ✅ | number, date |
| `lt` | Меньше | ✅ | number, date |
| `lte` | Меньше или равно | ✅ | number, date |
| `contains` | Содержит | ✅ | string, uuid, unknown |
| `notContains` | Не содержит | ✅ | string, uuid, unknown |
| `filled` | Заполнено | ❌ | все типы |
| `empty` | Не заполнено | ❌ | все типы |

### Mapping операторов по типу поля

| Тип поля | Доступные операторы |
|----------|---------------------|
| `string` | eq, ne, contains, notContains, filled, empty |
| `number` | eq, ne, gt, gte, lt, lte, filled, empty |
| `date` | eq, ne, gt, gte, lt, lte |
| `boolean` | eq, ne |
| `uuid` | eq, ne, contains, notContains, filled, empty |
| `unknown` | eq, ne, contains, notContains, filled, empty |

### Tree manipulation (immutable)

Все операции возвращают **новое** дерево, не мутируя исходное:

| Функция | Описание |
|---------|----------|
| `findNodeLocation(nodes, id)` | Находит узел по ID, возвращает { parentId, parentChildren, index, node } |
| `mapSelectionTree(nodes, mapper)` | Map по всем узлам дерева |
| `updateSelectionNodeById(nodes, id, patch)` | Обновить узел по ID |
| `removeSelectionNodesByIds(nodes, ids)` | Удалить узлы по ID |
| `groupSelectionNodes(nodes, ids, logic)` | Сгруппировать sibling-узлы в AND/OR/NOT группу |
| `ungroupSelectionNodes(nodes, ids)` | Разгруппировать (распаковать детей группы) |
| `setSelectionGroupLogic(nodes, groupId, logic)` | Изменить логику группы |
| `moveSelectionNodes(nodes, ids, direction)` | Переместить вверх/вниз |
| `canGroupSelectionNodes(nodes, ids)` | Проверка: можно ли сгруппировать |
| `canUngroupSelectionNodes(nodes, ids)` | Проверка: можно ли разгруппировать |

### Matching Engine (`apply.ts`)

Фильтрация строк по дереву условий:

```typescript
// Рекурсивная оценка дерева
nodeMatchesSelection(cells, node): boolean
    ├── Если node.disabled → true (игнорируем)
    ├── Если condition → conditionMatches(cells, condition)
    │    └── Сравнивает cellValue condition.comparison condition.value
    └── Если group → зависит от logic:
         ├── 'and' → every(child → matches)
         ├── 'or'  → some(child → matches)
         └── 'not' → !every(child → matches)

// Пайплайн для строк
rowMatchesSelectionTree(cells, nodes): boolean
    → roots.every(node → nodeMatchesSelection)

applySelectionToFlatRows(rows, nodes): rows[]
    → rows.filter(row → rowMatchesSelectionTree)
```

### Операторы сравнения (реализация)

```typescript
COMPARISON_HANDLERS = {
    filled:     (cell) => !isEmptyValue(cell),
    empty:      (cell) => isEmptyValue(cell),
    eq:         (cell, val) => toComparableString(cell) === val,
    ne:         (cell, val) => toComparableString(cell) !== val,
    contains:   (cell, val) => cell.toLowerCase().includes(val.toLowerCase()),
    notContains:(cell, val) => !cell.toLowerCase().includes(val.toLowerCase()),
    gt/gte/lt/lte: compareOrdered(cell, val, predicate)
                  → smart numeric/date-aware ordering
}
```

`compareOrdered` — интеллектуальное сравнение:
1. Пробует как числа → если оба парсятся → числовое сравнение
2. Пробует как даты → если обе парсятся → timestamp comparison
3. fallback → lexicographic string comparison

---

## Facet: Grouping (Группировка)

### Модель данных

```typescript
interface GroupingSettingsState {
    selectedGroupFields: string[]     // поля для группировки (порядок важен)
    disabledGroupFields: string[]     // временно отключённые поля
}
```

### Активные поля

```typescript
getActiveGroupFields(): string[]
    → selectedGroupFields.filter(f => !disabledGroupFields.includes(f))
```

### Actions

| Action | Описание |
|--------|----------|
| `setSelectedGroupFields(fields)` | Полная замена + очистка disabled для новых |
| `addGroupFields(fields)` | Добавление в конец (без дублей) |
| `insertGroupFields(fields, index)` | Вставка в позицию (с clamping) |
| `reorderGroupFields(fields, targetIndex)` | Перемещение в позицию (DnD) |
| `removeGroupFields(fields)` | Удаление + очистка disabled |
| `moveGroupFields(fields, direction)` | Перемещение вверх/вниз |
| `toggleGroupFieldEnabled(field)` | Вкл/Выкл поле из группировки |
| `getActiveGroupFields()` | Получить активные (selected - disabled) |
| `restoreSnapshot(state)` | Восстановление из снимка |

### Grouping Apply

```typescript
applyGroupingToFlatRows(rows, activeGroupFields): ICell[][] | ITreeRow[]
    → groupTableRows(rows, activeGroupFields)
```

Вызывает `groupTableRows` из `ElementsList`, который преобразует flat-строки в иерархические (или группирует flat-ячейки).

---

## Facet: Sort (Сортировка)

### Модель данных

```typescript
interface SortRule {
    field: string              // ключ поля
    direction: 'ASC' | 'DESC'  // направление сортировки
    enabled: boolean           // вкл/выкл
}

interface SortSettingsState {
    sortRules: SortRule[]
    availableFields: SortFieldTreeNode[]
    fieldTypes: Record<string, ListFieldDataType>
}
```

### Actions

| Action | Params | Описание |
|--------|--------|----------|
| `addSortField(field)` | `field: string` | Добавить поле в сортировку (ASC) |
| `addSortFields(fields)` | `fields: string[]` | Добавить несколько полей |
| `removeSortField(field)` | `field: string` | Удалить поле из сортировки |
| `removeSortFields(fields)` | `fields: string[]` | Удалить несколько полей |
| `changeSortDirection(field, direction)` | `field, 'ASC'/'DESC'` | Переключить направление |
| `moveSortRules(fields, direction)` | `fields, 'up'/'down'` | Переместить вверх/вниз |
| `reorderSortRules(fieldsToMove, targetIndex)` | `fields, index` | Изменить порядок (DnD) |
| `toggleSortFieldEnabled(field)` | `field: string` | Вкл/Выкл поле сортировки |
| `setAvailableFields(fields)` | `fields: SortFieldTreeNode[]` | Установить доступные поля |
| `setFieldTypes(fieldTypes)` | `fieldTypes` | Установить маппинг типов полей |
| `getActiveSortRules()` | — | Получить active (enabled) правила |
| `restoreSnapshot(state)` | `state: SortSettingsState` | Восстановить снимок |

### Migration from legacy

Поддержка миграции из старого формата `ascSortFields`/`descSortFields`:
- `ascSortFields` → правила с `direction: 'ASC'`
- `descSortFields` → правила с `direction: 'DESC'`
- `disabledSortFields` → правила с `enabled: false`

---

## Facet: Conditional Formatting (Условное форматирование)

### Модель данных

```typescript
interface ConditionalAppearance {
    backgroundColor?: string
    textColor?: string
    font?: { bold?: boolean; italic?: boolean; underline?: boolean; strikeout?: boolean; size?: number; name?: string }
    format?: string                 // 1C format string (ДФ="...", ЧГ="...", СТР="...")
    horizontalAlign?: 'left' | 'center' | 'right' | 'justify' | 'auto'
    verticalAlign?: 'top' | 'center' | 'bottom'
    textOrientation?: 'notChanged' | 'bottomToTop' | 'topToBottom'
    mirror?: 'none' | 'horizontal' | 'vertical'
    markNegatives?: boolean
    markIncomplete?: boolean
    text?: string
}

interface ConditionalFormattingRule {
    id: string
    enabled: boolean
    presentation: string
    appearance: ConditionalAppearance
    conditionNodes: SelectionNode[] // условия (иерархия AND/OR/NOT)
    targetFields: string[]          // поля для применения
    applyToSubstrings?: boolean     // применить к подстрокам-ancestor
}

interface ConditionalFormattingSettingsState {
    conditionalFormattingRules: ConditionalFormattingRule[]
}
```

### Actions

| Action | Params | Описание |
|--------|--------|----------|
| `addRule(defaultField?)` | `defaultField?: string` | Добавить правило с условиями |
| `updateRule(id, patch)` | `id, Partial<Rule>` | Обновить правило (appearance, conditions, etc.) |
| `toggleRuleEnabled(id)` | `id: string` | Вкл/Выкл правило |
| `setConditionNodes(ruleId, nodes)` | `ruleId, SelectionNode[]` | Установить условия правила |
| `removeRules(ids)` | `ids: string[]` | Удалить правила |
| `moveRules(ids, direction)` | `ids, 'up'/'down'` | Переместить правила вверх/вниз |
| `restoreSnapshot(state)` | `state: ConditionalFormattingSettingsState` | Восстановить снимок |

### Parsing & Migration

`parseConditionalFormattingSettingsState(raw)` поддерживает два формата:

1. **Legacy format** (`{ rules: [...] }`): массив объектов с `{ id, enabled, appearance, condition, targetFields }`
2. **Modern format** (`{ conditionalFormattingRules: [...] }`): массив `ConditionalFormattingRule`

Невалидные элементы автоматически отфильтровываются.

### 1C Format Engine (`apply.ts`)

**Парсинг форматов:**

```typescript
parse1CFormatString('ДФ="dd.MM.yyyy HH:mm"')   → { type: 'dateTime', datePattern: 'dd.MM.yyyy HH:mm' }
parse1CFormatString('ЧГ="0,00"')                → { type: 'number', numberPattern: '0,00' }
parse1CFormatString('СТР="ВЕРХНИЙ"')            → { type: 'text', textMode: 'UPPER' }
parse1CFormatString('СТР="@ - @"')              → { type: 'text', textMode: 'MASK', numberPattern: '@ - @' }
```

**Форматирование значений:**

| Тип | Описание | Пример |
|-----|----------|--------|
| `number` | 1C-форматирование чисел (Intl.NumberFormat) | `formatCellBy1CFormat(3.14, 'ЧГ="0,00"')` → `'3,14'` |
| `dateTime` | 1C формат даты (Intl.DateTimeFormat) | `formatCellBy1CFormat(date, 'ДФ="dd.MM.yyyy"')` → `'15.01.2024'` |
| `text` | UPPER, lower, Title, TRIM, SHORT(N), MASK | `formatCellBy1CFormat('test', 'СТР="@ - @"')` → `'test - test'` |

**Appearance → CSS:**

```typescript
appearanceToCssProperties(appearance) → CSSProperties
    ├── backgroundColor → backgroundColor
    ├── textColor / markNegatives → color
    ├── font.bold → fontWeight: 700
    ├── font.italic → fontStyle: 'italic'
    ├── font.underline/strikeout → textDecoration
    ├── font.size → fontSize
    ├── font.name → fontFamily
    ├── horizontalAlign → textAlign
    ├── verticalAlign → verticalAlign
    ├── textOrientation → writingMode
    └── mirror → transform
```

**Matching conditions:**

```typescript
ruleMatchesCondition(rule, cells) → boolean
    ├── enabledNodes = rule.conditionNodes.filter(n => n.enabled)
    └── every(enabledNode → conditionNodeMatches(cells, node))
         ├── condition → condition.comparison cellValue condition.value
         └── group → depends on logic: 'and'/'or'/'not'
```

**Cell decoration resolution:**

```typescript
resolveConditionalCellDecoration(rowCells, columnName, rules) → { style, text?, formattedValue? }
    ├── merge styles from all matching enabled rules
    ├── apply markIncomplete for null/undefined/empty values
    └── apply format via formatCellBy1CFormat
```

---

## Core: createFacetStore

Фабрика для создания универсальных фасет-хранилищ:

```typescript
interface FacetStoreConfig<T> {
    id: string                       // уникальный ID фасета ('selection', 'grouping')
    storageKey: string               // ключ localStorage ('list-settings-selection')
    legacyStorageKeys?: string[]     // legacy ключи для миграции ['list-settings']
    keys: (keyof T & string)[]       // ключи состояния для StateManager
    empty: () => T                   // factory пустого состояния
    parse: (raw: unknown) => T       // парсинг из localStorage
    clone: (state: T) => T           // клонирование состояния
}

interface FacetStore<T> {
    id: string
    getState(): T                    // получить текущее состояние
    commit(partial: Partial<T>): void // частичное обновление (merge)
    replace(next: T): void           // полная замена
    clone(state: T): T               // клонировать
    restore(snapshot: T): void       // восстановить снимок
    subscribe(name, onPatch): void   // подписаться на patch-уведомления
    unsubscribe(name): void          // отписаться
}
```

### Жизненный цикл

```
1. INIT:
   load() → readRaw(localStorage) → parse(JSON) → StateManager.setState(initial)

2. UPDATE (commit/replace):
   StateManager.setState(partial)
   → persist(readState())     → localStorage.setItem(storageKey, JSON.stringify)
   → emitListSettingsRevision() → revision++ → notify all subscribers

3. MIGRATION:
   readRaw() пытается primary key, затем legacy keys
```

### localStorage keys

| Facet | Storage Key | Legacy Key |
|-------|-------------|------------|
| Selection | `list-settings-selection` | `list-settings` |
| Grouping | `list-settings-grouping` | `list-settings` |

---

## Core: Revision Bus

Pub/Sub шина для уведомлений об изменениях настроек:

```typescript
// Subscribe (вызвать в componentDidMount / useEffect)
subscribeListSettingsRevision('myComponent', () => {
    this.forceUpdate()  // или setState(...)
})

// Emit (вызывается автоматически при каждом store.commit/replace)
emitListSettingsRevision()  // revision++ → forEach listener → call()

// Get current revision
const current = getListSettingsRevision()

// Unsubscribe (вызвать в componentWillUnmount / cleanup)
unsubscribeListSettingsRevision('myComponent')
```

### React интеграция

```typescript
// attachListSettingsRevision — helper для React class components
const unsubscribe = attachListSettingsRevision(
    this,                     // { setState }
    'MyComponent',
)

// В componentWillUnmount:
unsubscribe()
```

---

## Fields: Типы и каталог

### Canonical типы полей

```typescript
type ListFieldDataType = 'string' | 'number' | 'date' | 'boolean' | 'uuid' | 'unknown'
```

### Нормализация raw-типов бэкенда

| Raw type (бэкенд) | Canonical type |
|-------------------|---------------|
| `string`, `text` | `string` |
| `number`, `integer`, `int`, `float`, `decimal` | `number` |
| `boolean`, `bool` | `boolean` |
| `date`, `datetime`, `timestamp` | `date` |
| `uuid`, `guid` | `uuid` |
| anything else / undefined | `unknown` |

### Catalog утилиты

```typescript
// Получить все поля списка
listFieldCatalog(): ListFieldDescriptor[]

// Получить дескриптор по ключу
getFieldDescriptor('fieldName'): { value, label, dataType }

// Получить label по ключу
getFieldLabel('fieldName'): string

// Получить тип данных по ключу
getFieldDataType('fieldName'): ListFieldDataType
```

---

## Pipeline: Исполнение

### Агрегация активного вида

```typescript
getActiveListView(): ActiveListView {
    return {
        activeSelectionNodes:    getActiveSelectionNodes(),     // из selection store
        activeSelectionConditions: getActiveSelectionConditions(), // только enabled conditions
        activeGroupFields:       getActiveGroupFields(),        // selected - disabled
    }
}
```

### Execution Pipeline

```typescript
applyListViewToFlatRows(rows, view?): ListViewApplyResult

// Если view не передан → getActiveListView() (по умолчанию)

// Шаг 1: Selection (фильтрация)
const selected = applySelectionToFlatRows(rows, view.activeSelectionNodes)
    → rows.filter(row → rowMatchesSelectionTree)

// Шаг 2: Grouping (группировка)
return applyGroupingToFlatRows(selected, view.activeGroupFields)
    → groupTableRows(selected, activeGroupFields)
```

---

## Actions API Reference

### selectionSettingsActions

| Action | Params | Описание |
|--------|--------|----------|
| `setSelectionNodes` | `nodes: SelectionNode[]` | Полная замена дерева |
| `addSelectionConditions` | `fields: string[]` | Добавить условия (по полям) |
| `updateSelectionCondition` | `id, patch` | Обновить условие (field/comparison/value/enabled) |
| `toggleSelectionNodeEnabled` | `id: string` | Вкл/Выкл узел |
| `toggleSelectionConditionEnabled` | `id: string` | Алиас для toggleSelectionNodeEnabled |
| `removeSelectionNodes` | `ids: string[]` | Удалить узлы |
| `removeSelectionConditions` | `ids: string[]` | Алиас для removeSelectionNodes |
| `moveSelectionNodes` | `ids, direction` | Переместить вверх/вниз |
| `moveSelectionConditions` | `ids, direction` | Алиас |
| `groupSelectionNodes` | `ids, logic` | Сгруппировать в AND/OR/NOT |
| `ungroupSelectionNodes` | `ids` | Разгруппировать |
| `setSelectionGroupLogic` | `groupId, logic` | Изменить логику группы |
| `getActiveSelectionConditions` | — | Получить все enabled conditions |
| `restoreSnapshot` | `state: SelectionSettingsState` | Восстановить снимок |

### groupingSettingsActions

| Action | Params | Описание |
|--------|--------|----------|
| `setSelectedGroupFields` | `fields: string[]` | Полная замена |
| `addGroupFields` | `fields: string[]` | Добавить в конец |
| `insertGroupFields` | `fields, index` | Вставка в позицию |
| `reorderGroupFields` | `fields, targetIndex` | Перемещение в позицию (DnD) |
| `removeGroupFields` | `fields: string[]` | Удалить |
| `moveGroupFields` | `fields, direction` | Переместить вверх/вниз |
| `toggleGroupFieldEnabled` | `field: string` | Вкл/Выкл поле |
| `getActiveGroupFields` | — | Получить active (selected - disabled) |
| `restoreSnapshot` | `state: GroupingSettingsState` | Восстановить снимок |

### sortSettingsActions

| Action | Params | Описание |
|--------|--------|----------|
| `addSortField` | `field: string` | Добавить поле в сортировку (ASC) |
| `addSortFields` | `fields: string[]` | Добавить несколько полей |
| `removeSortField` | `field: string` | Удалить поле из сортировки |
| `removeSortFields` | `fields: string[]` | Удалить несколько полей |
| `changeSortDirection` | `field, 'ASC'/'DESC'` | Переключить направление |
| `moveSortRules` | `fields, 'up'/'down'` | Переместить вверх/вниз |
| `reorderSortRules` | `fields, targetIndex` | Изменить порядок (DnD) |
| `toggleSortFieldEnabled` | `field: string` | Вкл/Выкл поле сортировки |
| `setAvailableFields` | `fields: SortFieldTreeNode[]` | Установить доступные поля |
| `setFieldTypes` | `fieldTypes: Record<string, ...>` | Установить маппинг типов полей |
| `getActiveSortRules` | — | Получить active (enabled) правила |
| `restoreSnapshot` | `state: SortSettingsState` | Восстановить снимок |

### conditionalFormattingSettingsActions

| Action | Params | Описание |
|--------|--------|----------|
| `addRule` | `defaultField?: string` | Добавить правило с условиями |
| `updateRule` | `id, Partial<Rule>` | Обновить правило (appearance, conditions) |
| `toggleRuleEnabled` | `id: string` | Вкл/Выкл правило |
| `setConditionNodes` | `ruleId, SelectionNode[]` | Установить условия правила |
| `removeRules` | `ids: string[]` | Удалить правила |
| `moveRules` | `ids, 'up'/'down'` | Переместить правила вверх/вниз |
| `restoreSnapshot` | `state: ConditionalFormattingSettingsState` | Восстановить снимок |

---

## Расширение: как добавлять новое

### 1. Добавить новый фасет (например, «Виджет» / «Dashboard»)

**Цель:** добавить новый набор настроек, аналогичный selection/grouping.

#### Шаг 1: Создать `facets/myFacet/types.ts`

```typescript
export interface MyFacetSettingsState {
    mySetting: string
    enabled: boolean
    // ...другие поля
}

export function emptyMyFacetSettingsState(): MyFacetSettingsState {
    return { mySetting: '', enabled: true }
}

export function cloneMyFacetSettingsState(
    state: MyFacetSettingsState
): MyFacetSettingsState {
    return { ...state }  // или structuredClone(state) для сложных
}

export function parseMyFacetSettingsState(raw: unknown): MyFacetSettingsState {
    const data = (raw ?? {}) as Partial<MyFacetSettingsState>
    return {
        mySetting: typeof data.mySetting === 'string' ? data.mySetting : '',
        enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
    }
}
```

#### Шаг 2: Создать `facets/myFacet/store.ts`

```typescript
import { createFacetStore } from '../../core/createFacetStore'
import { /* из types */ } from './types'

const store = createFacetStore<MyFacetSettingsState>({
    id: 'myFacet',
    storageKey: 'list-settings-myFacet',
    legacyStorageKeys: [],  // legacy keys если нужны
    keys: ['mySetting', 'enabled'],
    empty: emptyMyFacetSettingsState,
    parse: parseMyFacetSettingsState,
    clone: cloneMyFacetSettingsState,
})

export function getMyFacetSettingsState(): MyFacetSettingsState {
    return store.getState()
}

export const myFacetSettingsActions = {
    setMySetting(value: string): void {
        store.commit({ mySetting: value })
    },

    toggleEnabled(): void {
        const state = store.getState()
        store.commit({ enabled: !state.enabled })
    },

    restoreSnapshot(snapshot: MyFacetSettingsState): void {
        store.restore(snapshot)
    },
}
```

#### Шаг 3: Добавить в `core/types.ts`

```typescript
export type ListSettingsFacetId =
    | 'selection'
    | 'grouping'
    | 'sort'
    | 'conditionalFormatting'
    // === НОВЫЙ ===
    | 'myFacet'
```

#### Шаг 4: Экспортировать из `index.ts`

```typescript
export type { MyFacetSettingsState } from './facets/myFacet/types'
export {
    getMyFacetSettingsState,
    myFacetSettingsActions,
    cloneMyFacetSettingsState,
} from './facets/myFacet/store'
```

---

### 2. Добавить новый оператор сравнения в Selection

**Цель:** добавить новый оператор (например, `startsWith`, `between`).

#### Шаг 1: Обновить `facets/selection/types.ts`

```typescript
export type SelectionComparison =
    | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
    | 'contains' | 'notContains' | 'filled' | 'empty'
    // === НОВЫЙ ===
    | 'startsWith'
    | 'between'

// Добавить в SELECTION_COMPARISON_OPTIONS
export const SELECTION_COMPARISON_OPTIONS: SelectionComparisonOption[] = [
    // ...существующие
    { value: 'startsWith', label: 'Начинается с', needsValue: true },
    { value: 'between', label: 'Между', needsValue: true },
]

// Добавить mapping по типам в COMPARISONS_BY_FIELD_TYPE
export const COMPARISONS_BY_FIELD_TYPE: Record<ListFieldDataType, readonly SelectionComparison[]> = {
    string: ['eq', 'ne', 'contains', 'notContains', 'filled', 'empty', 'startsWith'],
    number: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'filled', 'empty', 'between'],
    // ... остальные
}
```

#### Шаг 2: Добавить handler в `facets/selection/apply.ts`

```typescript
const COMPARISON_HANDLERS: Record<SelectionComparison, ComparisonFn> = {
    // ...существующие
    startsWith: (cellValue, conditionValue) =>
        toComparableString(cellValue).toLowerCase().startsWith(conditionValue.toLowerCase()),
    between: (cellValue, conditionValue) => {
        const [from, to] = conditionValue.split(';').map(s => s.trim())
        const str = toComparableString(cellValue)
        return compareOrdered(str, from, (a, b) => a >= b) && compareOrdered(str, to, (a, b) => a <= b)
    },
}
```

#### Шаг 3: Обновить ValueEditor в `Group/ListSettingsModal/rows/ValueEditor.tsx`

Если новый оператор требует特殊ный UI (например, два инпута для `between`), добавить условие в рендеринг value editor.

---

### 3. Добавить новый тип поля

**Цель:** поддержать новый raw-type с бэкенда (например, `time`).

#### Шаг 1: Обновить `fields/types.ts`

```typescript
export type ListFieldDataType =
    | 'string' | 'number' | 'date' | 'boolean' | 'uuid' | 'unknown'
    // === НОВЫЙ ===
    | 'time'

// Добавить mapping в RAW_TYPE_TO_FIELD_DATA_TYPE
const RAW_TYPE_TO_FIELD_DATA_TYPE: Record<string, ListFieldDataType> = {
    // ...существующие
    time: 'time',
    localtime: 'time',
}
```

#### Шаг 2: Добавить mapping операторов в `facets/selection/types.ts`

```typescript
export const COMPARISONS_BY_FIELD_TYPE: Record<ListFieldDataType, readonly SelectionComparison[]> = {
    // ...существующие
    time: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'filled', 'empty'],
    unknown: ['eq', 'ne', 'contains', 'notContains', 'filled', 'empty'],
}
```

#### Шаг 3: Обновить ValueEditor для нового типа

В `Group/ListSettingsModal/rows/valueEditorRenderers.tsx` добавить рендер для типа `time` (TimePicker).

---

### 4. Добавить новую column в таблицу условий (Selection UI)

**Цель:** добавить новое поле в ConditionRow (например, «Значение до» для between).

#### Шаг 1: Обновить `SelectionCondition` в `facets/selection/types.ts`

```typescript
interface SelectionCondition {
    id: string
    field: string
    comparison: SelectionComparison
    value: string
    valueEnd?: string          // === НОВОЕ ===
    enabled: boolean
}
```

#### Шаг 2: Обновить `normalizeConditionPatch` в `facets/selection/store.ts`

```typescript
function normalizeConditionPatch(/* ... */): Partial<SelectionCondition> {
    // ...существующая логика
    return {
        field: updated.field,
        comparison: updated.comparison,
        value: updated.value,
        valueEnd: updated.valueEnd,  // === НОВОЕ ===
        enabled: updated.enabled,
    }
}
```

#### Шаг 3: Добавить cell в `Group/ListSettingsModal/rows/ConditionRow.tsx`

```tsx
// Добавить четвертую колонку (или новую)
<td className="condition-cell condition-cell-value-end">
    {editingCell?.cell === 'valueEnd' ? (
        <input value={row.node.valueEnd || ''} onChange={...} onBlur={...} />
    ) : (
        <span onClick={() => beginEditing('valueEnd')}>{row.node.valueEnd || '—'}</span>
    )}
</td>
```

#### Шаг 4: Обновить `SelectionFlatRow` и `flattenSelectionForRender`

Если нужно, чтобы новое поле проходило через flatten.

#### Шаг 5: Обновить `apply.ts` — matching engine

```typescript
function conditionMatches(cells, condition): boolean {
    if (condition.comparison === 'between' && condition.valueEnd) {
        // special between logic
    }
    // ...existing
}
```

---

### 5. Добавить новый action в FacetsToolbar

**Цель:** добавить новую кнопку в тулбар правой панели.

#### Шаг 1: Добавить callback в `ListSettingsModal/lists/types.ts`

```typescript
export interface FacetsToolbarProps {
    // ...existing
    onNewAction?: () => void
    isNewActionDisabled?: boolean
}
```

#### Шаг 2: Добавить кнопку в `ListSettingsModal/lists/FacetsToolbar.tsx`

```tsx
<Button
    title="New Action"
    color="primary"
    disabled={isNewActionDisabled}
    onClick={onNewAction}
/>
```

#### Шаг 3: Передать handler из таба

```tsx
<FacetsToolbar
    // ...existing
    onNewAction={this.handleNewAction}
    isNewActionDisabled={!this.hasValidSelection()}
/>
```

---

### 6. Добавить new tab в ListSettingsModal

**Цель:** добавить новую вкладку (аналог Grouping/Selection) в модальное окно.

См. подробную инструкцию в [`Group/README.md`](../Buttons/Group/README.md) — раздел «Добавить новую вкладку (Tab)».

---

### 7. Добавить localStorage migration

**Цель:** миграция ключей при изменении структуры state.

```typescript
const store = createFacetStore<MyNewState>({
    id: 'myFacet',
    storageKey: 'list-settings-myFacet-v2',     // новый ключ
    legacyStorageKeys: ['list-settings-myFacet'], // старые ключи
    // ...
})
```

`createFacetStore` автоматически пробует все legacy keys если primary ключ пуст.

---

## Quick Reference

### Где что находится

| Что нужно | Путь |
|-----------|------|
| **Публичный API** | `listSettings/index.ts` |
| **Шина ревизий** | `listSettings/core/revisionBus.ts` |
| **Фабрика хранилищ** | `listSettings/core/createFacetStore.ts` |
| **Типы фасетов** | `listSettings/core/types.ts` |
| **Selection (фильтры)** | `listSettings/facets/selection/` |
| Grouping (группировка) | `listSettings/facets/grouping/` |
| Sort (сортировка) | `listSettings/facets/sort/` |
| Conditional formatting | `listSettings/facets/conditionalFormatting/` |
| Типы полей | `listSettings/fields/types.ts` |
| Catalog полей | `listSettings/fields/catalog.ts` |
| Пайплайн исполнения | `listSettings/pipeline/applyListView.ts` |
| React интеграция | `listSettings/react/attachRevision.ts` |

### Импорты

```typescript
// Всё из одного источника
import {
    // Selection
    selectionSettingsActions,
    getSelectionSettingsState,
    cloneSelectionSettingsState,
    flattenSelectionForRender,
    createSelectionCondition,
    // Grouping
    groupingSettingsActions,
    getGroupingSettingsState,
    // Fields
    listFieldCatalog,
    getFieldDataType,
    // Pipeline
    getActiveListView,
    applyListViewToFlatRows,
    // Revision
    emitListSettingsRevision,
    subscribeListSettingsRevision,
    // React
    attachListSettingsRevision,
} from 'helpers/listSettings'
```

---

## State Persistence

### localStorage

| Ключ | Facet | Структура |
|------|-------|-----------|
| `list-settings-selection` | Selection | `{ selectionNodes: [...] }` |
| `list-settings-grouping` | Grouping | `{ selectedGroupFields: [], disabledGroupFields: [] }` |
| `list-settings-sort` | Sort | `{ sortRules: [], availableFields: [], fieldTypes: {} }` |
| `list-settings-conditional-formatting` | ConditionalFormatting | `{ conditionalFormattingRules: [...] }` |

### StateManager

Каждый фасет подписывается на ключи StateManager при инициализации:

```
createFacetStore → StateManager.setState(initial) → StateManager.subscribeState(keys)
```

Изменения через `store.commit(partial)` → `StateManager.setState(partial)` → подписчики получают patch.

---

## Конвенции

### Иммутабельность
- Все tree-операции **не мутируют** исходное дерево
- `cloneSelectionNode` / `cloneGroupingSettingsState` обязательны перед изменением
- `updateSelectionNodeById` использует `mapSelectionTree` с клонарованием

### naming
- Store instances: `const store = createFacetStore<...>({})` (private)
- Actions: `camelCaseActions` (exported)
- Getters: `get*SettingsState()` / `get*Fields()`
- Types: `PascalCaseSettingsState`

### Error handling
- `parse()` ловит все ошибки и возвращает `empty()`
- `emitListSettingsRevision()` обматывает вызов каждого listener в try/catch
- `normalizeConditionPatch` автоматически исправляет несовместимые field/comparison комбинации

---

## TODO

| Facet | Статус | Описание |
|-------|--------|----------|
| Selection | ✅ Реализован | Полный CRUD, tree ops, matching |
| Grouping | ✅ Реализован | Полный CRUD, reordering, toggle |
| Sort | ✅ Реализован | Полный CRUD, reorder, direction toggle, legacy migration |
| ConditionalFormatting | ✅ Реализован | CRUD rules, 1C format engine, appearance→CSS, matching engine |
