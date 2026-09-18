# 06 — REAL-WORLD PATTERNS

> Канонические фрагменты из реальных плагинов с аннотациями. Используй как эталон.

---

## Pattern 1: Мутабельный side-state вне reducer (PluginCursorCell)

**Источник:** `SpreadSheetPlugins/PluginCursorCell/PluginCursorCell.tsx`

**Проблема:** drag-операция — временное состояние, которое не должно попадать в историю undo/redo и меняется на каждый `mousemove`. Хранить в reducer — дорого (перерендер 60fps).

**Решение:** мутабельное приватное поле + `onMount`/`onUnmount` для window listeners.

```ts
export class PluginCursorCell extends Plugin<...> {
  // ✅ Мутабельный side-state — вне reducer, не в PluginStatesMap
  private _draggingRange: DraggingRange | null = null;
  private _globalMouseUpHandler: (() => void) | null = null;

  // ✅ onMount — регистрируем window listener (не в constructor)
  override onMount(): void {
    this._globalMouseUpHandler = this._onGlobalMouseUp.bind(this);
    window.addEventListener('mouseup', this._globalMouseUpHandler, { passive: true });
  }

  // ✅ onUnmount — всегда очищаем
  override onUnmount(): void {
    if (this._globalMouseUpHandler) {
      window.removeEventListener('mouseup', this._globalMouseUpHandler);
      this._globalMouseUpHandler = null;
    }
    this._draggingRange = null;
  }

  // ✅ Глобальный mouseup — диспатчим через context (не мутируем state напрямую)
  private _onGlobalMouseUp(): void {
    if (!this._draggingRange) return;
    this.context.dispatch({ type: 'CELL_MOUSE_UP' }, { skipHistory: true });
  }

  // ✅ reducer обрабатывает ТОЛЬКО иммутабельный state (ranges, activeRangeIndex)
  override reducer(state: PluginCursorCellState, tr: Transaction): PluginCursorCellState {
    switch (tr.action?.type) {
      case 'CURSOR_SET': {
        const { cell } = tr.action.payload;
        return { ...state, ranges: [new Range(cell, cell, cell)], activeRangeIndex: 0 };
      }
      case 'RANGES_SET':
        return { ...state, ranges: tr.action.payload, activeRangeIndex: tr.action.payload.length - 1 };
      // ... другие cases
      default:
        return state;
    }
  }

  // ✅ appendTransaction — вычисляет Range для drag, возвращает action с уже готовым range
  // Это позволяет reducer оставаться чистым (не знает о DraggingRange)
  override appendTransaction(tr, prev, next) {
    switch (tr.action?.type) {
      case 'CELL_MOUSE_DOWN': {
        const { cell, ctrlKey, metaKey } = tr.action.payload;
        const operation = ctrlKey || metaKey ? 'add' : 'set';
        const range = this._startDragging(new Cell(cell), operation);
        return { type: 'RANGE_DRAG_START', payload: { cell: new Cell(cell), operation, range } };
      }
      case 'CELL_MOUSE_UP': {
        if (!this._draggingRange) return null;
        const finalRange = this._draggingRange.getCurrentRange();
        this._draggingRange = null;
        return { type: 'RANGE_DRAG_END', payload: { range: finalRange, isSubtraction: false } };
      }
      default:
        return null;
    }
  }
}
```

**Ключевые выводы:**
1. `_draggingRange` — мутируется в `appendTransaction`, а не в `reducer`.
2. `appendTransaction` вычисляет `range` и кладёт его в payload нового action — `reducer` просто применяет готовый результат.
3. `onHistoryRestore` не нужен (drag-state нет смысла восстанавливать).

---

## Pattern 2: Плагин без reducer-state, только side-effects (PluginCellStyling)

**Источник:** `SpreadSheetPlugins/PluginCellStyling/PluginCellStyling.tsx`

**Особенность:** весь «state» плагина — в `StyleManager` (мутабельный). Reducer пустой. Логика — в приватных методах.

```ts
export class PluginCellStyling extends Plugin<...> {
  readonly initialState: PluginCellStylingState = {}; // пустой объект

  // ✅ Мутабельные поля режима «формат по образцу» — не нужны в reducer
  private _isFormatPainterActive = false;
  private _painterSourceStyles: ICellStyles | null = null;

  // ✅ reducer тривиален — state не меняется
  override reducer(state: PluginCellStylingState, _tr: Transaction): PluginCellStylingState {
    return state;
  }

  // ✅ getCellStyle читает StyleManager напрямую (не из reducer-state)
  override getCellStyle(_state: PluginCellStylingState, cell: ObjectIndexes): ICellStyles {
    return this.context.styleManager.getCellStyle(cell.rowIndex, cell.columnIndex) ?? {};
  }

  // ✅ Применение стиля — через TransactionBuilder
  private _applyStyle(updater: (existing: ICellStyles) => ICellStyles): void {
    const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY)!;
    const { ranges } = cursorState;
    if (!ranges.length) return;

    const tx = this.context.transaction().withAction({ type: CELL_STYLING_ACTION.STYLE_APPLIED });
    for (const range of ranges) {
      const existing = this.getCellStyle(this.getState(), range.topLeft.coordinates);
      tx.setRangeStyle(range, updater(existing));
    }
    tx.commit(); // попадает в историю
  }

  // ✅ getTableAdapterProps — изменяет курсор мыши через Canvas props
  override getTableAdapterProps(_state: PluginCellStylingState): Partial<ISpreadSheet> {
    if (this._isFormatPainterActive) return { cursorStyle: 'copy' };
    return {};
  }

  // ✅ afterTransaction — применение формата по образцу через rAF
  // (ждём завершения RANGE_DRAG_END после CELL_MOUSE_UP)
  override afterTransaction(tr: Transaction, ...): void {
    if (!this._isFormatPainterActive) return;
    if (tr.action?.type !== 'CELL_MOUSE_UP') return;

    requestAnimationFrame(() => {
      const ranges = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY)?.ranges ?? [];
      if (!ranges.length) return;
      this._applyFormatPainter(ranges);
    });
  }
}
```

**Ключевые выводы:**
1. Плагин с пустым reducer — нормально. `state = {}` — валидный паттерн.
2. `StyleManager` — не в reducer, но снапшотируется TransactionBuilder перед мутацией → rollback при veto и undo/redo работают корректно.
3. `afterTransaction` + `requestAnimationFrame` — стандартный паттерн для «дождаться конца drag».
4. `getTableAdapterProps` — единственный правильный способ менять `cursorStyle` или другие Canvas-пропсы из плагина.

---

## Pattern 3: Undo/Redo с группировкой транзакций (PluginHistory)

**Источник:** `SpreadSheetPlugins/PluginHistory/PluginHistory.tsx`

**Особенность:** `_past` и `_future` — мутабельные стеки вне reducer. Snapshot всего состояния (плагины + data + styles).

```ts
export class PluginHistory extends Plugin<...> {
  readonly initialState: PluginHistoryState = { hasPast: false, hasFuture: false };

  // ✅ Весь стек — мутабельный, НЕ в reducer
  private _past: HistoryEntry[] = [];
  private _future: HistoryEntry[] = [];

  // ✅ reducer обновляет только "флаги" для UI (кнопки undo/redo enabled/disabled)
  override reducer(state: PluginHistoryState, tr: Transaction): PluginHistoryState {
    // История записывается в afterTransaction, а не здесь
    // Здесь только синхронизируем флаги
    const hasPast = this._past.length > 0;
    const hasFuture = this._future.length > 0;
    if (hasPast === state.hasPast && hasFuture === state.hasFuture) return state;
    return { hasPast, hasFuture };
  }

  // ✅ afterTransaction — записываем в _past если !skipHistory и были изменения
  override afterTransaction(tr: Transaction, _prev, _next): void {
    if (txMeta.isSkipHistory(tr)) return;
    // Записываем снапшот ДО применения транзакции (prev all states)
    // + dataChanges из транзакции для восстановления данных
    const entry: HistoryEntry = {
      fullPluginState: this._prevAllStates!,
      dataChanges: tr.getDataChanges(),
      stylesSnapshot: tr.getStylesSnapshot(),
      pluginConfigSnapshot: tr.getPluginConfigSnapshot(),
      metadataSnapshot: tr.getMetadataSnapshot(),
      groupId: tr.parentId ?? tr.id, // группировка appendTransaction-дочерних
    };
    this._past.push(entry);
    if (this._past.length > this._maxSize) this._past.shift();
    this._future = []; // сброс redo после новой транзакции
  }

  // ✅ undo — атомарный откат группы транзакций
  undo(): void {
    if (!this._past.length) return;
    const entry = this._past.pop()!;
    // Восстанавливаем иммутабельный state всех плагинов
    this.context.restorePluginStates(entry.fullPluginState);
    // Восстанавливаем данные ячеек
    this._restoreEntry(entry);
    // Уведомляем плагины с мутабельным side-state
    this._notifyHistoryRestore();
    // Broadcast для derived-state плагинов (формулы, индексы)
    this.context.dispatch({ type: 'HISTORY_RESTORED' }, { skipHistory: true });
  }
}
```

**Ключевые выводы:**
1. `_past`/`_future` — мутабельные стеки, не в reducer. Восстанавливаются через `onHistoryRestore` (которого у самого PluginHistory нет — он сам оркестрирует восстановление).
2. Снапшот ВСЕГО состояния плагинов (`fullPluginState`) + данные ячеек + стили — атомарная единица откатa.
3. `HISTORY_RESTORED` — broadcast для плагинов с derived-state.
4. `groupId` обеспечивает атомарность: все `appendTransaction`-дочерние откатываются вместе с родителем.

---

## Pattern 4: Зависимость одного плагина от другого (чтение state)

**Источник:** `PluginCellStyling._applyStyle()`, `PluginCursorCell._getJoinedCells()`

```ts
// ✅ Правильно: читать через context.getPluginState
private _getJoinedCells(): JoinedCell[] {
  return this.context.getPluginState(PLUGIN_JOINED_CELLS_KEY)?.joinedCells ?? [];
}

// ✅ Правильно: в dependencies указывать только то, что читаешь
override readonly dependencies = [PLUGIN_METADATA_KEY]; // PluginCursorCell зависит от метаданных

// ✅ Правильно: читать options плагина через this.options
private get _maxSize(): number {
  return this.options.maxHistorySize ?? 100;
}
```

**Неправильно:**
```ts
// ❌ Импорт класса другого плагина для type assertion на private поля
import { PluginJoinedCells } from '../PluginJoinedCells';
const p = this.context.getPlugin(PLUGIN_JOINED_CELLS_KEY) as PluginJoinedCells;
p._internalIndex; // приватное поле
```

---

## Pattern 5: getTableAdapterProps — передача данных в CanvasTable

**Источник:** `PluginCursorCell.getTableAdapterProps()`, `PluginCellEdit.getTableAdapterProps()`

Единственный официальный способ передать данные из плагина в `CanvasTable` (cursor, ranges, editingCell, frozenRows и т.д.):

```ts
override getTableAdapterProps(state: PluginCursorCellState): Partial<ISpreadSheet> {
  return {
    cursor: this.cursor,           // { cell: Cell } | null
    ranges: state.ranges,          // Range[]
    rangesStyles: state.rangesStyles,
  };
}

// PluginCellEdit:
override getTableAdapterProps(state: PluginCellEditState): Partial<ISpreadSheet> {
  return {
    editingCell: state.editingCell ?? null,
    currentValue: state.liveValue,
  };
}
```

`Adapter.getTableAdapterProps()` мёрджит результаты всех плагинов (`Object.assign`) и передаёт в `CanvasTable` props. Если несколько плагинов возвращают одно поле — побеждает последний по порядку регистрации.

---

## Pattern 6: Facade-плагин (нет state, только API)

**Источник:** `PluginPivot/PluginPivotAdapterFacade.ts`, `PluginReports/PluginReportsAdapterFacade.ts`

Паттерн для плагинов, которые предоставляют внешнее API без собственного state:

```ts
export class PluginReportsAdapterFacade extends Plugin<'PluginReports', {}, {}> {
  readonly key = 'PluginReports' as const;
  readonly initialState = {};

  // ✅ reducer тривиален
  override reducer(state: {}, _tr: Transaction): {} {
    return state;
  }

  // ✅ Публичные методы — вся логика здесь, state хранится в реестре отчётов
  loadReport(reportId: string): void {
    this.context.transaction()
      .withAction({ type: 'REPORTS/LOAD', payload: { reportId } })
      .commit(true); // skipHistory
  }

  getReportData(): ReportData | null {
    return this._internalRegistry.get(this._activeReportId) ?? null;
  }
}
```

Внешний consumer получает доступ через:
```ts
const facade = adapterRef.current?.getPlugin(PLUGIN_REPORTS_KEY) as PluginReportsAdapterFacade;
facade?.loadReport('my-report-id');
```
