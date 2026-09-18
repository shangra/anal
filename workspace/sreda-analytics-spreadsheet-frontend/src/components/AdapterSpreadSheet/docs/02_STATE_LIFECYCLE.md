# 02 — STATE LIFE CYCLE & FLOW

> Пошаговый маршрут от события пользователя до пикселей на Canvas.

---

## Full Pipeline Diagram

```
User Event (click / keydown / etc.)
        │
        ▼
AdapterSpreadSheet.onMouseDown / onKeyDown / ...
        │  dispatch({ type, payload }, { skipHistory })
        │  — или —
        │  this._adapter.transaction().setCells(...).commit()
        ▼
Adapter.dispatch(action, options)
        │  createTransaction(action)
        │  txMeta.setSkipHistory(tr)  ← если options.skipHistory = true
        ▼
Adapter._enqueue(tr)
        │  push to _txQueue
        │  если !_processing → _drain()
        ▼
Adapter._drain()  ← синхронный while-loop
        │
        ├── [GUARD] processedCount >= MAX_QUEUE_SIZE (100) → сброс очереди + break
        ├── [GUARD] _detectPingPong(actionType)            → сброс очереди + break
        │
        ▼  для каждой транзакции из _txQueue:
Adapter._applyTransactionSync(tr)
        │
        ├── СТАДИЯ 1: Two-Phase Veto Filter
        │   ├── for each plugin: plugin.collectVeto(tr, state[plugin.key])
        │   │     возвращает string (причина) или null
        │   │     если хоть один вернул string → vetoes.size > 0
        │   ├── for each plugin: plugin.resolveVetoes(ctx, state[plugin.key])
        │   │     может удалить чужие вето из ctx.vetoes
        │   └── если vetoes.size > 0 → rollback snapshots → SKIP транзакцию
        │
        ├── СТАДИЯ 1.5: Flush Pending Writes
        │   └── tr.getPendingWrites() → SparseMatrixHelper.setCell / deleteCell
        │         (мутирует dataMatrix ПЕРЕД reducers)
        │
        ├── СТАДИЯ 2: Reducers
        │   ├── for each plugin (топосортированный порядок):
        │   │     next = plugin.reducer(state[plugin.key], tr)
        │   │     если next !== prev → nextState[plugin.key] = next
        │   └── для extraActions (tr.getExtraActions()):
        │         повторяем veto + reducers для каждого extraAction
        │
        ├── [DEV ONLY] Warn if action не обработан ни одним reducer
        │
        ├── _styleCache.clear()   ← инвалидация кэша стилей
        │
        ├── HOOK: afterTransaction
        │   └── for each plugin: plugin.afterTransaction(tr, prev, next)
        │         ошибки изолированы (не прерывают pipeline)
        │
        └── СТАДИЯ 3: appendTransaction
            └── for each plugin:
                  result = plugin.appendTransaction(tr, prevState, nextState)
                  result → SpreadsheetAction | TransactionBuilder | array | null
                  каждый результат → _txQueue.push(appendedTr)
                  skipHistory пробрасывается если tr имел skipHistory

        ▼ (после while-loop)
Adapter._notifyListeners()   ← _version++, вызываются все подписчики
        │
        ▼
AdapterSpreadSheet._requestRender()
        │  super.setState({ lastUpdate: Math.random() })
        ▼
React re-render → CanvasTable получает новый lastupdate prop
        │
        ▼
CanvasTable (React.memo, кастомный компаратор)
        │  lastupdate изменился → компонент ре-рендерится
        ▼
CanvasSpreadSheetProvider → новый context value (volatileContext)
        │
        ▼
useBackgroundRendering / useContentRendering /
useSelectionRendering / useHeadersRendering /
useOverlayRendering
        │  Каждый hook рисует свой <canvas> слой через 2D Context API
        ▼
Пиксели на экране
```

---

## Synchronous vs Asynchronous

| Этап | Sync/Async | Примечание |
|------|-----------|-----------|
| `dispatch()` → `_drain()` | **Sync** | Весь pipeline — синхронный while-loop |
| `reducer()` | **Sync** | Чистая функция, без промисов |
| `appendTransaction()` | **Sync** | Чистая функция, ставит в `_txQueue` |
| `afterTransaction()` | **Sync** (тело), но может запустить async | `requestAnimationFrame`, `setTimeout` — допустимы внутри |
| `_notifyListeners()` | **Sync** | Версия инкрементируется, подписчики вызываются |
| `React.setState()` | **Async** (батчинг React) | Ре-рендер откладывается до следующего microtask |
| Canvas render hooks | **Sync** | После React render — синхронная отрисовка в useEffect/useLayoutEffect |

---

## Transaction Grouping & PluginHistory

`PluginHistory` записывает транзакции в стек `_past`. Группировка:

- Все `appendTransaction`-дочерние транзакции получают тот же `groupId` (`tr.id`), что и родительская.
- При undo — вся группа откатывается атомарно.
- Транзакции с `skipHistory: true` **не записываются** в `_past`.

```
dispatch({ type: 'CELLS_SET', ... })   ← основная транзакция (groupId = 'tx-123')
  └── appendTransaction → RANGES_STYLES_SET  ← дочерняя (groupId = 'tx-123')
  └── appendTransaction → CURSOR_SET         ← дочерняя (groupId = 'tx-123')

undo() откатит все три атомарно.
```

---

## Data Flow: Read Path (Canvas render)

Canvas-слои читают данные **не через React state**, а напрямую:

```
useContentRendering (hook)
        │
        ├── getCellDisplayValue(row, col)
        │     → Adapter.getCellDisplay({ row, col }, dataMatrix[row][col].data)
        │     → plugin.getCellDisplay(state, cell, raw)  ← по displayPriority
        │
        ├── getCellStyle(row, col)
        │     → Adapter.getCellStyle({ row, col })       ← с кэшем _styleCache
        │     → plugin.getCellStyle(state, cell)         ← мерж всех плагинов
        │
        └── columnsMetadata / rowsMetadata
              → MetadataManager.getRowsView() / getColumnsView()
                (массивы, пересчитываемые только при изменении overrides)
```

**Вывод для LLM:** если ячейка не отрисовывается правильно — причина либо в `getCellDisplay`/`getCellStyle` одного из плагинов, либо в `dataMatrix` (данные), либо в `MetadataManager` (размеры). Canvas не кэширует данные между фреймами — каждый фрейм читает актуальное состояние.

---

## `HISTORY_RESTORED` — broadcast после undo/redo

После `PluginHistory.undo()` / `redo()` диспатчится:

```ts
this.context.dispatch({ type: 'HISTORY_RESTORED' }, { skipHistory: true });
```

Плагины с derived/mutable state (формулы, индексы) должны прослушивать этот тип в `reducer` и пересчитать state. Плагины с мутабельным side-state вне reducer **обязаны** реализовать `onHistoryRestore(restoredState)`.
