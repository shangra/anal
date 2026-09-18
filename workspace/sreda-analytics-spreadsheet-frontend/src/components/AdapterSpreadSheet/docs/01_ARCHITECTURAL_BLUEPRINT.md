# 01 — ARCHITECTURAL BLUEPRINT

> Mental model системы для LLM. Читать перед написанием любого кода.

---

## Layer Overview

```
┌─────────────────────────────────────────────────────┐
│               AdapterSpreadSheet                     │  React class-component
│  • Единственная публичная точка входа               │  (index.tsx)
│  • Пробрасывает DOM-события → dispatch()            │
│  • Владеет dataMatrix (мутабельная Map)             │
│  • Рендерит CanvasTable через TableAdapter          │
└───────────────┬──────────────────────────────────────┘
                │ dispatch(action) / transaction().commit()
                ▼
┌─────────────────────────────────────────────────────┐
│                    Adapter                           │  plugin/Adapter.ts
│  • state: PluginStatesMap (иммутабельный объект)    │
│  • _txQueue: Transaction[] (синхронная очередь)     │
│  • Вызывает pipeline всех плагинов последовательно  │
│  • _styleCache: invalidate on every dispatch        │
└───────┬───────┬───────┬───────┬──────────────────────┘
        │       │       │       │   ← плагины отсортированы
        ▼       ▼       ▼       ▼      топологически по dependencies[]
  Plugin_1 Plugin_2 Plugin_3 ... Plugin_N
  (Slice)  (Slice)  (Slice)     (Slice)
        │
        ▼
┌─────────────────────────────────────────────────────┐
│                  CanvasTable                         │  SpreadSheetTables/CanvasTable
│  • 5 Canvas-слоёв: background / content /           │
│    selection / headers / overlay                    │
│  • Перерисовывается при изменении lastupdate        │
│  • Читает dataMatrix, styleManager, metadata        │
│    НАПРЯМУЮ (не через React state)                  │
└─────────────────────────────────────────────────────┘
```

---

## Plugin Slice — детальная структура

Каждый плагин — изолированный «срез» состояния и поведения. Аналог ProseMirror Plugin, но с расширенным pipeline.

```
Plugin<K extends string, S extends {}, O extends {}> {
  // ── Идентификатор ────────────────────────────────────
  readonly key: K                    // уникальная строка — ключ в PluginStatesMap
  readonly initialState: S           // initial state slice (иммутабельный объект)
  readonly dependencies: string[]    // ключи плагинов-зависимостей (топосортировка)
  readonly displayPriority: number   // порядок getCellDisplay (меньше = раньше)

  // ── Транзакционный pipeline (3 стадии) ───────────────
  collectVeto(tr, state): string | null        // Стадия 1a: заявить вето
  resolveVetoes(ctx, state): void              // Стадия 1b: снять чужие вето
  reducer(state, tr): S                        // Стадия 2: обновить свой state
  appendTransaction(tr, prev, next): Action[]  // Стадия 3: породить дочерние транзакции
  afterTransaction(tr, prev, next): void       // Hook: side-effects ПОСЛЕ pipeline

  // ── Lifecycle ────────────────────────────────────────
  onMount(): void
  onUnmount(): void
  onHistoryRestore(restoredState: S): void     // Обязателен при мутабельном side-state

  // ── Selectors (читают state, возвращают данные для Canvas/UI) ──
  getCellStyle(state, cell): ICellStyles
  getCellDisplay(state, cell, raw): string | undefined
  getTableAdapterProps(state): Partial<ISpreadSheet>
  getContextMenuItems(state, ctx): TContextMenuItem[]

  // ── Render (опционально, монтируется в Portal) ───────
  render(): ReactElement | null

  // ── Protected API (только внутри плагина) ────────────
  protected context: PluginContext   // инжектируется Adapter-ом
  protected getState(): S            // читать собственный state
  protected options: O               // опции, переданные при регистрации
}
```

---

## Mutable Side-Stores (вне reducer)

Три сервиса живут вне иммутабельного `PluginStatesMap`. Они **мутируются напрямую** TransactionBuilder-ом и читаются Canvas-ом синхронно:

| Сервис | Хранит | Снапшот для rollback |
|--------|--------|---------------------|
| `dataMatrix` | Данные ячеек (`ICell`) | `tr.getDataChanges()` (before/after) |
| `StyleManager` | Стили ячеек и диапазонов | `styleManager.export()` в начале транзакции |
| `MetadataManager` | Высоты строк, ширины колонок | `metadataManager.export()` |
| `PluginConfigManager` | Per-cell конфиги плагинов | `pluginConfigManager.export()` |

**Правило:** любая мутация side-stores происходит через `TransactionBuilder`. Прямая мутация (`dataMatrix.set(...)` вне транзакции) допустима только в `PluginHistory.undo/redo` через `context.restoreDataMatrix()`.

---

## Canvas Layer Architecture

`CanvasTable` рендерит 5 независимых `<canvas>` элементов, наложенных стеком. Каждый слой управляется отдельным render-hook:

| Слой | Z-order | Содержимое | Hook |
|------|---------|-----------|------|
| `backgroundRef` | 1 (нижний) | Фон ячеек, цвета заливки | `useBackgroundRendering` |
| `contentRef` | 2 | Текст ячеек, иконки | `useContentRendering` |
| `selectionRef` | 3 | Выделение, fill handle | `useSelectionRendering` |
| `headersRef` | 4 | Заголовки строк и колонок | `useHeadersRendering` |
| `overlayRef` | 5 (верхний) | Overlays: resize, groups | `useOverlayRendering` |

**Trigger:** `CanvasTable` обёрнут в `React.memo` с кастомным компаратором. Перерисовка происходит только при изменении `lastupdate` (или `width/height/zoom/cursor/ranges`). `lastupdate = Math.random()` выставляется в `AdapterSpreadSheet._requestRender()` после каждого `dispatch`.

**MeasurementAPI:** `CanvasMeasurementAPI` — кэш измерений текста (шрифт, размер, multiline). Кэш очищается при смене темы. **Внутри render-цикла не создаются объекты** — используются только закэшированные размеры.

---

## ProseMirror Analogy

| ProseMirror | Эта система |
|------------|-------------|
| `Plugin` | `Plugin<K, S, O>` |
| `EditorState.plugins[i].spec.state` | `PluginStatesMap[plugin.key]` |
| `Transaction` | `Transaction` |
| `filterTransaction` | `collectVeto` + `resolveVetoes` |
| `appendTransaction` | `appendTransaction` |
| `EditorView` (DOM) | `CanvasTable` (Canvas) |
| `EditorView.update()` | `_requestRender()` → `lastupdate` |

**Ключевое отличие от ProseMirror:** мутабельные side-stores (`dataMatrix`, стили, метаданные) вынесены **за пределы** иммутабельного state — это сделано для производительности Canvas (прямое чтение без сериализации).
