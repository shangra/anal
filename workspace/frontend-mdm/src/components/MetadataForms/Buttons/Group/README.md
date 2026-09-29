# Group — Настройка группировок и отборов для списков метаданных

## Overview

`Group` — это кнопка-триггер и модальное окно для настройки **группировок** (группировка по полям) и **отборов** (фильтры условий) в компонентах Metadata Forms. Компонент построен как React class-component и использует собственное хранилище состояний через `listSettingsActions` из `helpers/listSettings`.

---

## Directory Structure

```
Group/
├── index.tsx                          # Точка входа: кнопка "Группировки"
├── types.ts                           # Типы Props и State для кнопки
├── package.json                       # Мета-данные модуля (MF export)
├── Icon/                              # Иконки для вкладок и UI
│   ├── group.icon.js                  # Иконка группы (主 кнопка)
│   ├── selectionTab.icon.js           # Иконка вкладки "Отбор"
│   ├── sortingTab.icon.js             # Иконка вкладки "Сортировка"
│   ├── conditionalRegistrationTab.icon.js
│   ├── groupTab.icon.js               # Иконка вкладки "Группировка"
│   ├── collapse.icon.js               # Иконка сворачивания
│   ├── fieldLine.icon.js              # Иконка поля
│   ├── haschildren.icon.js            # Иконка "имеет дочерние"
│   ├── plus.icon.js                   # Иконка "плюс"
│   └── more.icon.js                   # Иконка "..." (dropdown)
├── ListSettingsModal/                 # === ГЛАВНОЕ МОДАЛЬНОЕ ОКНО ===
│   ├── ListSettingsModal.tsx          # Основной компонент модального окна
│   ├── ListSettingsModal.css          # Стили модального окна
│   ├── types.ts                       # Типы для модального окна
│   ├── constants.ts                   # Заголовки и иконки вкладок
│   │
│   ├── tabs/                          # === ВКЛАДКИ (табы) ===
│   │   ├── index.ts                   # Barrel export
│   │   ├── types.ts                   # State для каждого таба
  │   │   ├── GroupingTab.tsx            # Вкладка "Группировка"
  │   │   ├── SelectionTab.tsx           # Вкладка "Отбор"
  │   │   ├── SortTab.tsx                # Вкладка "Сортировка"
  │   │   └── ConditionalFormattingTab.tsx # Вкладка "Условное форматирование"
│   │
│   ├── panels/                        # === ЛЕВАЯ ПАНЕЛЬ (доступные поля) ===
│   │   ├── index.ts                   # Barrel export
│   │   ├── types.ts                   # Типы панелей
│   │   ├── panels.utils.ts            # Утилиты для обхода дерева
│   │   ├── AvailableFieldsPanel.tsx   # Базовая панель (композиция)
│   │   ├── AvailableGroupingFieldsPanel.tsx   # Для вкладки группировки
│   │   ├── AvailableSelectionFieldsPanel.tsx  # Для вкладки отбора
│   │   └── FieldTreeNodeView.tsx      # Один узел дерева
│   │
│   ├── lists/                         # === ПРАВАЯ ПАНЕЛЬ (список выбранных) ===
│   │   ├── index.ts                   # Barrel export
│   │   ├── types.ts                   # Типы тулбара
│   │   ├── FacetsToolbar.tsx          # Тулбар (Add/Delete/Move/Group)
│   │   └── SelectionRow.tsx           # Рендерер строки отбора
│   │
│   ├── rows/                          # === КОМПОНЕНТЫ СТРОК ===
│   │   ├── index.ts                   # Barrel export
│   │   ├── types.ts                   # Типы строк
│   │   ├── ConditionRow.tsx           # Строка условия отбора
│   │   ├── ConditionRow.utils.ts      # Утилиты для ConditionRow
│   │   ├── GroupRow.tsx               # Строка-группа (AND/OR/NOT)
│   │   ├── ValueEditor.tsx            # Редактор значения (inline)
│   │   ├── valueEditorRenderers.tsx   # Рендеры значений по типам
│   │   └── valueEditorUtils.ts        # Утилиты форматирования
│   │
│   ├── dnd/                           # === DRAG & DROP ===
│   │   ├── groupingDnd.ts             # DnD для группировки
│   │   └── selectionDnd.ts            # DnD для отбора
│   │
│   ├── shared/                        # === ОБЩИЕ УТИЛИТЫ ===
│   │   ├── utils.ts                   # Utils + buildGroupingFieldsTree
│   │   ├── types.ts                   # Общие типы (GroupingFieldTreeNode)
│   │   └── multiSelect.ts             # Логика Ctrl/Shift multi-select
│   │
│   ├── modals/                        # === ВЛОЖЕННЫЕ МОДАЛКИ ===
│   │   ├── index.ts                   # Barrel export
│   │   ├── types.ts                   # Типы модалок
│   │   ├── AddFieldsModal.tsx         # Модалка "Добавить поля"
│   │   └── ModalDialog.tsx            # Базовый modal overlay
│
└── shared/                            # Общий узел дерева полей
    └── types.ts                       # GroupingFieldTreeNode type
```

---

## Архитектура

### Высокоуровневая схема

```
Group (кнопка в toolbar)
 │
 │  onClick → $windows.open() → ListSettingsModal (940x500px)
 │
 ListSettingsModal
  ├── Tabs header (TABS array: filter, sort, conditional, grouping)
  │
  ├── activeTab === 'grouping' → GroupingTab
  │    ├── AvailableGroupingFieldsPanel (дерево доступных полей слева)
  │    ├── FacetsToolbar (кнопки управления)
  │    ├── Список выбранных полей (чекбокс, reorder, enable/disable)
  │    └── AddFieldsModal (popup для добавления)
  │
  ├── activeTab === 'filter' → SelectionTab
  │    ├── AvailableSelectionFieldsPanel (дерево слева)
  │    ├── FacetsToolbar
  │    ├── Список условий отбора
  │    │    ├── SelectionConditionRow (checkbox + field + comparison + value)
  │    │    ├── SelectionGroupRow (AND/OR/NOT group)
  │    │    └── ValueEditor (inline value editing)
  │    └── AddFieldsModal
  │
  ├── activeTab === 'sort' → SortTab
  │    ├── AvailableSortFieldsPanel (дерево доступных полей слева)
  │    ├── FacetsToolbar (Add/Delete/Move/Enable/Direction)
  │    ├── Список правил сортировки
  │    │    ├── SortRuleRow (checkbox + field + direction toggle + reorder)
  │    │    └── DirectionToggle (ASC/DESC switcher)
  │    └── AddFieldsModal
  │
  ├── activeTab === 'conditional' → ConditionalFormattingTab
  │    ├── AvailableFieldsPanel (выбор полей для форматирования)
  │    ├── FacetsToolbar (Add/Delete/Move/Enable/Rule editor)
  │    ├── Список правил условного форматирования
  │    │    ├── ConditionalRuleRow (appearance + conditions)
  │    │    ├── AppearanceEditor (color, font, format picker)
  │    │    └── ConditionNodeEditor (field + comparison + value)
  │    └── ConditionalFormattingSettingsModal (advanced settings)
  │
 │
 └── Shared:
      ├── DnD (groupingDnd / selectionDnd)
      ├── Multi-select (multiSelect.ts)
      └── Snapshot-based undo (takeSnapshots / restoreSnapshot)
```

### Поток данных

```
Button (index.tsx)
  → loadFields() → Api.fetchFieldsByObject()
  → listSettingsActions.setAvailableFields() (глобальное хранилище)
  → open ListSettingsModal
         │
         ▼
  GroupingTab / SelectionTab
         │
         ▼
  groupingSettingsActions / selectionSettingsActions / sortSettingsActions / conditionalFormattingSettingsActions
         │
         ▼
  Store updates → re-render
```

---

## Расширение: как добавлять новое

### 1. Добавить новую вкладку (Tab)

**Цель:** добавить новый таб в модальное окно (например, "Сортировка", "Экспорт" и т.д.)

#### Шаг 1: Обновить `ListSettingsModal/types.ts`

```typescript
// Добавить новое значение в union SettingsTab
export type SettingsTab = 'filter' | 'sort' | 'conditional' | 'grouping' | 'myNewTab';

// Добавить запись в массив TABS
export const TABS: TabDefinition[] = [
    // ... существующие
    {
        key: 'myNewTab',
        title: 'Мой таб',
        icon: MyTabIcon, // импортировать из Icon/
        // iconComponent: MyTabIcon,  // если используется iconComponent
    },
];
```

#### Шаг 2: Обновить `ListSettingsModal/constants.ts`

Добавить заголовок и иконку:

```typescript
import { MyTabIcon } from '../Icon/myTab.icon';

export const TITLES: TabTitleConfig[] = [
    // ... существующие
    { icon: MyTabIcon, title: 'Мой таб' },
];
```

#### Шаг 3: Создать `ListSettingsModal/tabs/MyNewTab.tsx`

```tsx
import { Component, type ReactNode } from 'react';
import { groupingSettingsActions, selectionSettingsActions } from '...';
import type { MyNewTabState, MyNewTabProps } from './types';

export class MyNewTab extends Component<MyNewTabProps, MyNewTabState> {
    // Подписка на ревизию для ре-рендера при изменениях
    componentDidMount() {
        const unsubscribe = emitListSettingsRevision(() => this.forceUpdate());
        this.unsubscribers.push(unsubscribe);
    }

    render(): ReactNode {
        return (
            <div className="my-new-tab">
                {/* Левая панель (дерево доступных полей) */}
                <div className="left-panel">{/* AvailableFieldsPanel или кастомная */}</div>

                {/* Правая панель (список + тулбар) */}
                <div className="right-panel">
                    <FacetsToolbar /* ... */ />
                    <div className="items-list">{/* Рендеринг списка элементов */}</div>
                </div>
            </div>
        );
    }
}
```

#### Шаг 4: Добавить типы в `ListSettingsModal/tabs/types.ts`

```typescript
export interface MyNewTabState {
    // ...ваше состояние
}

export interface MyNewTabProps extends ListSettingsModalBaseProps {
    // ...ваши пропсы
}
```

#### Шаг 5: Экспортировать в `ListSettingsModal/tabs/index.ts`

```typescript
export { MyNewTab } from './MyNewTab';
export type { MyNewTabProps, MyNewTabState } from './types';
```

#### Шаг 6: Добавить рендеринг в `ListSettingsModal.tsx`

```tsx
// В методе render():
{
    this.state.activeTab === 'myNewTab' && (
        <MyNewTab
            active={true}
            initialSettings={this.state.snapshot}
            onCancel={this.handleCancel}
            onApply={this.handleApply}
        />
    );
}
```

---

### 2. Добавить новое поле в дерево доступных полей

**Цель:** чтобы новые поля отображались в левой панели (дерево).

#### Шаг 1: Обновить `ListSettingsModal/shared/types.ts`

Если нужно новое свойство в узле:

```typescript
export interface GroupingFieldTreeNode {
    id: string;
    label: string;
    value: string;
    isGroupLevel: boolean;
    children: GroupingFieldTreeNode[];
    rawType?: string;
    // === НОВОЕ ===
    myNewProperty?: boolean;
}
```

#### Шаг 2: Обновить `Group/index.tsx` → `loadFields()`

Добавить поле при маппинге:

```tsx
const fields = (res.registryFields ?? [])
    .filter((el) => el.show)
    .map(({ id, label, value }) => ({
        id,
        label,
        value,
        isGroupLevel: false,
        children: [],
        rawType: (typeByField.get(value) as string) ?? undefined,
        // === НОВОЕ ===
        myNewProperty: someCondition,
    }));
```

#### Шаг 3: Отобразить в `FieldTreeNodeView.tsx`

```tsx
// Добавить отображение нового свойства в узле дерева
<div className="field-tree-node">
    <span className="field-label">{label}</span>
    {myNewProperty && <span className="field-badge">NEW</span>}
</div>
```

---

### 3. Добавить новый тип строки в правую панель

**Цель:** добавить новый тип строки в список выбранных элементов (например, "Вычисляемое поле", "Агрегация").

#### Шаг 1: Обновить `ListSettingsModal/rows/types.ts`

```typescript
export interface NewRowProps {
    // ваши пропсы
}
```

#### Шаг 2: Создать `ListSettingsModal/rows/NewRow.tsx`

```tsx
import { Component, type ReactNode } from 'react';
import type { NewRowProps } from './types';

export class NewRow extends Component<NewRowProps> {
    render(): ReactNode {
        const {
            /* ...props */
        } = this.props;
        return <div className="selection-row new-row">{/* Контент строки */}</div>;
    }
}
```

#### Шаг 3: Добавить в `ListSettingsModal/lists/SelectionRow.tsx`

```tsx
// В factory-функции (if/else pattern, не switch):
export function renderSelectionRow({ row /* ... */ }: SelectionRowRendererProps): ReactNode {
    if (row.type === 'group') {
        return <SelectionGroupRow row={row} /* ... */ />;
    }

    // === НОВОЕ ===
    if (row.type === 'new') {
        return <NewRow row={row} /* ... */ />;
    }

    return <SelectionConditionRow row={row} /* ... */ />;
}
```

````

#### Шаг 4: Обновить `ListSettingsModal/rows/index.ts`

```typescript
export { NewRow } from './NewRow'
````

---

### 4. Добавить новый action в тулбар (FacetsToolbar)

**Цель:** добавить новую кнопку в верхний тулбар правой панели (Add/Delete/Move/Group).

#### Шаг 1: Обновить `ListSettingsModal/lists/types.ts`

```typescript
export interface FacetsToolbarProps {
    // ... существующие
    onNewAction?: () => void; // новый callback
    isNewActionDisabled?: boolean;
    newActionLabel?: string;
}
```

#### Шаг 2: Обновить `ListSettingsModal/lists/FacetsToolbar.tsx`

```tsx
export const FacetsToolbar = ({
    onAdd,
    onDelete,
    onMoveUp,
    onMoveDown,
    onGroup,
    onUngroup,
    // === НОВОЕ ===
    onNewAction,
    isNewActionDisabled,
    newActionLabel = 'New Action',
}: FacetsToolbarProps) => {
    return (
        <div className="facets-toolbar">
            {/* ... существующие кнопки */}

            {/* НОВОЕ */}
            <Button title={newActionLabel} color="primary" disabled={isNewActionDisabled} onClick={onNewAction} />
        </div>
    );
};
```

#### Шаг 3: Передать callback из таба (GroupingTab / SelectionTab)

```tsx
<FacetsToolbar
    onAdd={this.handleAdd}
    onDelete={this.handleDelete}
    onNewAction={this.handleNewAction}
    isNewActionDisabled={!this.hasSelection()}
    // ...
/>
```

---

### 5. Добавить новый DnD-механизм

**Цель:** поддержка drag-and-drop для нового типа элементов.

#### Шаг 1: Создать файл `ListSettingsModal/dnd/myNewDnd.ts`

```typescript
export const MY_NEW_DND_MIME = 'application/x-mdm-mynew';

export interface MyNewDragPayload {
    source: 'available' | 'selected' | 'external';
    ids: string[];
    // ... дополнительные поля
}

export function writeMyNewDragPayload(dataTransfer: DataTransfer, payload: MyNewDragPayload): void {
    const json = JSON.stringify(payload);
    dataTransfer.setData(MY_NEW_DND_MIME, json);
    dataTransfer.setData('text/plain', json); // fallback
}

export function readMyNewDragPayload(dataTransfer: DataTransfer): MyNewDragPayload | null {
    const json = dataTransfer.getData(MY_NEW_DND_MIME) || dataTransfer.getData('text/plain');
    if (!json) return null;
    try {
        return JSON.parse(json) as MyNewDragPayload;
    } catch {
        return null;
    }
}
```

#### Шаг 2: Использовать в компоненте (таб или panel)

```tsx
import { writeMyNewDragPayload, readMyNewDragPayload } from './dnd/myNewDnd';

handleDragStart = (e: React.DragEvent, fields: string[]) => {
    writeMyNewDragPayload(e.dataTransfer, { source: 'selected', ids: fields });
};

handleDrop = (e: React.DragEvent) => {
    const payload = readMyNewDragPayload(e.dataTransfer);
    if (!payload) return;
    e.preventDefault();
    // Обработка payload...
};
```

---

### 6. Добавить новую вложенную модалку

**Цель:** добавить popup-модалку внутри таба (аналогично AddFieldsModal).

#### Шаг 1: Создать `ListSettingsModal/modals/MyNewModal.tsx`

```tsx
import { Component, type ReactNode } from 'react';
import type { MyNewModalProps } from './types';
import './ModalDialog.css';

export class MyNewModal extends Component<MyNewModalProps> {
    render(): ReactNode {
        const { open, onClose, title, children } = this.props;
        if (!open) return null;

        return (
            <div className="modal-overlay">
                <div className="modal-dialog">
                    <div className="modal-header">
                        <span className="modal-title">{title}</span>
                        <button onClick={onClose}>×</button>
                    </div>
                    <div className="modal-body">{children}</div>
                    <div className="modal-footer">
                        <Button title="Закрыть" onClick={onClose} />
                    </div>
                </div>
            </div>
        );
    }
}
```

#### Шаг 2: Добавить в `ListSettingsModal/modals/types.ts`

```typescript
export interface MyNewModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children?: ReactNode;
}
```

#### Шаг 3: Экспортировать и использовать

```typescript
// modals/index.ts
export { MyNewModal } from './MyNewModal';
```

---

### 7. Добавить новые CSS-переменные/стили

**Цель:** настроить цветовую схему, отступы, состояния.

#### Шаг 1: Редактировать `ListSettingsModal/ListSettingsModal.css`

```css
/* Основные CSS-переменные (см. уже существующие в файле) */
:root {
    --new-bg-color: #...;
    --color-text: #...;
    --main-effect-color: #...;
}

/* Добавить новые */
.my-new-class {
    /* стили */
}

.my-new-class:hover {
    /* hover state */
}

.my-new-class--disabled {
    /* disabled state */
}
```

#### Шаг 2: Добавить новые CSS-модификаторы для состояний

```css
/* Pattern для состояний элементов списка */
.selection-row--highlighted {
    background-color: var(--new-bg-color);
}

.selection-row--disabled {
    opacity: 0.5;
    pointer-events: none;
}

.selection-row--dragging {
    opacity: 0.5;
}
```

---

## State Management

### Глобальное хранилище (`helpers/listSettings`)

```
helpers/listSettings/
├── index.ts                  # Main entry
├── pipeline/                 # Pipeline settings
│   ├── types.ts
│   ├── getActiveListView.ts
│   └── applyListView.ts
├── fields/                   # Field settings
│   ├── types.ts
│   └── catalog.ts
├── facets/                   # Facets (selection/grouping/sort/conditional)
│   ├── selection/            # Selection/filter facets
│   │   ├── types.ts
│   │   ├── store.ts          # selectionSettingsActions
│   │   ├── tree.ts           # Immutable tree manipulation
│   │   └── apply.ts          # Matching engine
│   ├── grouping/             # Grouping facets
│   │   ├── types.ts
│   │   ├── store.ts          # groupingSettingsActions
│   │   └── apply.ts          # applyGroupingToFlatRows
│   ├── sort/                 # Sort facet
│   │   ├── types.ts          # SortRule, SortSettingsState
│   │   └── store.ts          # sortSettingsActions
│   └── conditionalFormatting/ # Conditional formatting facet
│       ├── types.ts          # ConditionalFormattingRule, ConditionalAppearance
│       ├── store.ts          # conditionalFormattingSettingsActions
│       └── apply.ts          # formatCellBy1CFormat, appearanceToCssProperties
```

### Ключевые Actions

| Action | Описание |
|--------|----------|
| `setAvailableFields(fields)` | Установить доступные поля для группировки |
| `addGroupFields(fields)` | Добавить поля в группировку |
| `removeGroupFields(values)` | Удалить поля из группировки |
| `toggleGroupFields(values)` | Вкл/Выкл поля в группировке |
| `addSelectionConditions(rows)` | Добавить условия отбора |
| `removeSelectionConditions(ids)` | Удалить условия отбора |
| `moveSelectionRow(id, direction)` | Переместить строку отбора |
| `groupSelectionConditions(ids)` | Сгруппировать условия (AND/OR) |
| `ungroupSelectionConditions(id)` | Разгруппировать условия |
| **Sort Actions** | |
| `addSortField(field)` | Добавить поле в сортировку (ASC) |
| `addSortFields(fields)` | Добавить несколько полей |
| `removeSortField(field)` | Удалить поле из сортировки |
| `removeSortFields(fields)` | Удалить несколько полей |
| `changeSortDirection(field, direction)` | Переключить ASC/DESC |
| `moveSortRules(fields, direction)` | Переместить вверх/вниз |
| `reorderSortRules(fieldsToMove, targetIndex)` | Изменить порядок (DnD) |
| `toggleSortFieldEnabled(field)` | Вкл/Выкл поле сортировки |
| `setAvailableFields(fields)` | Установить доступные поля |
| `setFieldTypes(fieldTypes)` | Установить маппинг типов полей |
| **Conditional Formatting Actions** | |
| `addRule(defaultField?)` | Добавить правило форматирования |
| `updateRule(id, patch)` | Обновить правило |
| `toggleRuleEnabled(id)` | Вкл/Выкл правило |
| `setConditionNodes(ruleId, nodes)` | Установить условия правила |
| `removeRules(ids)` | Удалить правила |
| `moveRules(ids, direction)` | Переместить правила вверх/вниз |
| `restoreSnapshot(snapshot)` | Восстановить снимок |

### Snapshots (Undo/Redo)

```typescript
// Создание снимка текущего состояния
const snapshot = takeSnapshots();

// Восстановление из снимка
restoreSnapshot(snapshot);

// Сброс к исходному
handleReset();
```

---

## Зависимости

| Зависимость                     | Описание                                |
| ------------------------------- | --------------------------------------- |
| `ui-kit`                        | UI-компоненты (Button, DateTime и т.д.) |
| `../../DataManager`             | DataManager для загрузки полей          |
| `../../../ui/windows.helper`    | `$windows.open()` для открытия модалок  |
| `../../helpers/grouping.helper` | `listSettingsActions`, stores           |
| `uuid`                          | Генерация UUID для окон                 |

---

## Конвенции

### Именование файлов

-   Компоненты: `PascalCase.tsx` (или `.js` для иконок)
-   Типы: `types.ts` рядом с компонентом
-   Утилиты: `*.utils.ts`
-   Barrel exports: `index.ts`

### Именование компонентов

-   React components: `PascalCase`
-   Функции: `camelCase`
-   Константы: `UPPER_SNAKE_CASE`

### State management

-   Все мутации → через Actions (`groupingSettingsActions`, `selectionSettingsActions`)
-   Никакого `setState` для общих данных — только локальное состояние компонента
-   Подписка на изменения: `emitListSettingsRevision(callback)` → `forceUpdate()`

### Drag & Drop

-   Использовать MIME-based payloads (не нативный HTML drag)
-   Тип MIME: `application/x-mdm-{type}`
-   Fallback: `text/plain` с JSON

---

## Quick Reference

### Где что лежит

| Что нужно | Где искать |
|-----------|-----------|
| Кнопка "Группировки" | `Group/index.tsx` |
| Модальное окно | `Group/ListSettingsModal/ListSettingsModal.tsx` |
| Вкладки | `Group/ListSettingsModal/tabs/` |
| SortTab (Сортировка) | `Group/ListSettingsModal/tabs/SortTab.tsx` |
| ColumnGroupingTab (Группировка столбцов) | `Group/ListSettingsModal/tabs/ColumnGroupingTab.tsx` |
| ConditionalFormattingTab | `Group/ListSettingsModal/tabs/ConditionalFormattingTab.tsx` |
| Дерево полей (левая панель) | `Group/ListSettingsModal/panels/` |
| Список + Тулбар (правая панель) | `Group/ListSettingsModal/lists/` |
| Строки условий | `Group/ListSettingsModal/rows/` |
| Иконки | `Group/Icon/` |
| Drag & Drop | `Group/ListSettingsModal/dnd/` |
| Глобальные типы полей | `Group/ListSettingsModal/shared/types.ts` |
| CSS | `Group/ListSettingsModal/ListSettingsModal.css` |
| Загрузка полей с бэкенда | `Group/index.tsx` → `loadFields()` |
| Store actions | `helpers/grouping.helper` → `listSettingsActions` |
