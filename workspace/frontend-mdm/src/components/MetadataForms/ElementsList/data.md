# ElementsList: модель данных и модель настроек

Справочник описывает, **в каком виде приходят данные** в таблицу и **как устроены настройки** (отбор, сортировка, группировка строк, группировка столбцов, условное форматирование). Акцент — на ветке `renderListTable()` → `DataTable`, но показаны и точки, общие с плоской веткой `ReactWindowWrapper`.

Все типы ниже выписаны из кода, а не выдуманы:

| Сущность | Файл |
| --- | --- |
| `IData`, `IDataColumn`, `ICell`, `ITableState`, `IColumnConfig` | [`types.ts`](./types.ts) |
| `IColumnData`, `IColumnGroupData`, `ITreeRow` | [`ReactWindowWrapperCombined/types.ts`](./ReactWindowWrapperCombined/types.ts) |
| `transformStateForRender` | [`utils/transformStateForRender.ts`](./utils/transformStateForRender.ts) |
| `toDataTableViewModel`, `toReactWindowTableData` | [`utils/tableViewAdapters.ts`](./utils/tableViewAdapters.ts) |
| `groupTableRows` | [`groupTableRows.ts`](./groupTableRows.ts) |
| `ActiveListView`, `applyListViewToFlatRows`, `applySortToRows` | `src/helpers/listSettings/pipeline/` |
| Фасеты настроек | `src/helpers/listSettings/facets/` |

---

## 1. Сквозная схема пайплайна

```
DataManager.meta.list / DataManager.data.list
        │  IData { rows, cols, refs, count }
        │
        ▼  applySortToRows(rows, view)                 ← фасет «sort» (по полю, наDataRow[])
        ▼  withColumnGroupingData(data)                ← фасет «columnGrouping» (порядок/видимость/ширины/группы)
        ▼  transformStateForRender(...)
   ITableState { data: (ICell | ICell[])[][], cols: (IColumnData | IColumnData[])[] }
        │
        ▼  render() → isListsMode()
        ▼  renderListTable(table) → toDataTableViewModel({ rows, cols })
            ├─ flattenRowsForGrouping()                → ICell[][]
            ├─ applySelectionToFlatRows()              ← фасет «selection» (отбор)
            └─ applyGroupingToFlatRows()               ← фасет «grouping» (группировка строк)
        │
        ▼
   <DataTable data={ICell[][] | ITreeRow[]} columns={table.cols as any} />
            └─ conditionalFormatting                   ← фасет «conditionalFormatting» (в рантайме рендера)
```

Ключевое различие двух веток:

| Ветка | Условие | Адаптер | Отбор | Группировка строк |
| --- | --- | --- | --- | --- |
| Плоская | `isListsMode() === false` | `toReactWindowTableData` | `applySelectionToRows` | не применяется |
| Списка | `isListsMode() === true` (сущность = `LISTS_ENTITY_TITLE`) | `toDataTableViewModel` | `applySelectionToFlatRows` | `groupTableRows` |

---

## 2. Модель данных

### 2.1 Источник: `IData`

```ts
type DataRow = Record<string, unknown>;            // { id, code, name, parent, ... } — одна запись списка

interface IData {
    rows: DataRow[];
    cols: IDataColumn[];
    refs: Record<string, Record<string, string>>;  // refs[имяКолонки][ключ] → подписанное значение справочника
    count: number;
}

interface IDataColumn {
    field: string;        // ключ значения в rows
    type: string;
    name: string;
    description: string;  // → IColumnData.label (иначе name)
    len: number;
    hasSorting?: boolean;
    show: boolean;        // false → колонка исключается из рендера
    // ↓ проставляются НЕ из метаданных, а из дерева «Группировки столбцов»:
    cellWidth?: number;
    cellFlexGrow?: boolean;
    cellHeight?: number;
    cellExpandVertical?: boolean;
}
```

Значение ячейки собирается так (`resolveCellValue`): `row[field]` → `formatCellValue` → по строковому ключу ищется `refs[field][key]` → при находке значение форматируется с подписью справочника.

### 2.2 Ячейка: `ICell`

```ts
interface ICell {
    columnName: string;   // == IColumnData.name == IDataColumn.field
    value: {
        originalData: unknown;
        viewedData: unknown;    // после transformStateForRender равны: refs уже развёрнуты
    };
    type: string;         // dataManager.metadata.treeObject?.Fields?.[field]?.type ?? ''
    rowIndex: number;
    columnIndex: number;  // ⚠ в transformStateForRender всегда 0, реальному индексу не соответствует
    editable: unknown;    // null
    hierarchy: unknown;   // null
}
```

Единственный надёжный способ сопоставить ячейку с колонкой — `cell.columnName === column.name`.

### 2.3 Промежуточное состояние: `ITableState`

```ts
interface ITableState {
    rowCount: number;
    columnsCount: number;
    data: (ICell | ICell[])[][];         // [rowIndex][colIndex]; colIndex строго соответствует cols
    cols: (IColumnData | IColumnData[])[];
    activeCell: IActiveCell | null;
    columnConfig?: (IColumnConfig | IColumnConfig[])[];
    meta: { prevEditableCell: { rowIndex: number; columnIndex: number } | null } | null;
}

interface IColumnData {
    name: string;         // field
    label: string;        // description ?? name
    order?: 'ASC' | 'DESC';               // используется только плоской веткой (иконка в шапке)
    cellWidth?: number;
    cellFlexGrow?: boolean;
    cellHeight?: number;
    cellExpandVertical?: boolean;
}

// Группа колонок = массив колонок с «пришитыми» свойствами
interface IColumnGroupData extends Array<IColumnData> {
    title?: string;                          // заголовок группы в шапке
    orientation?: 'horizontal' | 'vertical'; // vertical → сворачивается в один столбец «стопкой»
}
```

Инвариант структуры: `data[r][c]` — это `ICell` для одиночной колонки и `ICell[]` для группы (вложенные подгруппы дают вложенные `ICell[]`). Индексы `data[r]` и `cols` совпадают по позициям — на этом держится виртуализация и построение сетки `DataTable`.

### 2.4 Выход адаптера `toDataTableViewModel`

```ts
toDataTableViewModel({ rows, cols }): {
    data: ICell[][] | ITreeRow[],     // ITreeRow[] если активна группировка строк, иначе ICell[][]
    columns: IInnerColumnMetadataProps[],
}
```

⚠ `columns` в `renderListTable` **не используется**: в `DataTable` передаётся `table.cols as any`. `mapColumnsForDataTable` в этой ветке фактически мёртв (см. § 5).

### 2.5 Дерево строк: `ITreeRow` (результат `groupTableRows`)

```ts
interface ITreeRow {
    cells: ICell | ICell[];   // у узла-группы всегда []
    children?: ITreeRow[];    // на последнем уровне: [{ cells: ICell[] }]
    isGroup?: true;           // есть только у группы
    groupField?: string;      // поле текущего уровня вложенности
    groupValue?: unknown;     // viewedData ?? originalData
    groupKey?: string;        // `${key}--${keyId}`, уникален во всём дереве (счётчик общий)
}
```

Свойства группировки:

- уровень вложенности = порядок массива `selectedGroupFields`;
- bucket'ы собираются в `Map`, поэтому **порядок групп = порядок первого появления** строки (то есть наследует применённую сортировку);
- ключ группы формируется общим счётчиком на всё дерево → `expandedGroups: Set<string>` в `DataTable` безопасен на любом уровне;
- `isTreeRow(item)` — проверка по наличию поля `cells`.

Пример (две группы вложенности):

```ts
[
  {
    cells: [],
    isGroup: true,
    groupField: 'category',
    groupValue: 'A',
    groupKey: '10--0',
    children: [
      {
        cells: [],
        isGroup: true,
        groupField: 'kind',
        groupValue: 'Номенклатура',
        groupKey: '2--1',
        children: [
          { cells: [/* ICell[] одной строки */] },
        ],
      },
    ],
  },
]
```

### 2.6 Что реально читает `DataTable`

```ts
// props (IReactWindowWrapperCombined, в renderListTable приводятся через as any)
{
    data: (ICell | ICell[] | ITreeRow | Record<string, unknown>[])[],
    columns: (IColumnData | IColumnData[])[],        // = state.table.cols
}

// производные структуры внутри DataTable
type GridColumnItem =
    | { kind: 'leaf'; column: IColumnData }
    | { kind: 'collapsed'; title: string; leaves: IColumnData[] };   // orientation === 'vertical'

interface FlatGroupBand { title: string; startIndex: number; span: number; depth: number }

// на каждую листовую строку:
cellMap:  Record<string /* columnName */, ICell>
rowData:  Record<string /* columnName */, unknown>   // viewedData ?? originalData — вход для условий и CF
decoration?: { style: CSSProperties; text?: string; formattedValue?: string }
```

Правила отображения, выводимые из модели:

| Что | Откуда |
| --- | --- |
| `grid-template-columns` | `cellWidth` / `cellFlexGrow` каждой листовой колонки (`trackForItem`) |
| Высота строк | `max(cellHeight)` по всем колонкам (`getConfigCellHeight`) |
| Число треков сетки | число `GridColumnItem` после сворачивания вертикальных групп |
| Заголовки групп | строки `FlatGroupBand` по уровням `depth`, `gridColumn: start / span` |
| Свёрнутая группа | одна ячейка, значения `leaves` «стопкой» в порядке DFS, пустые отбрасываются |
| Тексты ячеек | `formatCellValue`: `null/undefined → ''`, `boolean → Да/Нет` |

---

## 3. Модель настроек

Единая точка чтения для рантайма — `getActiveListView()`:

```ts
interface ActiveListView {
    activeSelectionNodes: SelectionNode[];                          // отбор, дерево
    activeSelectionConditions: SelectionCondition[];                // отбор, плоский список enabled
    activeGroupFields: string[];                                    // выбранное минус отключённое
    activeSortRules: SortRule[];                                    // только enabled
    activeConditionalFormattingRules: ConditionalFormattingRule[];  // только enabled
}
```

Фасетов пять (`ListSettingsFacetId`): `selection`, `grouping`, `sort`, `columnGrouping`, `conditionalFormatting`.

### 3.1 Отбор — `selection`

Состояние: `{ selectionNodes: SelectionNode[] }`

```ts
type SelectionComparison =
    | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
    | 'contains' | 'notContains' | 'filled' | 'empty' | 'between';

type SelectionGroupLogic = 'and' | 'or' | 'not';

interface SelectionCondition {
    id: string;
    kind?: 'condition';
    field: string;
    comparison: SelectionComparison;
    value: string | [string, string];   // пара — для between / useRange
    enabled: boolean;
    useRange?: boolean;
}

interface SelectionGroup {
    id: string;
    kind: 'group';
    logic: SelectionGroupLogic;
    enabled: boolean;
    children: SelectionNode[];          // рекурсивно
}

type SelectionNode = SelectionCondition | SelectionGroup;
```

Семантика применения (`facets/selection/apply.ts`):

- корневые `enabled`-узлы объединяются **«И»**;
- узел с `enabled: false` считается истинным (пропускается);
- пустая `value` (кроме `between`) ⇒ условие **пропускается**, а не отсекает строки;
- сравнивается `value.originalData ?? value.viewedData`;
- числовые строки сравниваются как числа, иначе — как даты (`Date.parse`), иначе лексикографически.

Допустимость операций по типу поля — `COMPARISONS_BY_FIELD_TYPE` (`string` / `number` / `date` / `boolean` / `uuid` / `unknown`).

### 3.2 Группировка строк — `grouping`

```ts
interface GroupingSettingsState {
    selectedGroupFields: string[];    // порядок = уровни вложенности
    disabledGroupFields: string[];    // «выключенные» поля, остаются в списке настроек
}
// активные: selectedGroupFields.filter(f => !disabledGroupFields.includes(f))
```

### 3.3 Сортировка — `sort`

```ts
type SortDirection = 'ASC' | 'DESC';

interface SortRule {
    field: string;
    direction: SortDirection;
    enabled: boolean;
}

interface SortSettingsState {
    sortRules: SortRule[];
    availableFields: SortFieldTreeNode[];                  // { id, label, value, isGroupLevel, children? }
    fieldTypes: Record<string, ListFieldDataType>;         // 'string'|'number'|'date'|'boolean'|'uuid'|'unknown'
}
```

Применение (`applySortToRows`, работает по **`DataRow`**, а не по ячейкам):

- тип сравнения берётся из `fieldTypes[field]` (по умолчанию `string`), компаратор — `defaultComparatorForAllTypes`;
- `null/undefined` уходит в конец при `ASC` и в начало при `DESC`;
- правила применяются по порядку массива, до первого ненулевого сравнения;
- при пустых правилах `ElementsListContent` восстанавливает `state.originalOrder` (`{ [индекс]: row.id }`, снятый до сортировки).

Параллельно существует **серверная** сортировка: `dataManager.currentSort = { column, direction }` → `options.order = [[column, 'ASC'|'DESC']]` и перерисовка колонок через `updateColumnSortState`. Она независима от фасета `sort`.

### 3.4 Группировка столбцов — `columnGrouping`

```ts
interface ColumnCellAppearance {
    width?: number;          // → IDataColumn.cellWidth
    flexGrow?: boolean;      // → IDataColumn.cellFlexGrow
    height?: number;         // → IDataColumn.cellHeight
    expandVertical?: boolean;// → IDataColumn.cellExpandVertical
}

interface ColumnGroupNode extends ColumnCellAppearance {
    id: string;              // 'root' | `col_${fieldId}` | `group_${ts}-${rand}`
    kind: 'root' | 'group' | 'column';
    title?: string;
    fieldId?: string;        // только column
    orientation?: 'horizontal' | 'vertical';   // только group
    enabled?: boolean;       // false → не рендерится
    children: ColumnGroupNode[];
}

interface ColumnGroupingSettingsState { root: ColumnGroupNode }
```

Правила `applyColumnGroupingToCols`:

1. порядок колонок = DFS-обход `root.children`;
2. колонок нет в дереве → они **исключаются** из таблицы;
3. `enabled: false` у колонки или группы → вся ветка не попадает в таблицу;
4. appearance узла переносится на `IDataColumn`;
5. группы первого уровня → вложенные массивы с `title` / `orientation`;
6. пустая группа (без видимых колонок) не создаётся;
7. при `props.mergedColumns` результат плющится `flattenGroupedColumns` (групповые заголовки теряются, но объединённые колонки не ломаются).

Каталог доступных полей (`GroupingFieldTreeNode[]`) — не настройки пользователя: держится в памяти (`setColumnGroupingCatalog`), при пустоте берётся из `sort.availableFields`.

### 3.5 Условное форматирование — `conditionalFormatting`

```ts
interface ConditionalAppearance {
    backgroundColor?: string;
    textColor?: string;
    font?: { bold?, italic?, underline?, strikeout?, size?, name? };
    format?: string;            // 1С-формат: 'ЧГ="0,00"', 'ДФ="dd.MM.yyyy"', 'СТР="ВЕРХНИЙ"' …
    horizontalAlign?: 'left' | 'center' | 'right' | 'justify' | 'auto';
    verticalAlign?: 'top' | 'center' | 'bottom';
    textOrientation?: 'notChanged' | 'bottomToTop' | 'topToBottom';
    mirror?: 'none' | 'horizontal' | 'vertical';
    markNegatives?: boolean;
    markIncomplete?: boolean;   // подчёркивание незаполненных
    text?: string;              // явный подменитель значения
}

interface ConditionalFormattingRule {
    id: string;
    enabled: boolean;
    presentation: string;
    appearance: ConditionalAppearance;
    conditionNodes: SelectionNode[];   // тот же язык условий, что и «Отбор»
    targetFields: string[];            // [] = все поля
    applyToSubstrings?: boolean;       // подсвечивать также строки-группы предков совпавшего листа
}

interface ConditionalFormattingSettingsState { conditionalFormattingRules: ConditionalFormattingRule[] }
```

Результат применения к ячейке — `ConditionalCellDecoration { style, text?, formattedValue? }`; приоритет показа текста: `text → formattedValue → formatCellValue(rawValue)`.

### 3.6 Хранение, реактивность, scope

Механика — `createFacetStore`:

- живое состояние — в `lite-react-statemanager` (плоский bag, ключи перечислены в `keys`);
- каждый `commit` / `replace` сериализует состояние в `localStorage[storageKey]` и вызывает `emitListSettingsRevision()`;
- при загрузке читается `storageKey`, при отсутствии — `legacyStorageKeys`, затем `parse()` с миграциями.

| Фасет | `storageKey` | legacy |
| --- | --- | --- |
| selection | `list-settings-selection` | `list-settings` |
| grouping | `list-settings-grouping` | `list-settings` |
| sort | `list-settings-sort` | `list-settings-sorting` |
| columnGrouping | `list-settings-column-grouping` | — |
| conditionalFormatting | `list-settings-conditional-formatting` | — |

Пересборка рендера по изменению настроек:

- `ElementsListContent` — `attachListSettingsRevision(this, ELEMENT_LIST_SUBSCRIBER)` + `componentDidUpdate` по `state.listSettingsRevision` (пересортировка / возврат исходного порядка);
- `DataTable` — `subscribeListSettingsRevision('DataTable', …)`, правила CF читаются из стора прямо в `render`.

Тип `ListSettingsScope` (`{ key: string }`, `GLOBAL_LIST_SETTINGS_SCOPE = { key: 'global' }`) объявлен, но **не используется**: все фасеты глобальны, per-form изоляции настроек нет (в отличие от `columnConfig`, который сохраняется по `getTableConfigKey(formId, name)`).

### 3.7 Пример сохранённых настроек

```jsonc
// list-settings-selection
{
  "selectionNodes": [
    {
      "id": "sel-group-1", "kind": "group", "logic": "and", "enabled": true,
      "children": [
        { "id": "sel-status-1", "kind": "condition", "field": "status", "comparison": "eq", "value": "Активен", "enabled": true, "useRange": false }
      ]
    },
    { "id": "sel-price-1", "kind": "condition", "field": "price", "comparison": "between", "value": ["100", "500"], "enabled": true }
  ]
}

// list-settings-sort
{
  "sortRules": [{ "field": "price", "direction": "DESC", "enabled": true }],
  "availableFields": [{ "id": "name", "label": "Наименование", "value": "name", "isGroupLevel": false }],
  "fieldTypes": { "price": "number", "createdAt": "date" }
}

// list-settings-grouping
{ "selectedGroupFields": ["category", "kind"], "disabledGroupFields": [] }

// list-settings-column-grouping
{
  "root": {
    "id": "root", "kind": "root", "title": "Список столбцов",
    "children": [
      {
        "id": "group_1", "kind": "group", "title": "Цена", "orientation": "vertical", "enabled": true,
        "width": 180, "children": [
          { "id": "col_price", "kind": "column", "fieldId": "price", "enabled": true }
        ]
      },
      { "id": "col_name", "kind": "column", "fieldId": "name", "enabled": true, "flexGrow": true }
    ]
  }
}

// list-settings-conditional-formatting
{
  "conditionalFormattingRules": [
    {
      "id": "rule-1", "enabled": true, "presentation": "",
      "appearance": { "backgroundColor": "#f4515d" },
      "conditionNodes": [
        { "id": "sel-stock-1", "kind": "condition", "field": "stock", "comparison": "lt", "value": "0", "enabled": true }
      ],
      "targetFields": ["stock"],
      "applyToSubstrings": true
    }
  ]
}
```

---

## 4. Матрица: настройка → место применения → эффект

| Настройка | Где применяется | Что меняет |
| --- | --- | --- |
| `columnGrouping.root` | `withColumnGroupingData` → `applyColumnGroupingToCols` (до `transformStateForRender`) | `ITableState.cols` (порядок, состав, вложенность, `title`/`orientation`, ширины/высоты) и форму `data[row][col]` |
| `sort.sortRules` | `applySortToRows` на `IData.rows` при загрузке и в `componentDidUpdate` | порядок `state.data.rows`, а значит и порядок `ITableState.data` |
| `selection.selectionNodes` | `applySelectionToFlatRows` (список) / `applySelectionToRows` (плоско) в адаптере | состав строк, попадающих в таблицу |
| `grouping.selectedGroupFields` | `applyGroupingToFlatRows` → `groupTableRows` | тип результата: `ICell[][]` → `ITreeRow[]` |
| `conditionalFormatting.conditionalFormattingRules` | `DataTable.TreeRows` во время рендера | `style`/текст ячейки, подсветка групп при `applyToSubstrings` |
| `columnConfig` (localStorage по formId) | `loadColumnConfig` / `handleColumnConfigChange` | `ITableState.columnConfig` — плоская ветка, ресайз колонок |
| `dataManager.currentSort` | `onSort` → `options.order` + `updateColumnSortState` | серверная сортировка и иконка порядка в шапке |

---

## 5. Известные особенности и риски

1. **`columns` из `toDataTableViewModel` не используется.** `renderListTable` берёт только `data`, а в `DataTable` передаёт `table.cols as any`. `mapColumnsForDataTable` возвращает `IInnerColumnMetadataProps` (`id/label/value/show/type/columnIndex`) **без `name`**, поэтому подавать его в `DataTable` нельзя: тот читает `column.name`, `cellWidth`, `cellHeight`, `title`, `orientation`. Тип `IReactWindowWrapperCombined.columns` (`InnerColumnMetadataProps[]`) расходится с фактическим содержимым.
2. **`ICell.columnIndex === 0` всегда.** Сопоставление ячейки с колонкой возможно только по `columnName`.
3. **`value.originalData === value.viewedData`** после `transformStateForRender`, поэтому различение «сырое/показываемое» на выходе адаптера недоступно (в отличие от данных, приходящих с бэкенда напрямую).
4. **Настройки глобальны.** Смена отбора/сортировки/группировки влияет на все списки в приложении до перезагрузки; `ListSettingsScope` не задействован.
5. **Отбор в плоской ветке и в ветке списка применяются в разных местах** (`toReactWindowTableData` vs `toDataTableViewModel`) — при правках `applySelectionTo*` нужно проверять обе.
6. **Порядок групп наследует сортировку, но не наоборот:** правила `sort` применяются до построения дерева, поэтому «сортировка по подполю внутри группы» эффекта на порядок групп не оказывает.
7. **Сброс сортировки завязан на `originalOrder`.** Он снимается только в `changeMasterData` / `onHierarchyExpand` / `onHierarchyReduce`; при расхождениях `row.id` строки вне `originalOrder` из результата выпадают.
8. **Лишние `console.log`** в `DataTable` (revision) и в `conditionalFormattingSettingsActions.toggleRuleEnabled` — кандидаты на удаление.
