# 05 — IMPLEMENTATION RECIPES

> Готовые TypeScript-шаблоны. Копируй, подставляй имена, не изобретай велосипед.

---

## Recipe A: New Plugin Slice (полный скелет)

### 1. Файловая структура

```
src/components/SpreadSheetPlugins/PluginMyFeature/
├── PluginMyFeature.tsx
├── constants.ts
├── types.ts
└── index.ts
```

### 2. `constants.ts`

```ts
export const PLUGIN_MY_FEATURE_KEY = 'PluginMyFeature' as const;
```

### 3. `types.ts`

```ts
import { PLUGIN_MY_FEATURE_KEY } from './constants';
import { PluginMyFeature } from './PluginMyFeature';

// ── Типы state и options ──────────────────────────────────────────────
export interface PluginMyFeatureState {
  isActive: boolean;
  items: string[];
}

export interface PluginMyFeatureOptions {
  maxItems?: number;
}

// ── Расширение SpreadsheetActionMap (новые action-типы) ───────────────
declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
  interface SpreadsheetActionMap {
    'MY_FEATURE/ACTIVATE': undefined;
    'MY_FEATURE/DEACTIVATE': undefined;
    'MY_FEATURE/ADD_ITEM': { item: string };
  }
}

// ── Расширение PluginRegistry (типизация getPlugin/getPluginState) ─────
declare module '../../AdapterSpreadSheet/types' {
  interface PluginRegistry {
    [PLUGIN_MY_FEATURE_KEY]: PluginMyFeature;
  }
}
```

### 4. `PluginMyFeature.tsx`

```tsx
import React from 'react';
import { Plugin, Transaction } from '../../AdapterSpreadSheet/plugin';
import { ICellStyles, ObjectIndexes } from '../../AdapterSpreadSheet/types';
import { PLUGIN_CURSOR_CELL_KEY } from '../PluginCursorCell/constants'; // если нужна зависимость
import { PLUGIN_MY_FEATURE_KEY } from './constants';
import { PluginMyFeatureOptions, PluginMyFeatureState } from './types';

export class PluginMyFeature extends Plugin<
  typeof PLUGIN_MY_FEATURE_KEY,
  PluginMyFeatureState,
  PluginMyFeatureOptions
> {
  readonly key = PLUGIN_MY_FEATURE_KEY;

  readonly initialState: PluginMyFeatureState = {
    isActive: false,
    items: [],
  };

  // Указывай только те плагины, state которых читаешь
  override readonly dependencies = [PLUGIN_CURSOR_CELL_KEY];

  // ── Стадия 1: Veto ─────────────────────────────────────────────────
  // Убирай override если не блокируешь никакие транзакции
  override collectVeto(tr: Transaction, state: PluginMyFeatureState): string | null {
    // Пример: блокировать запись в ячейки если плагин неактивен
    if (tr.action?.type === 'CELLS_SET' && !state.isActive) {
      return 'PluginMyFeature: editing disabled';
    }
    return null;
  }

  // ── Стадия 2: Reducer ──────────────────────────────────────────────
  override reducer(state: PluginMyFeatureState, tr: Transaction): PluginMyFeatureState {
    switch (tr.action?.type) {
      case 'MY_FEATURE/ACTIVATE':
        return { ...state, isActive: true };

      case 'MY_FEATURE/DEACTIVATE':
        return { ...state, isActive: false, items: [] };

      case 'MY_FEATURE/ADD_ITEM': {
        const maxItems = this.options.maxItems ?? 100;
        if (state.items.length >= maxItems) return state; // без изменений — без ре-рендера
        return { ...state, items: [...state.items, tr.action.payload.item] };
      }

      default:
        return state; // ← ОБЯЗАТЕЛЬНО возвращать state без изменений
    }
  }

  // ── Стадия 3: appendTransaction ────────────────────────────────────
  // Вызывается ПОСЛЕ обновления state. Возвращай null если ничего не нужно.
  override appendTransaction(
    tr: Transaction,
    prevState: PluginMyFeatureState,
    nextState: PluginMyFeatureState,
  ) {
    // Пример: при активации — применить стиль к курсорной ячейке
    if (prevState.isActive === nextState.isActive) return null;
    if (!nextState.isActive) return null;

    const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY);
    if (!cursorState?.ranges?.length) return null;

    return this.context
      .transaction()
      .withAction({ type: 'MY_FEATURE/ADD_ITEM', payload: { item: 'auto' } })
      .skipHistory();
    // НЕ .commit() — Adapter применит сам
  }

  // ── afterTransaction ────────────────────────────────────────────────
  override afterTransaction(
    tr: Transaction,
    _prev: PluginMyFeatureState,
    _next: PluginMyFeatureState,
  ): void {
    // Только DOM side-effects: focus, rAF, внешние callbacks
    if (tr.action?.type !== 'MY_FEATURE/ACTIVATE') return;
    requestAnimationFrame(() => {
      // например, прокрутить к первой ячейке
    });
  }

  // ── onHistoryRestore ───────────────────────────────────────────────
  // Реализуй если у плагина есть мутабельный кэш вне reducer
  override onHistoryRestore(restoredState: PluginMyFeatureState): void {
    // this._cache.clear(); this._rebuild(restoredState);
  }

  // ── Selectors ──────────────────────────────────────────────────────
  override getCellStyle(state: PluginMyFeatureState, cell: ObjectIndexes): ICellStyles {
    if (!state.isActive) return {};
    return { backgroundColor: '#e8f4ff' };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────
  override onMount(): void { /* window listeners, timers */ }
  override onUnmount(): void { /* cleanup */ }

  // ── Render (Portal UI) ─────────────────────────────────────────────
  override render(): React.ReactElement | null {
    const state = this.getState();
    return (
      <div>
        Active: {String(state.isActive)} | Items: {state.items.length}
      </div>
    );
  }

  // ── Public API (доступен через getPlugin(KEY)) ─────────────────────
  activate(): void {
    this.context.dispatch({ type: 'MY_FEATURE/ACTIVATE' });
  }
}
```

### 5. `index.ts`

```ts
export { PluginMyFeature } from './PluginMyFeature';
export { PLUGIN_MY_FEATURE_KEY } from './constants';
```

### 6. Регистрация в `AdapterSpreadSheet`

```tsx
import { PluginMyFeature } from '../SpreadSheetPlugins/PluginMyFeature';

const plugins: PluginEntriesMap = {
  myFeature: {
    component: new PluginMyFeature(),
    options: { maxItems: 50 },
    rootId: 'my-feature-portal', // если у плагина есть render()
  },
};

<AdapterSpreadSheet plugins={plugins} tableAdapter={CanvasTableAdapter} />
```

---

## Recipe B: Cell Style Change (изменить цвет фона выделенных ячеек)

```ts
// Внутри метода плагина (например, обработчик кнопки в render()):
private _applyBackground(color: string): void {
  const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY);
  const ranges = cursorState?.ranges ?? [];
  if (!ranges.length) return;

  const tx = this.context.transaction()
    .withAction({ type: 'MY_PLUGIN/STYLE_APPLIED' }); // или CELL_STYLING_ACTION.STYLE_APPLIED

  for (const range of ranges) {
    tx.setRangeStyle(range, { backgroundColor: color }, /* merge= */ true);
  }

  tx.commit(); // записывается в историю
}
```

---

## Recipe C: Row Resize (изменить высоту строки программно)

```ts
// Через TransactionBuilder — попадёт в историю undo/redo:
this.context.transaction()
  .withAction({ type: 'MY_PLUGIN/ROW_RESIZED' })
  .resizeRows(new Map([[rowIndex, newHeight]]))
  .commit();

// Или через AdapterSpreadSheet API (из внешнего кода):
adapterRef.current?.onRowResize(new Map([[rowIndex, newHeight]]));
```

---

## Recipe D: Cross-Plugin Data Read (читать cursor из другого плагина)

```ts
// ✅ Безопасно и типизировано:
import { PLUGIN_CURSOR_CELL_KEY } from '../PluginCursorCell/constants';
import { PluginCursorCellState } from '../PluginCursorCell/types';

// В методе плагина:
const cursorState = this.context.getPluginState(
  PLUGIN_CURSOR_CELL_KEY
) as PluginCursorCellState | undefined;

const ranges = cursorState?.ranges ?? [];
const activeRange = ranges[cursorState?.activeRangeIndex ?? 0] ?? ranges[ranges.length - 1];
const cursor = activeRange?.cursor; // Cell | undefined
```

---

## Recipe E: Bug-Fix Pattern — Неправильные координаты клика Canvas

**Симптом:** клик по ячейке (row=5, col=3) интерпретируется как (row=5, col=4) после действия X.

### Вариант 1: Исправить в `collectVeto` (заблокировать транзакцию)

```ts
// В плагине, который знает о «сломанном» состоянии:
override collectVeto(tr: Transaction, state: MyState): string | null {
  if (tr.action?.type !== 'CELL_MOUSE_DOWN') return null;
  const { cell } = tr.action.payload;

  // Детектируем невалидные координаты
  if (cell.columnIndex < 0 || cell.rowIndex < 0) {
    return 'Invalid cell coordinates';
  }
  return null;
}
```

### Вариант 2: Нормализовать через `appendTransaction` (компенсирующий dispatch)

```ts
// Паттерн: перехватываем CELL_MOUSE_DOWN, эмитируем скорректированную версию
override appendTransaction(tr, prev, next) {
  if (tr.action?.type !== 'CELL_MOUSE_DOWN') return null;
  const { cell, ...rest } = tr.action.payload;

  // Пример: колонки сдвинуты из-за скрытой колонки 0
  const correctedColumn = this._resolveVisualColumn(cell.columnIndex);
  if (correctedColumn === cell.columnIndex) return null; // исправление не нужно

  return {
    type: 'CURSOR_SET',
    payload: { cell: new Cell({ rowIndex: cell.rowIndex, columnIndex: correctedColumn }) },
  };
}
```

### Вариант 3: Исправить в `AdapterSpreadSheet.onMouseDown` (системный баг ниже плагинов)

```ts
// В AdapterSpreadSheet (index.tsx) — только если баг в hit-testing Canvas,
// а не в бизнес-логике плагина:
onMouseDown = (event: any): void => {
  if (!event.cell) return;
  const cell = this._correctClickCoordinates(event.cell); // <- коррекция
  this.dispatch({
    type: 'CELL_MOUSE_DOWN',
    payload: { cell, ctrlKey: !!event.ctrlKey, metaKey: !!event.metaKey, shiftKey: !!event.shiftKey },
  }, { skipHistory: true });
};

private _correctClickCoordinates(cell: ObjectIndexes): ObjectIndexes {
  // Например: учёт offset заголовков при смене zoom
  return { ...cell, columnIndex: cell.columnIndex - this._headerOffset };
}
```

**Где искать баг координат:**
- `CanvasTable/utils/coordinates.ts` — перевод `(clientX, clientY)` → `(rowIndex, columnIndex)`
- `CanvasTable/components/Canvas/index.tsx` — `onMouseDown` handler (hit-testing)
- `MetadataManager.getRowsView()` / `getColumnsView()` — если высоты/ширины посчитаны неверно
