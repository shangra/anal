# 04 — CODESMITHING RULES

> Жёсткие правила для LLM. Нарушение любого из них сломает систему.

---

## RULE 1: Plugin Contract

### DO
```ts
// ✅ Обязательные поля
class PluginFoo extends Plugin<'PluginFoo', FooState, FooOptions> {
  readonly key = 'PluginFoo' as const;        // точно совпадает с K
  readonly initialState: FooState = { ... };  // валидный объект
  readonly dependencies = [PLUGIN_BAR_KEY];   // если читаем state PluginBar

  reducer(state: FooState, tr: Transaction): FooState {
    // только switch/if по tr.action.type
    // возвращаем state если ничего не изменилось
    return state; // ← NO RENDER TRIGGERED
  }
}
```

### DON'T
```ts
// ❌ Не возвращать new object если state не изменился
reducer(state, tr) {
  return { ...state }; // ← вызовет лишний _styleCache.clear() + ре-рендер
}

// ❌ Не мутировать входящий state
reducer(state, tr) {
  state.items.push(x); // ← нарушение иммутабельности
  return state;
}

// ❌ Не вызывать dispatch/side-effects внутри reducer
reducer(state, tr) {
  this.context.dispatch({ type: 'FOO' }); // ← зависание или ping-pong
  fetch('/api').then(...);                // ← гонка состояний
  return state;
}
```

---

## RULE 2: Immutability

### Объекты
```ts
// ✅
return { ...state, field: newValue };
return { ...state, nested: { ...state.nested, x: 1 } };

// ❌
state.field = newValue;
return state;
```

### Map / Set
```ts
// ✅ — создаём новый Map
const next = new Map(state.myMap);
next.set(key, value);
return { ...state, myMap: next };

// ❌ — мутируем существующий
state.myMap.set(key, value);
return state;
```

### Массивы
```ts
// ✅
return { ...state, items: [...state.items, newItem] };
return { ...state, items: state.items.filter(x => x.id !== id) };

// ❌
state.items.push(newItem);
return state;
```

---

## RULE 3: appendTransaction — pure, no side-effects

```ts
// ✅ Правильно — возвращаем action
appendTransaction(tr, prev, next) {
  if (prev.selection === next.selection) return null;
  return { type: 'RANGES_STYLES_SET', payload: this._computeStyles(next.selection) };
}

// ✅ Правильно — возвращаем TransactionBuilder
appendTransaction(tr, prev, next) {
  if (tr.action?.type !== 'CELLS_SET') return null;
  return this.context.transaction()
    .withAction({ type: 'FORMULA_RECALC' })
    .skipHistory();
  // НЕ вызываем .commit() — builder вернётся и Adapter сам его применит
}

// ❌ Нельзя — setTimeout, fetch, мутации
appendTransaction(tr, prev, next) {
  setTimeout(() => this.context.dispatch(...), 100); // ← нарушение
  return null;
}

// ❌ Нельзя — dispatch внутри appendTransaction
appendTransaction(tr, prev, next) {
  this.context.dispatch({ type: 'FOO' }); // ← вызовет новую транзакцию
  return null;                             //   но она уже вне текущего pipeline!
}
```

---

## RULE 4: afterTransaction — ЕДИНСТВЕННОЕ место для side-effects

```ts
// ✅ Правильно
afterTransaction(tr, prev, next) {
  if (tr.action?.type !== 'CELL_EDIT_START') return;
  requestAnimationFrame(() => this._inputRef.current?.focus());
}

// ✅ Допустимо — dispatch через rAF (после завершения текущего _drain)
afterTransaction(tr, prev, next) {
  if (!this._isFormatPainterActive) return;
  if (tr.action?.type !== 'CELL_MOUSE_UP') return;
  requestAnimationFrame(() => {
    const ranges = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY)?.ranges ?? [];
    this._applyFormatPainter(ranges); // внутри вызывает context.transaction().commit()
  });
}

// ❌ Нельзя — прямой dispatch в afterTransaction (добавится в уже активный _drain)
afterTransaction(tr, prev, next) {
  this.context.dispatch({ type: 'FOO' }); // может вызвать ping-pong
}
```

---

## RULE 5: Cross-plugin state reads

```ts
// ✅ Через PluginContext
const cursorState = this.context.getPluginState(PLUGIN_CURSOR_CELL_KEY);
const ranges = cursorState?.ranges ?? [];

// ✅ Через getPlugin для вызова публичных методов
const history = this.context.getPlugin(PLUGIN_HISTORY_KEY) as PluginHistory;
history?.undo();

// ❌ Прямой импорт и доступ к приватным полям
import { PluginCursorCell } from '../PluginCursorCell';
const plugin = this.context.getPlugin('PluginCursorCell') as PluginCursorCell;
plugin._draggingRange; // ← приватное поле, нарушение инкапсуляции
```

---

## RULE 6: Dispatch discipline

```ts
// ✅ UI-жесты — всегда skipHistory: true
this.context.dispatch({ type: 'CELL_MOUSE_DOWN', payload: { cell } }, { skipHistory: true });

// ✅ Семантические мутации данных — через transaction builder
this.context.transaction()
  .withAction({ type: 'MY_PLUGIN/DATA_CHANGE' })
  .setCells(data)
  .setRangeStyle(range, style)
  .commit();             // ← без второго аргумента = попадёт в историю

// ✅ Только сигнальный action без данных — через dispatch напрямую
this.context.dispatch({ type: 'MY_PLUGIN/RECALC_DONE' });

// ❌ Никогда не диспатчить из render()
render() {
  this.context.dispatch(...); // ← вызовет бесконечный ре-рендер
  return <div />;
}
```

---

## RULE 7: onHistoryRestore — обязательно при мутабельном side-state

```ts
class PluginWithMutableState extends Plugin<...> {
  private _cache: Map<string, number> = new Map();

  reducer(state, tr) {
    // ... обновляем иммутабельный state
  }

  // ✅ ОБЯЗАТЕЛЬНО: сбросить/пересчитать мутабельный кэш при undo/redo
  override onHistoryRestore(restoredState: MyState): void {
    this._cache.clear();
    this._rebuildCache(restoredState);
  }
}
```

---

## RULE 8: Canvas Performance Constraints

### DON'T в цикле отрисовки (render hooks, per-frame)

```ts
// ❌ Нельзя — аллокация объектов в hot-path
function renderCell(ctx, row, col) {
  const style = { ...getCellStyle(row, col) }; // new object every frame
  const text = String(getValue(row, col));      // String() allocation
}

// ❌ Нельзя — вызов getCellStyle без кэша (идёт через все плагины)
// Используй Adapter._styleCache — он инвалидируется только при dispatch

// ❌ Нельзя — layout-thrashing
canvas.width = canvas.offsetWidth; // вызывает layout, дорого

// ❌ Нельзя — синхронные запросы к measurementAPI без кэша
ctx.measureText(text); // напрямую — медленно
// ✅ Используй CanvasMeasurementAPI.measureText() — он кэширует результат

// ❌ Нельзя — dispatch внутри render hook
dispatch({ type: 'FOO' }); // вызовет новый ре-рендер, зацикливание

// ❌ Нельзя — React state mutation внутри render hook
setState({ ... }); // то же самое
```

### DO
```ts
// ✅ Читать из measurementAPI (кэш)
const api = context.getMeasurementAPI();
const { width } = api.measureText(text, font);

// ✅ Переиспользовать ObjectPool для часто создаваемых объектов
// (см. CanvasTable/utils/ObjectPool.ts)

// ✅ Clip перед отрисовкой для избежания out-of-bounds рендера
ctx.save();
ctx.rect(x, y, w, h);
ctx.clip();
// ... рисуем
ctx.restore();
```

---

## RULE 9: Adding a new Action Type

**Всегда** регистрируй через declaration merging, не через расширение базового файла:

```ts
// ✅ В types.ts своего плагина:
declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
  interface SpreadsheetActionMap {
    'MY_PLUGIN/DO_THING': { cellId: string; value: number };
    'MY_PLUGIN/RESET': undefined;
  }
}
```

Это даёт TypeScript-проверку в `dispatch()` и `reducer()` **без изменения** `SpreadsheetAction.ts`.

---

## RULE 10: Ping-Pong Prevention

Система защищена: 3+ повтора паттерна `A→B→A→B` в окне из 8 транзакций = аварийный сброс очереди.

```ts
// ❌ Опасный паттерн:
// Plugin A: appendTransaction при action X → диспатчит Y
// Plugin B: appendTransaction при action Y → диспатчит X
// Результат: X→Y→X→Y→X→Y... → ping-pong detected, queue cleared

// ✅ Решение 1: добавить условие на prevState === nextState
appendTransaction(tr, prev, next) {
  if (prev.computed === next.computed) return null; // уже актуально
  return { type: 'Y', payload: next.computed };
}

// ✅ Решение 2: использовать skipHistory + флаг в state
appendTransaction(tr, prev, next) {
  if (tr.action?.type === 'Y') return null; // не реагировать на собственные дочерние
  return { type: 'Y', payload: ... };
}
```

---

## RULE 11: History Discipline (Excel-like undo)

> Транзакция попадает в историю (`_past`) **только если несёт реальную мутацию**.

### Критерии «историчности» транзакции

Транзакция **должна** быть в undo, если она несёт хотя бы одно из:
- `dataChanges` (через `TransactionBuilder.setCells / deleteCell / clearAll`)
- `stylesSnapshot` (через `setRangeStyle / clearRangeStyles`)
- `pluginConfigSnapshot` (через `setPluginConfigRange`)
- `metadataSnapshot` (через `resizeRows / resizeColumns / setRowOverride` и др.)

Транзакция **не должна** попадать в undo:
- `apply=false` (Escape, кнопка «Отмена», отмена редактирования)
- Данные не изменились (`value === existingValue`) или ячейка `readonly`
- Сигнальные/UI события: копирование, каретка, начало/конец drag, марширующие муравьи

### DO: явный skipHistory для сигнальных коммитов

```ts
// ✅ apply=false — нет мутации → skipHistory
tx.commit(!hasDataChange);

// ✅ Копирование — только сигнал (marching ants), данных не меняет
this.context.transaction()
  .withAction({ type: 'ON_COPY', payload: { range } })
  .commit(true); // skipHistory

// ✅ UI-жест (drag, click, hover)
this.context.dispatch({ type: 'CELL_MOUSE_DOWN', ... }, { skipHistory: true });
```

### DON'T

```ts
// ❌ Нельзя — CELL_EDIT_END при apply=false попадёт в undo как пустой шаг
tx.commit(); // без проверки hasDataChange

// ❌ Нельзя — ON_COPY в историю: Ctrl+Z вернёт «копирование», это не Excel-поведение
this.context.transaction().withAction({ type: 'ON_COPY', ... }).commit();
```

### Паттерн «разрыв транзакции» (для appendTransaction → skipHistory-родителя)

Если из `appendTransaction` skipHistory-родителя нужно записать данные в undo
(пример: drag во время редактирования ячейки), **нельзя** включать `.setCells()` в
возвращаемый builder — он унаследует `skipHistory`. Вместо этого:

1. `appendTransaction` возвращает **только сигнальный** action (без `.setCells()`).
2. `afterTransaction` детектирует этот сигнал и стартует **отдельную** транзакцию:
   `this.context.transaction().setCells(...).commit()` — она идёт в `_txQueue` как
   независимая (без родительского `skipHistory`) и попадает в `_past`.

```ts
// appendTransaction — только сигнал (наследует skipHistory от родителя — ок)
private _handleDragDuringEdit(prevState) {
  return { type: CELL_EDIT_ACTION.END, payload: { ..., apply: hasDataChange, source: 'range_drag' } };
}

// afterTransaction — отдельная независимая транзакция → попадёт в _past
override afterTransaction(tr) {
  if (tr.action?.type === CELL_EDIT_ACTION.END && tr.action.payload.source === 'range_drag' && tr.action.payload.apply) {
    // стартуем независимую транзакцию без skipHistory
    this.context.transaction().setCells(cellMap).commit();
  }
}
```

**Реальный пример:** `PluginCellEdit._handleDragDuringEdit` + `afterTransaction`.
