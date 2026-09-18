# SRDMDLTKLN-571 — Virtual Scrolling в матричной таблице (MTable)

## Описание задачи

Подключить Virtual Scrolling к `MTable` с использованием библиотеки `react-virtuoso` для оптимизации рендеринга больших таблиц.

## Используемые технологии

| Технология | Версия |
|---|---|
| `react-virtuoso` | ~4.18.10 (уже установлена в проекте) |
| `react` | 18 |
| UI | `ui-kit` (Checkbox, Tooltip) |

## Архитектурные решения

### 1. TableVirtuoso вместо Virtuoso

Для матричной таблицы используется `TableVirtuoso`, а не стандартный `Virtuoso`. Это связано с тем, что таблица имеет фиксированный заголовок (`TableHead`) и требует корректной работы с `<table>`-семантикой.

**Важно:** `TableVirtuoso` не имеет пропсов `header` или `columns` — ширина колонок синхронизируется через CSS-классы.

### 2. Фиксированный заголовок

Фиксированный заголовок реализуется через проп `fixedHeaderContent`. TableVirtuoso ожидает fragment с нативными `<th>`-элементами (без обёртки в `<TableRow>`). TableVirtuoso сам оборачивает содержимое в `<tr>`.

```tsx
fixedHeaderContent={() => <MTableHead columns={columns} />}
```

Этот проп создаёт нестабильный вложенный компонент, поэтому подавляется линтер:
```tsx
// eslint-disable-next-line react/no-unstable-nested-components
```

### 3. Рендеринг строк

Каждая строка рендерится через `itemContent`, который ожидает fragment с нативными `<td>`-элементами. TableVirtuoso сам создаёт `<tr>`.

```tsx
itemContent={(index, row) => (
    <MTableRow
        rowIdx={index}
        rowUuid={row[0]}
        rowName={row[1].name}
        columns={columns}
        matrixSet={matrixSet}
        onCellClick={this.handleCellClick}
    />
)}
```

### 4. Sticky-колонки

Первая колонка (имена строк) фиксирована при горизонтальном скролле с помощью CSS `position: sticky; left: 0`:

```css
.matrixRowHeader {
    white-space: nowrap;
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--ui-kit-colors-background-primary);
    width: 180px;
    min-width: 180px;
}
```

Заголовок первой колонки (пустой corner) также sticky:

```css
.matrixCorner {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--ui-kit-colors-background-primary);
    width: 180px;
    min-width: 180px;
}
```

`z-index: 2` у corner выше, чем `z-index: 1` у строки, чтобы corner оставался поверх sticky-строки при скролле.

### 5. Ширина колонок

Ширина колонок задается через CSS-классы, а не inline-стили:
- Sticky-колонки (header + cell): `width: 180px`
- Обычные колонки: `width: 120px`

### 6. Оптимизация рендеринга

`MTableRow` обернут в `React.memo` с кастомной функцией сравнения, чтобы избежать перерисовки строк, которые не изменились:

```tsx
export const MTableRow = memo(MTableRowImpl, (prev, next) => {
    // Always re-render if row identity or data changed
    if (prev.rowIdx !== next.rowIdx || prev.rowUuid !== next.rowUuid || prev.rowName !== next.rowName) {
        return false;
    }
    // Re-check if matrix data changed
    if (prev.matrixSet !== next.matrixSet) return false;
    // Re-check if callback identity changed (shouldn't happen for class field)
    if (prev.onCellClick !== next.onCellClick) return false;
    // Re-check if column count changed
    if (prev.columns.length !== next.columns.length) return false;
    return true;
});
```

### 7. Обёртка Table (components.Table)

TableVirtuoso позволяет переопределить базовый `<table>` через `components.Table`. Это используется для применения inline-стилей `width: 'max-content'` и `minWidth: '100%'`, чтобы таблица растягивалась на всю ширину и позволяла горизонтальный скролл:

```tsx
components={{
    Table: (props: React.HTMLAttributes<HTMLTableElement>): ReactElement => {
        const { style: tableStyle, className } = props;
        const merged = { ...(tableStyle || {}), width: 'max-content', minWidth: '100%' };
        const finalClass = className ? `${style.matrixTable} ${className}` : style.matrixTable;
        return <table style={merged} className={finalClass} />;
    },
}}
```

### 8. Border-collapse

Для корректной работы sticky-колонок с border используется `border-collapse: separate`:

```css
.matrixTable {
    border-collapse: separate;
    border-spacing: 0;
}
```

### 9. Layout высоты контейнеров

Цепочка высот для корректной работы TableVirtuoso:

- `.wrapper`: `height: 70vh; display: flex; flex-direction: column` — фиксированная высота и flex-контейнер
- `.horizontalScroll`: `flex: 1 1 auto; min-height: 0` — занимает оставшееся пространство. `min-height: 0` критичен для flex-элементов с overflow (без него flex-элемент не сжимается меньше содержимого)
- `TableVirtuoso`: `style={{ height: '100%' }}` — растягивается на всю доступную высоту

## Изменения в коде

### Новые файлы

#### `src/components/MatrixTable/components/MTableHead.tsx`

Компонент для рендеринга заголовка таблицы. Возвращает fragment с нативными `<th>`-элементами. Поддерживает Tooltip для длинных названий колонок.

```tsx
export function MTableHead({ columns }: MTableHeadProps): ReactElement {
    return (
        <>
            <th className={style.matrixCorner} aria-hidden />
            {columns.map(({ uuid, name }) => (
                <th key={uuid} className={style.matrixColumnHeader}>
                    <div className={style.matrixHeaderContent}>
                        <Tooltip content={name} allowedPlacements={['top', 'bottom']} containerClassName={style.matrixHeaderText}>
                            <span>{name}</span>
                        </Tooltip>
                    </div>
                </th>
            ))}
        </>
    );
}
```

#### `src/components/MatrixTable/components/MTableRow.tsx`

Компонент строки, обернутый в `React.memo` с кастомной функцией сравнения для оптимизации перерисовки. Возвращает fragment с нативными `<td>`-элементами.

```tsx
export const MTableRow = memo(MTableRowImpl, (prev, next) => { ... });
```

### Изменённые файлы

#### `src/components/MatrixTable/components/MTable.tsx`

**Удалено:**
- Импорт `Table, TableBody, TableHead, TableRow, TableCell, Checkbox` из `ui-kit`
- Ручной рендеринг `<Table>`, `<TableHead>`, `<TableBody>`, `<TableRow>`
- Массив `columns` использовался напрямую из `Object.entries(columnsObj)`

**Добавлено:**
- Импорт `TableVirtuoso` из `react-virtuoso`
- Импорт `MTableHead`, `MTableRow`
- Типы `MatrixRowEntry = [string, { name: string }]`, `MatrixColumnEntry = [string, { name: string }]`
- Конвертация `columnsRaw` в массив объектов `{ uuid, name }`
- `TableVirtuoso` с `fixedHeaderContent` и `itemContent`
- Кастомный `components.Table` для inline-стилей ширины
- `// eslint-disable-next-line react/no-unstable-nested-components` для `fixedHeaderContent` и `itemContent`

#### `src/components/MatrixTable/matrix.module.css`

**Изменённые стили:**

```css
.wrapper {
    width: 100%;
    height: 70vh;           /* было: 100% */
    max-height: 70vh;
    overflow: hidden;
    border-radius: 5px;
    display: flex;          /* добавлено */
    flex-direction: column; /* добавлено */
}

.horizontalScroll {
    width: 100%;
    flex: 1 1 auto;         /* было: height: 100%; max-height: inherit */
    min-height: 0;          /* добавлено */
    overflow: auto;
    position: relative;
}
```

**Добавленные классы:**
- `.matrixCorner` — sticky-заголовок первой колонки
- `.matrixColumnHeader` — заголовок обычной колонки
- `.matrixRowHeader` — sticky-ячейка первой колонки (имя строки)
- `.matrixCell` — обычная ячейка
- `.matrixTable` — `border-collapse: separate; border-spacing: 0`

**Удалено/перемещено:**
- `.matrixError` — цвет изменён с `#d32f2f` на `var(--ui-kit-colors-alert-error)`
- `.matrixColumnHeader` и `.matrixRowHeader` разделены (ранее были объединены)
- `.matrixCell` перенесён в начало файла и дополнен width-стилями
- `.matrixHeaderContent`, `.matrixHeaderText`, `.matrixLoading` — без изменений

#### `src/components/MetadataHier/actions/edit/api/handleEdit.tsx`

Форматирование: объединение типа `OnSave` в одну строку. Незначительное изменение.

## Тестирование

1. Открыть матричную таблицу с большим количеством строк/колок — рендеринг должен оставаться быстрым (60 FPS)
2. Проверить фиксированный заголовок — заголовок должен оставаться видимым при вертикальном скролле
3. Проверить sticky-колонку — первая колонка (имена строк) должна оставаться видимой при горизонтальном скролле
4. Проверить hover и active-состояния ячеек — все стили должны работать корректно
5. Проверить drag-to-scroll — горизонтальная прокрутка через перетаскивание должна работать
6. Проверить aria-атрибуты и доступность — каждая ячейка с чекбоксом имеет `aria-label`

## Примечания

- `fixedHeaderContent` и `itemContent` всегда создают новые функции при каждом рендере родителя. Это ожидаемое поведение API TableVirtuoso, подавляется линтером через `eslint-disable-next-line`.
- Sticky-колонки работают благодаря `border-collapse: separate`. С `border-collapse: collapse` sticky позиционирование не работает.
- `min-height: 0` на `.horizontalScroll` критичен для корректной работы flexbox с overflow. Без него flex-элемент не сжимается меньше содержимого, и TableVirtuoso не может корректно вычислить высоту.
