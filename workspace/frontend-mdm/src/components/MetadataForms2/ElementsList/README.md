# ElementsList

Виртуализированная таблица для отображения и управления списками данных в Metadata Forms. Поддерживает плоские и иерархические данные, бесконечную прокрутку, группировку, сортировку, выделение строк и inline-редактирование.

## Архитектура

```
ElementsList/
├── index.tsx                    # Точка входа: ElementsList + ErrorBoundary
├── types.ts                     # Интерфейсы: ICell, IData, IColumnConfig, IMergedColumns
├── constants.ts                 # Константы: ROW_ID_FIELD_NAME, ROOT_PARENT_UUID
├── groupTableRows.ts            # Группировка строк по полям
├── ElementListContent.tsx       # 🧠 Главный компонент (~790 строк)
├── ReactWindowWrapperCombined/  # 🔧 Ядро виртуализированной таблицы
│   ├── index.tsx                # Экспорт ReactWindowWrapper + типы
│   ├── ReactWindowWrapper.tsx   # Виртуализированная таблица (класс)
│   ├── DataTable/               # Древовидная таблица для группировки
│   │   ├── DataTable.tsx
│   │   └── Icons/
│   ├── components/
│   │   ├── Cell/index.tsx       # Ячейка (клик, двойной клик)
│   │   ├── BodyCellRenderer.tsx # Рендеринг содержимого ячейки
│   │   ├── InnerGridElement.tsx # Рендеринг заголовка колонки
│   │   └── HeaderCell/
│   ├── utils.ts                 # ColumnResizeHelper, scrollToAlgo
│   └── utils/
│       ├── debounce.ts          # Debounce
│       ├── tableGeometry.ts     # getMergedLength, getRowHeight, resolveScrollPagination
│       ├── tableNavigation.ts   # Keyboard navigation
│       ├── tableSelectionHelper.ts # Ctrl/Shift selection
│       ├── scrollToCell.utils.ts
│       ├── calculateRowIndexFromMousePosition.ts
│       └── transformRowsForHook.ts
├── utils/
│   ├── columnConfig.ts          # Настройки колонок (localStorage)
│   ├── formatCellValue.ts       # Форматирование: boolean → Правда/Ложь
│   ├── mapColumnsForDataTable.ts
│   ├── mergedColumns.ts         # Группировка колонок
│   ├── tableViewAdapters.ts     # Адаптеры: toReactWindowTableData, toDataTableViewModel
│   ├── transformStateForRender.ts # Главная трансформация состояния
│   ├── tableSort.utils.ts       # Состояние сортировки колонок
│   └── HookKeyManager.ts        # Генерация ключей для hooks
└── components/
    └── TableShell.tsx           # Layout + ErrorBoundary wrapper
```

## Архитектура

### Высокоуровневое представление

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ElementsList (index.tsx)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     ErrorBoundary                               │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │                  ElementListContent                       │  │   │
│  │  │  (Состояние, подписки, hooks, логика)                     │  │   │
│  │  └──────┬──────────────────────────────────────┬──────────────┘  │   │
│  └─────────┼──────────────────────────────────────┼────────────────┘   │
│            │                                      │                   │
│            ▼                                      ▼                   │
│  ┌──────────────────────┐         ┌──────────────────────────────┐   │
│  │  Flat Table Mode     │         │  List/Table Mode             │   │
│  │                      │         │                              │   │
│  │  ReactWindowWrapper  │         │  DataTable                   │   │
│  │  ┌────────────────┐  │         │  ┌────────────────────────┐  │   │
│  │  │  HeaderRow     │  │         │  │  TreeRows                │  │   │
│  │  ├────────────────┤  │         │  │  └──────────────────────┘  │   │
│  │  │  VariableSize  │  │         └──┼────────────────────────┘   │   │
│  │  │  Grid          │  │            │                            │   │
│  │  │  ┌──────────┐  │  │            ▼                            │   │
│  │  │  │ BodyCell │  │  │      react-window (Virtualization)      │   │
│  │  │  │ render   │  │  │            │                            │   │
│  │  │  └──────────┘  │  │            ▼                            │   │
│  │  └────────────────┘  │         ┌────────────────────────┐   │   │
│  │         │            │         │  InnerGridElement       │   │   │
│  │         ▼            │         │  (Header resize/sort)   │   │   │
│  │  TableShell          │         └────────────────────────┘   │   │
│  └──────────────────────┘         └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Слои архитектуры

#### 1. Presentation Layer (Рендеринг)

Компоненты, отвечающие за визуальное отображение:

| Компонент | Назначение | Ключевые пропсы |
|-----------|------------|-----------------|
| `TableShell` | Обёртка с layout и ErrorBoundary | `children`, `bodyOverflow` |
| `ReactWindowWrapper` | Виртуализированная таблица | `data`, `cols`, `activeCell`, `renderMetaInput` |
| `DataTable` | Древовидная таблица с expand/collapse | `data`, `columns` |
| `Cell` | Ячейка с click/doubleClick | `styles`, `value`, `onClick`, `onDoubleClick` |
| `BodyCellRenderer` | Рендеринг содержимого ячейки | `rowIndex`, `tableColumnIndex`, `data`, `cols` |
| `InnerGridElement` | Заголовок таблицы (resize/sort) | `children`, `onResizeStart`, `onSort` |
| `HeaderCell` | Отдельный заголовок колонки | `column`, `handleSort` |

**ReactWindowWrapper** использует `react-window` `VariableSizeGrid` для виртуализации:
- `columnCount` / `rowCount` — общее количество колонок и строк
- `columnWidth` — функция, возвращающая ширину каждой колонки (учитывает hierarchy)
- `rowHeight` — функция, возвращающая высоту каждой строки (учитывает merged cells)
- `onScroll` — обработка скролла (infinite pagination)
- `onItemsRendered` — отслеживание видимых строк

#### 2. Data Layer (Трансформация данных)

Утилиты, преобразующие `IData` в формат для рендеринга:

```
IData ──▶ transformStateForRender ──▶ TransformStateResult
                      │
                      ├──► processMergedColumns (группировка колонок)
                      ├──► formatCellValue (приведение типов)
                      ├──► indexToId (rowIndex → ID для иерархии)
                      └──► visibleColumnNames filter
```

| Утилита | Вход | Выход | Назначение |
|---------|------|-------|------------|
| `transformStateForRender` | `IData + options` | `TransformStateResult` | Главная трансформация |
| `processMergedColumns` | `IMergedColumns, cols, rows` | `{ cols, rows }` | Группировка колонок |
| `formatCellValue` | `value, refValue` | `string\|unknown` | Приведение типов |
| `toReactWindowTableData` | `(ICell\|ICell[])[][]` | `TableRowData[]` | Адаптер для ReactWindowWrapper |
| `toDataTableViewModel` | `rows, cols, groupFields` | `{ data, columns }` | Адаптер для DataTable |
| `groupTableRows` | `rows, groupByFields` | `ICell[][] \| ITreeRow[]` | Вложенная группировка |
| `mapColumnsForDataTable` | `(IColumnData\|IColumnData[])[]` | `IInnerColumnMetadataProps[]` | Маппинг колонок |

#### 3. State Layer (Управление состоянием)

`ElementListContent` — единственный источник правды. Содержит 3 ключевых состояния:

| Состояние | Описание | Где используется |
|-----------|----------|------------------|
| `IElementsListState` | Глобальное: данные, пагинация, иерархия, выделение | Элемент целиком |
| `ITableState` | Вложенное: activeCell, колонки, rowCount | ReactWindowWrapper / DataTable |
| `IInfiniteScrollState` | Пагинация: currentPage, pages, limit | Элемент целиком |

**Состояние не синхронизируется через Redux** — используется локальный state + глобальные подписки (grouping.helper, selected-entity.helper).

#### 4. Integration Layer (Взаимодействие с миром)

| Компонент | Назначение |
|-----------|------------|
| `DataManager` | Получение данных, метаданных, опций |
| `HooksManager` | Глобальные hooks для выделения строк |
| `grouping.helper` | Подписка на настройки группировки |
| `selected-entity.helper` | Подписка на выбранную сущность |
| `MetaInput` | Inline-редактирование ячеек |

### Поток данных (Data Flow)

```
DataManager.ReloadData()
    │
    ▼
changeMasterData(list)
    │
    ▼
initializeState(data)
    │
    ├──► loadColumnConfig (localStorage)
    │
    ├──► transformStateForRenderProps(data)
    │       │
    │       ├──► processMergedColumns
    │       ├──► formatCellValue (ref mapping)
    │       └──► indexToId mapping
    │
    ├──► updateColumnSortState (если currentSort установлен)
    │
    ▼
setState({ data, table: { ... }, rowIndexToId, loading: false })
    │
    ▼
setDefaultSelection() → changeRow(0)
    │
    ▼
render() → renderFlatTable() / renderListTable()
    │
    ▼
ReactWindowWrapper / DataTable (виртуализированный рендеринг)
```

### ReactWindowWrapper internals

#### Состояние (IReactWindowWrapperCombinedState)

```typescript
interface IReactWindowWrapperCombinedState {
    scrollLeft: number;           // Горизонтальный скролл
    scrollTop: number;            // Вертикальный скролл
    mergedLength: number;         // Общее количество колонок с учётом групп
    width: number;                // Ширина таблицы
    height: number;               // Высота таблицы
    resizingIndex: number | null; // Индекс колонки при ресайзе
    startX: number;               // X-позиция начала ресайза
    startWidth: number;           // Ширина колонки перед ресайзом
    columnsMetadata: {            // Метаданные колонок
        x: number;
        width: number;
        minWidth?: number;
        maxWidth?: number;
        resizable?: boolean;
    }[];
    hoveredRowIndex: number | null; // Строка под курсором
    desiredColumnWidth: number[];  // Желаемая ширина колонок
}
```

#### Обработка событий

| Событие | Метод | Назначение |
|---------|-------|------------|
| `onMouseMove` | `handleContainerMouseMove` | Ресайз или hover |
| `onMouseUp` | `handleContainerMouseUp` | Конец ресайза |
| `onMouseLeave` | `handleContainerMouseLeave` | Сброс hover |
| `onKeyDown` | `props.onKeyDown` | Keyboard nav |
| `onScroll` | `handleScroll` | Infinite scroll |
| `onItemsRendered` | `handleItemsRendered` | Отслеживание видимых строк |

#### Infinite Scroll Logic

```
onScroll()
    │
    ▼
resolveScrollPagination(scrollTop, scrollHeight, clientHeight, ...)
    │
    ├──► action === 'next' → loadNext()
    ├──► action === 'prev' → loadPrev()
    └──► lockScroll() — защита от двойного вызова
```

#### Column Resize Logic

```
handleColumnResizeStart(columnIndex, startX)
    │
    ├──► saving: resizingIndex, startX, startWidth
    │
    ▼
handleColumnResize(clientX)
    │
    ├──► newWidth = max(DEFAULT_COLUMN_WIDTH, startWidth + delta)
    │
    ├──► ColumnResizeHelper.resizeColumnWidth()
    │
    ▼
handleColumnResizeEnd()
    │
    └──► resetting: resizingIndex = null
```

**ColumnResizeHelper** — статический класс с алгоритмами:
- `generateColumnsMetadata` — начальные метаданные (scaling по ширине контейнера)
- `resizeColumnWidth` — изменение ширины с распределением остатка на соседние
- `resizeTableWidth` — масштабирование при ресайзе контейнера

### TableContext

Контекст для передачи данных о таблице во вложенные компоненты:

```typescript
interface TableContextValueType {
    cols: (IColumnData | IColumnData[])[];
    handleResizeStart: (columnIndex, startX) => void;
    handleResize: (clientX) => void;
    handleResizeEnd: () => void;
    onSort?: (columnName: string) => void;
    hasColumnsHeader: boolean;
    mergedLength: number;
    hasHierarchy: boolean;
    resizingIndex: number | null;
    startWidth: number;
    startX: number;
    hasExpandedHierarchy: boolean;
    onHierarchyBack: () => void;
    columnsMetadata: IInnerColumnMetadata[];
    hoveredRowIndex: number | null;
    onRowHover: (rowIndex) => void;
}
```

Используется в `InnerGridElement` для header resize и sort.

### DataTable (Tree Table)

Используется для режимов группировки. Реализует рекурсивное разворачивание групп:

```
DataTable
    │
    ├── state: { expandedGroups: Set<string> }
    │
    ├── render
    │   ├── data-table__header (статичный)
    │   └── data-table__body
    │       └── TreeRows (рекурсивный компонент)
    │           ├── ITreeRow (isGroup=true) → expand/collapse
    │           └── ITreeRow (isGroup=false) → cells
    │
    └── handleToggleGroup(key) → Set.add/delete
```

**TreeRows** — рекурсивный компонент:
- `isTreeRow(item) && item.isGroup` → рендерит group row с иконкой
- `getLeafCells(item)` → извлекает cells из не-групповой строки
- `depth` → определяет отступ (12px + depth * 20px)

## Как расширять (дорабатывать)

### Добавление новой колонки

1. **Добавить в `IData.cols`** (в `DataManager.meta.list.cols`):

```typescript
{
    field: 'newField',      // Уникальный идентификатор
    type: 'string',         // number | string | boolean | datetime | ref
    name: 'newField',       // Отображаемое имя
    description: 'New Field',
    len: 50,
    show: true,             // Видимость по умолчанию
    hasSorting: true,       // Опционально: разрешить сортировку
}
```

2. **Подключить к `visibleColumnNames`** (если нужно ограничить видимые колонки):

```typescript
<ElementsList
    columns={['id', 'name', 'newField']}  // Только эти колонки
    ...
/>
```

### Добавление нового типа данных

1. **Определить в `formatCellValue.ts`**:

```typescript
// 1. Добавить код типа
const TYPE_CODE_TO_NAME: Record<number, string> = {
    0: 'string',
    1: 'float',
    2: 'boolean',
    3: 'datetime',
    10: 'ref',
    11: 'newType',  // ← новый тип
}

// 2. Добавить обработку в formatCellValue
export function formatCellValue(value: unknown, refValue?: unknown): unknown {
    if (isTypedValue(value)) {
        if (TYPE_CODE_TO_NAME[value.type] === 'newType') {
            // Ваша логика форматирования
            return formatNewType(value.value)
        }
        // ... существующие типы
    }
    return refValue ?? value ?? ''
}
```

### Реализация кастомного рендеринга ячеек

Используйте `renderMetaInput` prop в `ReactWindowWrapper`:

```typescript
const customRenderer: CellRenderCallback = (cellData: ICell | ICell[], metadata: CellRenderMetadata) => {
    const cell = Array.isArray(cellData) ? cellData[0] : cellData
    if (!cell) return null

    switch (cell.columnName) {
        case 'status':
            return (
                <Badge color={cell.value.viewedData === 'active' ? 'green' : 'red'}>
                    {cell.value.viewedData}
                </Badge>
            )
        case 'avatar':
            return <Avatar url={cell.value.viewedData} />
        default:
            return String(cell.value.viewedData)
    }
}

<ReactWindowWrapper
    data={tableData}
    cols={tableCols}
    renderMetaInput={customRenderer}
    ...
/>
```

### Добавление новой логики обработки кликов

1. **Для всех ячеек** — используйте `onCellClick`:

```typescript
const handleCellClick = (event: React.MouseEvent, payload: CellInteractionPayload) => {
    const { rowIndex, columnIndex } = payload
    // Ваша логика
    console.log(`Cell clicked: row ${rowIndex}, col ${columnIndex}`)
}

<ReactWindowWrapper
    data={tableData}
    cols={tableCols}
    onCellClick={handleCellClick}
    ...
/>
```

2. **Для конкретных колонок** — добавьте условие в `renderMetaInput`:

```typescript
const customRenderer = (cellData: ICell | ICell[]) => {
    const cell = Array.isArray(cellData) ? cellData[0] : cellData
    if (cell.columnName === 'clickableField') {
        return (
            <ClickableCell
                onClick={() => handleSpecificCellClick(cell)}
                value={cell.value.viewedData}
            />
        )
    }
    return String(cell.value.viewedData)
}
```

### Добавление навигации клавиатурой

1. **Добавить логика в `handleKeyDown` ElementListContent**:

```typescript
handleKeyDown(event: React.KeyboardEvent, cellData: ICell | ICell[] | null): void {
    // ... существующая логика

    if (event.code === 'F2') {
        event.preventDefault()
        // Ваша логика: например, открыть форму редактирования
        this.openEditFormForCell(cellData)
    }
}
```

2. **Или создать кастомный обработчик** и передать в `ReactWindowWrapper.onKeyDown`:

```typescript
const customKeyDown = (event: React.KeyboardEvent, cellData: ICell | ICell[] | null) => {
    if (event.code === 'Escape') {
        // Ваша логика Escape
    }
}

<ReactWindowWrapper
    onKeyDown={customKeyDown}
    ...
/>
```

### Добавление новой сортировки

1. **Убедиться, что колонка поддерживает сортировку**:

```typescript
{
    field: 'myField',
    type: 'string',
    name: 'My Field',
    hasSorting: true,  // ← должно быть true
}
```

2. **Реализовать логику сортировки** (если нужно кастомное поведение):

```typescript
onSort = async (columnName: string): Promise<void> => {
    // Ваша кастомная логика
    await this.customSort(columnName)

    // Обновить UI
    this.setState((prev) => ({
        table: prev.table ? {
            ...prev.table,
            cols: updateColumnSortState(
                prev.table.cols,
                columnName,
                newOrder,
            ),
        } : null,
    }))
}
```

### Реализация кастомной группировки

#### Группировка строк

```typescript
// 1. Определить поля группировки
const groupFields = ['category', 'subcategory']

// 2. Преобразовать данные
const { data, columns } = toDataTableViewModel({
    rows: tableData as (ICell | ICell[])[][],
    cols: tableCols,
    activeGroupFields: groupFields,
})

// 3. Передать в DataTable
<DataTable data={data} columns={columns} />
```

#### Группировка колонок

```typescript
// 1. Определить mergedColumns в props
const mergedColumns: IMergedColumns = {
    'personal-info': {
        sourceFields: ['firstName', 'lastName', 'email'],
        positionIndex: 0,  // Позиция группы
    },
    'contact-info': {
        sourceFields: ['phone', 'address'],
        positionIndex: 3,
    },
}

<ElementsList
    mergedColumns={mergedColumns}
    ...
/>
```

### Добавление кастомных данных (props)

1. **Расширить интерфейсы пропсов**:

```typescript
// В ReactWindowWrapperCombined/types.ts
export interface IReactWindowWrapperCombinedProps {
    // ... существующие пропсы
    customProp?: string
}
```

2. **Обработать в компоненте**:

```typescript
// В ReactWindowWrapper.tsx
const { customProp } = this.props

render(): ReactNode {
    // Используем customProp
    return (
        <div className={customProp ? `custom-${customProp}` : classes.table}>
            { /* ... */ }
        </div>
    )
}
```

### Расширение ColumnResizeHelper

1. **Добавить метод в класс**:

```typescript
// В utils.ts
export class ColumnResizeHelper {
    static yourNewMethod(
        columnsMetadata: IInnerColumnMetadata[],
        /* ... */
    ): IInnerColumnMetadata[] {
        // Ваша логика
        return updatedColumns
    }
}
```

2. **Использовать в ReactWindowWrapper**:

```typescript
// В ReactWindowWrapper.tsx
const newMetadata = ColumnResizeHelper.yourNewMethod(
    this.state.columnsMetadata,
    /* ... */
)
this.setState({ columnsMetadata: newMetadata })
```

### Добавление виртуализации

ReactWindowWrapper уже использует `react-window`. Для тонкой настройки:

```typescript
// Конфигурация VariableSizeGrid в ReactWindowWrapper
<VariableSizeGrid
    itemKey={({ rowIndex, columnIndex }) => `${rowIndex}_${columnIndex}`}
    ref={this.gridRef}
    columnCount={columnsCount}
    rowCount={rowsCount}
    columnWidth={(index) => {
        // Кастомная ширина колонок
        return this.state.columnsMetadata[index]?.width ?? DEFAULT_COLUMN_WIDTH
    }}
    rowHeight={(index) => getRowHeight({
        rowIndex: index + (hierarchy ? 2 : 1),
        data: this.props.data,
        hasExpandedHierarchy: this.props.hasExpendedHierarchy,
        mergedLength: this.state.mergedLength,
        mergedRowCoef: this.mergedRowCoef,
    })}
    // Кастомные параметры
    minWidth={100}
    minHeight={100}
    width={this.state.width}
    height={this.state.height}
    // ...
/>
```

### Тестирование расширений

Для добавления тестов новой функциональности:

```typescript
// 1. Создать тестовый файл
// В __test__/(utils/)

import { yourNewFunction } from '../yourNewFile'

describe('yourNewFunction', () => {
    test('basic behavior', () => {
        expect(yourNewFunction(input)).toBe(expected)
    })

    test('edge cases', () => {
        expect(yourNewFunction(null)).toBe(default)
    })
})

// 2. Запуск
npm test -- --testPathPattern="yourNewFile.test" --watchAll=false
```

Для компонентов используйте Testing Library:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'

it('renders correctly', () => {
    render(<YourComponent prop="value" />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
})

it('handles interaction', () => {
    const onClick = jest.fn()
    render(<YourComponent onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
})
```

## Constants

### Импорты

```typescript
import { ElementsList, ElementsListContent } from './ElementsList';
import type { IElementsListProps } from './ElementsList/types';

import { ReactWindowWrapper } from './ElementsList/ReactWindowWrapperCombined';
import type { IColumnData, ICell, IActiveCell } from './ElementsList/ReactWindowWrapperCombined/types';
```

### Инициализация

```typescript
const props: IElementsListProps = {
    data: {
        rows: [{ id: 1, name: 'Item 1' }],
        cols: [{ field: 'id', type: 'number', name: 'id', description: 'ID', len: 10, show: true }],
        refs: {},
        count: 1,
    },
    tableId: 'my-table',
    width: 800,
    height: 400,
    columns: ['id', 'name'],              // Опционально: видимые колонки
    DataManager: dataManager,              // DataManager instance
    name: 'list',
    mergedColumns: {                        // Опционально: группировка колонок
        'id-name': { sourceFields: ['id', 'name'] }
    },
};

<ElementsList {...props} />
```

## Режимы отображения

### 1. Плоская таблица (ReactWindowWrapper)

Используется по умолчанию. Виртуализированная таблица с infinite scroll.

**Ключи:**
- `data` — массив строк: `(ICell | ICell[])[][]`
- `cols` — массив колонок: `(IColumnData | IColumnData[])[]`
- `activeCell` — выбранная ячейка: `IActiveCell | null`
- `selectedRows` — индексы выбранных строк: `number[]`
- `renderMetaInput` — кастомный рендер содержимого ячеек
- `onHierarchyExpand` / `onHierarchyReduce` — навигация по иерархии
- `onSort` — сортировка по колонке
- `onCellClick` — обработка клика по ячейке
- `hierarchy` — флаг иерархических данных
- `isLoadingMore` / `loadNext` / `loadPrev` / `hasNext` / `hasPrev` — пагинация

### 2. Древовидная таблица (DataTable)

Используется для режимов группировки.

**Ключи:**
- `data` — массив строк с группировкой: `ICell[][] | ITreeRow[]`
- `columns` — массив колонок: `IInnerColumnMetadataProps[]`

## Трансформация данных

### Основной поток

```
IData → transformStateForRender → TransformStateResult { data, cols, indexToId }
                                  ↓
            ┌─────────────────────┴─────────────────────┐
            ↓                                           ↓
   renderFlatTable → toReactWindowTableData → ReactWindowWrapper
   renderListTable → toDataTableViewModel → DataTable
```

### transformStateForRender

Преобразует `IData` в формат для рендеринга:

```typescript
interface TransformStateResult {
    data: (ICell | ICell[])[][]      // Строки: массивы ячеек
    cols: (IColumnData | IColumnData[])[]  // Колонки: массивы данных колонок
    indexToId: Record<string, string>      // rowIndex → ID для иерархии
}
```

**Процесс:**
1. `processMergedColumns` — обработка объединённых колонок (`IMergedColumns`)
2. Создание `indexToId` маппинга из `ROW_ID_FIELD_NAME`
3. Фильтрация видимых колонок (`visibleColumnNames` или `show=false`)
4. Создание `ICell` с `originalData` и `viewedData` (через refs)

### Форматирование значений

`formatCellValue(value, refValue?)` обрабатывает типизированные значения:
- `{ type: 2, value: true }` → `'Правда'`
- `{ type: 2, value: false }` → `'Ложь'`
- `{ type: 0, value: 'hello' }` → `'hello'`
- Не типизированные → `refValue ?? value ?? ''`

## Управление состоянием

### Глобальное состояние (IElementsListState)

`ElementListContent` — class component с собственным state, объединяющим данные, таблицу, навигацию и UI:

```typescript
interface IElementsListState {
    data: IData | null;                       // Сырые данные для рендеринга
    table: ITableState | null;                 // Состояние таблицы
    hierarchyHistory: string[];                // Стек родителей для иерархии
    infiniteScroll: IInfiniteScrollState;      // Пагинация
    selectRows: number[];                      // Индексы выбранных строк
    lastSelectedRow: number | null;            // Последняя выделенная строка (для Shift+клик)
    loading: boolean;                          // Индикатор загрузки
    editableCell: string | null;               // Ключ редактируемой ячейки: `${rowIndex}-${columnName}`
    rowIndexToId: Record<string, string>;      // rowIndex → ID для навигации по иерархии
    selectedGroupFields: string[];             // Поля группировки из глобального хранилища
    disabledGroupFields: string[];             // Отключённые поля группировки
    selectedEntity: SelectedEntityData;        // Текущая выбранная сущность
}
```

### Состояние таблицы (ITableState)

Вложенное состояние, передаваемое в `ReactWindowWrapper` / `DataTable`:

```typescript
interface ITableState {
    rowCount: number;                          // Количество строк
    columnsCount: number;                      // Количество колонок
    data: (ICell | ICellList | ICell[])[][];   // Трансформированные данные
    cols: (IColumnData | IColumnData[])[];      // Колонки (возможно с сортировкой)
    activeCell: IActiveCell | null;            // Активная ячейка
    columnConfig?: (IColumnConfig | IColumnConfig[])[]; // Настройки колонок
    meta: {
        prevEditableCell: { rowIndex: number; columnIndex: number } | null;
    } | null;                                  // Предыдущая редактируемая ячейка
}
```

### Состояние бесконечной прокрутки (IInfiniteScrollState)

```typescript
interface IInfiniteScrollState {
    limit: number;                             // Строк на страницу (по умолч. 200)
    offset: number;                            // Смещение
    pages: number;                             // Всего страниц
    currentPage: number;                       // Текущая страница (1-based)
    hasPrev?: boolean;                         // Есть предыдущая страница
    hasNext?: boolean;                         // Есть следующая страница
}
```

### Активная ячейка (IActiveCell)

```typescript
interface IActiveCell {
    rowIndex: number;                          // Индекс строки
    columnIndex: number;                       // Индекс колонки
    groupIndex?: number;                       // Индекс группы (для вложенной группировки)
    colInGroupIndex?: number;                  // Индекс внутри группы
    sourceEvent?:                              // Источник последнего действия
        | { type: 'mouse' }
        | { type: 'keyboard'; direction: 'left' | 'right' | 'up' | 'down' };
    isEditing?: boolean;                       // Режим редактирования
}
```

## Подписки и глобальное состояние

### Подписка на настройки группировки

`ElementListContent` подписывается на глобальное хранилище настроек группировки:

```typescript
// lifecycle: componentDidMount
subscribeListSettings(
    ELEMENT_LIST_SUBSCRIBER,
    createListSettingsSubscriber(
        (key: keyof ListSettingsData, value: string[]) => {
            this.setState({
                [key]: value, // selectedGroupFields | disabledGroupFields
            });
        },
    ),
);

// lifecycle: componentWillUnmount
unsubscribeListSettings(ELEMENT_LIST_SUBSCRIBER);
```

### Подписка на выбранную сущность

```typescript
subscribeSelectedEntity(
    ELEMENT_LIST_SUBSCRIBER,
    createSelectedEntitySubscriber(
        (key: keyof SelectedEntityData, value: string) => {
            this.setState((prev) => ({
                selectedEntity: { ...prev.selectedEntity, [key]: value },
            }));
        },
    ),
);

// Определяет режим отображения:
private isListsMode(): boolean {
    return this.state.selectedEntity.title.trim().toLowerCase() === 'списки';
}
```

## Hooks (lite-react-hooks)

### Публикация выделения

При изменении выделения строки данные публикуются в глобальные hooks:

```typescript
private publishSelection(selectedIndexes: number[]): void {
    const selectedDataRows = selectedIndexes.map(
        (index) => this.state.data!.rows[index],
    );
    this.dataManager.selectedRows = selectedDataRows;

    HooksManager.setHook(
        HookKeyManager.selectRows(
            this.stateKey,          // modalUUID ?? 'list'
            this.formId,            // dataManager.formId
            transformRowsForHook(selectedDataRows),
        ),
    );
}

// Деселекция
deselectAllRows(): void {
    this.setState({ selectRows: [] });
    this.dataManager.selectedRows = [];
    HooksManager.setHook(
        HookKeyManager.deselectAll(this.stateKey, this.formId),
    );
}
```

### Ключи хуков (HookKeyManager)

Статический класс для генерации уникальных ключей:

```typescript
HookKeyManager.selectRows(stateKey, formId, transformedRows);
HookKeyManager.deselectAll(stateKey, formId);
```

### Перезагрузка через hooks

```typescript
// Подписки на перезагрузку (с сбросом пагинации и без)
const reloadWithPaginationResetKey = `${modalUUID}_reload_with_pagination_reset`;
const reloadWithoutPaginationResetKey = `${modalUUID}_reload_without_pagination_reset`;

HooksManager.subscribeHook({
    [reloadWithPaginationResetKey]: {
        [RELOAD_LOCAL_KEY]: () => this.handleReload(true), // сброс на страницу 1
    },
});

HooksManager.subscribeHook({
    [reloadWithoutPaginationResetKey]: {
        [RELOAD_LOCAL_KEY]: () => this.handleReload, // сохранение текущей страницы
    },
});
```

### Ключи перезагрузки

```typescript
this.reloadWithPaginationResetKey    // modalUUID + '_reload_with_pagination_reset'
this.reloadWithoutPaginationResetKey // modalUUID + '_reload_without_pagination_reset'
this.reloadLocalKey                  // 'reloadElementsList'
```

## Жизненный цикл

### componentDidMount

1. **Подписка на изменения группировки** — обновление `selectedGroupFields` / `disabledGroupFields`
2. **Подписка на выбранную сущность** — определение режима отображения
3. **Применение текущей сортировки** — если `dataManager.currentSort` установлен
4. **Подписка на hooks перезагрузки** — два ключа с общим `reloadLocalKey`

### componentWillUnmount

1. `unsubscribeListSettings(ELEMENT_LIST_SUBSCRIBER)`
2. `unsubscribeSelectedEntity(ELEMENT_LIST_SUBSCRIBER)`
3. `HooksManager.unsubscribeHook` (оба ключа)

## Поток данных

### Обновление данных (changeMasterData)

```typescript
changeMasterData(list: Record<string, unknown>[]): void {
    // 1. Формируем IData из массива строк
    const costil: IData = {
        cols: [...this.dataManager.meta.list?.cols],
        refs: { ...this.dataManager.meta.list?.refs },
        rows: [...list],
        count: this.dataManager.meta.list?.count ?? list.length,
    };

    // 2. Инициализируем состояние
    this.setState({ loading: true }, () => {
        this.initializeState(costil);
        this.setState(prev => ({
            infiniteScroll: { ...prev.infiniteScroll, pages: this.dataManager.pages }
        }));
    });
}
```

### Инициализация состояния (initializeState)

```typescript
initializeState(data: IData): void {
    // 1. Загрузка сохранённых настроек колонок
    loadColumnConfig(getTableConfigKey(formId, name), mergedColumns, hasHierarchy);

    // 2. Трансформация для рендеринга
    const tableData = this.transformStateForRenderProps(data);

    // 3. Применение сортировки
    const colsWithSort = updateColumnSortState(
        tableData.cols,
        this.dataManager.currentSort?.column,
        this.dataManager.currentSort?.direction,
    );

    // 4. Установка состояния
    this.setState({
        data,
        table: {
            data: tableData.data,
            cols: colsWithSort,
            columnsCount: tableData.cols.length,
            rowCount: tableData.data.length,
            activeCell: null,
            meta: { prevEditableCell: null },
        },
        rowIndexToId: tableData.indexToId,
        loading: false,
    }, () => this.setDefaultSelection()); // Автовыделение первой ячейки
}
```

### Трансформация props → render state

```typescript
transformStateForRenderProps(data: IData): TransformStateResult {
    return transformStateForRender({
        data,
        mergedColumns: this.props.mergedColumns,  // Группировка колонок
        visibleColumnNames: this.props.columns,   // Видимые колонки
        getFieldType: (fieldName) =>
            this.dataManager.metadata.treeObject?.Fields?.[fieldName]?.type ?? '',
    });
}
```

## Выделение строк

### Механизм

```typescript
handleSelection(event: React.MouseEvent, rowIndex: number): void {
    const currentState: SelectionState = {
        selectedRows: this.state.selectRows,
        lastSelectedRow: this.state.lastSelectedRow,
    };

    const newState = handleTableSelection(rowIndex, currentState, {
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
    });

    this.setState({
        lastSelectedRow: newState.lastSelectedRow,
        selectRows: newState.selectedRows,
    });
    this.publishSelection(newState.selectedRows); // → HooksManager
}

changeRow(rowIndex: number, isMultipleSelect = false): void {
    // Одиночный/множественный клик
    const newSelectedRows = isMultipleSelect
        ? this.state.selectRows.includes(rowIndex)
            ? this.state.selectRows.filter(i => i !== rowIndex)
            : [...this.state.selectRows, rowIndex]
        : [rowIndex];

    this.setState({ selectRows: newSelectedRows });
    this.publishSelection(newSelectedRows);
}
```

### Поведение по клавишам

| Комбинация | Поведение |
|------------|----------|
| `click` | Выделить строку (заменить выделение) |
| `Ctrl + click` | Переключить строку в выделении |
| `Shift + click` | Выделить диапазон от `lastSelectedRow` до `rowIndex` |
| `Ctrl + A` | Выделить все видимые строки |
| `Escape` | Закрыть/сфокусировать окно |

## Навигация клавиатурой

### Обработка нажатий

```typescript
handleKeyDown(event: React.KeyboardEvent, cellData: ICell | ICell[] | null): void {
    // Enter → открыть форму редактирования
    // Ctrl+A → выделить всё
    // Escape → остановить всплытие
    // Tab / Shift+Tab → перейти к следующей/предыдущей ячейке
    // ArrowUp/Down/Left/Right → переместить активную ячейку
}
```

### TableNavigation

Используется `tableNavigation` объект из `utils/tableNavigation.ts`:

```typescript
// Следующая ячейка
const nextCell = tableNavigation.getNextCell(
    activeCell, rowCount, columnCount, flatData, cols
);

// Предыдущая ячейка
const prevCell = tableNavigation.getPrevCell(
    activeCell, rowCount, columnCount, flatData, cols
);

// Ячейка по направлению
const newCell = tableNavigation.getCellByDirection(
    activeCell, direction, rowCount, columnCount, data.flat()
);
```

## Иерархия

### Стек истории (hierarchyHistory)

```typescript
hierarchyHistory: ['00000000-0000-0000-0000-000000000000']
```

### Развёртывание (onHierarchyExpand)

```typescript
onHierarchyExpand(rowIndex: number): Promise<void> {
    const parentId = this.state.rowIndexToId[rowIndex];
    const data = await this.fetchData(parentId);
    const tableData = this.transformStateForRenderProps(data);

    this.setState({
        data,
        table: { data: tableData.data, cols: tableData.cols, ... },
        rowIndexToId: tableData.indexToId,
        hierarchyHistory: [...prevState.hierarchyHistory, parentId],
        selectRows: [],
    });
}
```

### Свертывание (onHierarchyReduce)

```typescript
onHierarchyReduce(): Promise<void> {
    const hierarchyHistory = [...this.state.hierarchyHistory];
    hierarchyHistory.pop();
    const prevParent = hierarchyHistory[hierarchyHistory.length - 1];
    const data = await this.fetchData(prevParent);
    const tableData = this.transformStateForRenderProps(data);

    this.setState({
        data,
        table: { data: tableData.data, cols: tableData.cols, ... },
        rowIndexToId: tableData.indexToId,
        hierarchyHistory,
        selectRows: [],
    });
}
```

## Бесконечная прокрутка

### Загрузка страницы

```typescript
loadPage(page: number): void {
    const offset = (page - 1) * this.state.infiniteScroll.limit;
    this.dataManager.options = { ...this.dataManager.options, offset };

    this.setState(prev => ({
        infiniteScroll: {
            ...prev.infiniteScroll,
            offset, currentPage: page,
            hasPrev: page > 1, hasNext: page < prev.infiniteScroll.pages,
        }
    }));

    this.dataManager.ReloadData().finally(() => {
        this.setState({ loading: false });
    });
}

loadNext(): void {
    if (currentPage < pages) this.loadPage(currentPage + 1);
}

loadPrev(): void {
    if (currentPage > 1) this.loadPage(currentPage - 1);
}
```

### Перезагрузка (handleReload)

```typescript
handleReload(resetPagination = false): void {
    const newOptions = {
        ...this.dataManager.options,
        limit: this.state.infiniteScroll.limit,
        offset: resetPagination ? 0 : this.dataManager.options.offset,
    };

    if (this.dataManager.currentSort) {
        newOptions.order = [[this.dataManager.currentSort.column, this.dataManager.currentSort.direction]];
    }

    this.dataManager.options = newOptions;
    this.setState({ loading: true }, () => {
        void this.dataManager.ReloadData().finally(() => {
            this.setState({ loading: false });
        });
    });
}
```

## Сортировка

```typescript
onSort(columnName: string): Promise<void> {
    const newOrder = (currentSort?.column === columnName && currentSort?.direction === 'ASC')
        ? 'DESC'
        : 'ASC';

    // Обновить cols с меткой сортировки
    this.setState(prev => ({
        table: prev.table ? {
            ...prev.table,
            cols: updateColumnSortState(currentCols, columnName, newOrder),
        } : null,
        infiniteScroll: { ...prev.infiniteScroll, currentPage: 1 },
    }));

    // Установить сортировку на DataManager (для запроса к бэку)
    this.dataManager.currentSort = { column: columnName, direction: newOrder };

    // Установить order в опциях
    this.dataManager.options = {
        ...this.dataManager.options,
        order: [[columnName, newOrder]],
        offset: 0,
    };

    await this.dataManager.ReloadData();
}
```

## Inline-редактирование

### Определение редактируемой ячейки

```typescript
const cellKey = `${rowIndex}-${columnName}`;
const isEditable = this.state.editableCell === cellKey;
```

### Рендеринг MetaInput

```typescript
renderCellContent(cellData: ICell | ICell[], _metadata: CellRenderMetadata): ReactNode {
    return (
        <MetaInput
            DataManager={this.dataManager}
            field={`list.${rowIndex}.${columnName}`}
            readOnly={!isEditable}
            table
            fullWidth
            border={false}
            onDoubleClick={this.handleDoubleClick}
            onChange={() => {}}
        />
    );
}
```

## Сброс выделения по умолчанию

```typescript
setDefaultSelection(): void {
    if (!table || table.data.length === 0 || table.cols.length === 0) return;

    this.setState({
        table: { ...table, activeCell: { rowIndex: 0, columnIndex: 0 } },
    });
    this.changeRow(0);
}
```

## Управление настройками колонок

### Сохранение в localStorage

```typescript
// Ключ: table_columns_{formId}_{name}
const key = getTableConfigKey(formId, name);
saveColumnConfig(key, config);
const loaded = loadColumnConfig(key, mergedColumns, hasHierarchy);
```

### Нормализация конфигурации

`normalizeFlatConfig(flatConfig, mergedColumns, hasHierarchy)` восстанавливает структуру:
1. Добавляет иерархическую колонку (width: 150, resizable: false) при наличии иерархии
2. Группирует колонки по `mergedColumns`
3. Добавляет оставшиеся плоские колонки
4. Fallback: `{ width: 200, resizable: true }` при нехватке конфигурации

## TableSelectionHelper

```typescript
// Состояние выделения
interface SelectionState {
    selectedRows: number[];
    lastSelectedRow: number | null;
}

// Обработка выделения
const newState = handleTableSelection(rowIndex, currentState, {
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
});

// Утилиты
selectAllRows(rowIndices): SelectionState;
clearSelection(): SelectionState;
isRowSelected(rowIndex, selectedRows): boolean;
```

## TableNavigation

```typescript
const newCell = tableNavigation.getCellByDirection(
    activeCell,
    direction,      // 'up' | 'down' | 'left' | 'right'
    rowCount,
    columnCount,
    flatData,       // (ICell | ICell[])[]
);
```

## Scroll

### calculateScrollPosition

```typescript
interface ScrollPosition {
    x: number;
    y: number;
    height: number;
}

calculateScrollPosition(rowHeight, tableHeight, rowCount, scrollTop);
// Возвращает видимую область: startRow, endRow, topOffset
```

### scrollToCell

```typescript
scrollToCellUtils.calculateScrollPosition(
    cellIndex,
    columnWidth,
    tableWidth,
    rowHeight,
    tableHeight,
    scrollLeft,
    scrollTop,
);
// Определяет, нужно ли прокрутить таблицу для отображения ячейки
```

## ColumnResizeHelper

Класс для управления шириной колонок:

```typescript
class ColumnResizeHelper {
    columnsMetadata: { x: number; width: number; minWidth?: number; maxWidth?: number; resizable?: boolean }[];
    columns: IColumnData[];
    tableWidth: number;

    // Вычисление новой ширины при ресайзе
    handleResize(columnIndex: number, startX: number, newWidth: number): ColumnMetadata;
    // ...
}
```

## Constants

```typescript
// Типы данных для фильтрации
FILTER_TYPES_REF = ['ref']
FILTER_TYPES_DATE = ['date', 'datetime', 'time']
FILTER_TYPES_NUMBER = ['number', 'integer', 'float']

// Hooks
SELECTED_ROWS_HOOK_NAME = 'selectedRows'
ELEMENT_LIST_SUBSCRIBER = 'ElementsListContent'

// Иерархия
ROOT_PARENT_UUID = '00000000-0000-0000-0000-000000000000'
ROW_ID_FIELD_NAME = 'id'

// Перезагрузка
RELOAD_LOCAL_KEY = 'reloadElementsList'
```

## Тестирование

### Запуск

```powershell
# Все тесты ElementsList
npm test -- --testPathPattern="ElementsList" --watchAll=false

# Конкретный файл
npm test -- --testPathPattern="transformStateForRender.test" --watchAll=false

# С покрытием
npm test -- --testPathPattern="ElementsList" --watchAll=false --coverage
```

### Текущее покрытие

| Категория | Файлов | Протестировано |
|-----------|--------|---------------|
| `utils/` (root) | 7 | ✅ 7/7 |
| `utils/` (RWWC) | 8 | ✅ 6/8 |
| Компоненты | 5 | ✅ 3/5 |
| Ядро (ElementListContent, utils.ts) | 2 | ❌ 0/2 |
| **Итого** | **22** | **16/22 (73%)** |

**Пропущенные файлы (высокий риск регрессии):**
- `ElementListContent.tsx` — 791 строка, вся бизнес-логика
- `ReactWindowWrapperCombined/utils.ts` — `ColumnResizeHelper` (228 строк)
- `ReactWindowWrapperCombined/utils/tableGeometry.ts` — расчёты скролла/пагинации
- `ReactWindowWrapperCombined/utils/scrollUtils.ts` — 248 строк математики скролла

## Зависимости

- `ReactWindowWrapper` — виртуализированная таблица
- `DataTable` — древовидная таблица для группировки
- `ErrorBoundary` — обработка ошибок
- `MetaInput` — inline-редактирование ячеек
- `HooksManager` — глобальные hooks для выделения
- `grouping.helper` — настройка группировки
- `selected-entity.helper` — выбор сущности
- `lite-react-hooks` — state management

## Примеры использования

### Плоская таблица с иерархией

```typescript
<ElementsList
    data={tableData}
    width={800}
    height={400}
    DataManager={dataManager}
    name="products"
/>
```

### Таблица с группировкой колонок

```typescript
<ElementsList
    data={tableData}
    width={800}
    height={400}
    DataManager={dataManager}
    name="products"
    mergedColumns={{
        'product-info': { sourceFields: ['name', 'sku'] },
        'price-info': { sourceFields: ['price', 'tax'] }
    }}
/>
```

### Кастомный рендеринг ячеек

```typescript
<ReactWindowWrapper
    data={tableData}
    cols={tableCols}
    renderMetaInput={(cellData, metadata) => {
        return <MyCustomCellRenderer cell={cellData} />;
    }}
/>
```
