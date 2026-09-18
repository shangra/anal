# 03 — REPOSITORY MAP

> Карта директорий для LLM: где что искать и когда туда лезть.

---

## Top-Level Layout

```
src/components/
├── AdapterSpreadSheet/          ← ЯДРО: оркестратор + plugin engine
├── SpreadSheetPlugins/          ← ФИЧИ: изолированные Plugin Slices
├── SpreadSheetTables/           ← РЕНДЕР: CanvasTable + слои
├── TableAdapters/               ← АДАПТЕРЫ: мост между типами
└── (прочие компоненты UI)
```

---

## `AdapterSpreadSheet/` — Ядро

| Путь | Назначение |
|------|-----------|
| `index.tsx` | Публичный класс `AdapterSpreadSheet extends AbstractAdapter`. Точка входа. Все DOM-события → `dispatch()`. Рендерит `TableAdapter` + Portal'ы плагинов. |
| `types.ts` | Публичные типы: `AdapterSpreadSheetProps`, `PluginEntriesMap`, `ICell`, `ICellStyles`, `ICellPluginsConfig`, `PluginRegistry` (declaration merging target). |
| `constants.ts` | Константы модуля (`DEFAULT_SPREAD_SHEET_ID` и др.). |
| `plugin/Plugin.ts` | Абстрактный класс `Plugin<K,S,O>`. **Базовый класс для всех плагинов.** Содержит `PluginContext` interface. |
| `plugin/Adapter.ts` | Класс `Adapter`. Transaction queue, veto, reducers, appendTransaction. **Не трогать напрямую — только через `AdapterSpreadSheet.dispatch()` или `context.transaction()`.** |
| `plugin/SpreadsheetAction.ts` | `SpreadsheetActionMap` — declaration merging target для добавления новых action-типов. Все существующие action'ы. |
| `plugin/transaction/Transaction.ts` | Класс `Transaction` — носитель данных транзакции. |
| `plugin/transaction/TransactionBuilder.ts` | Fluent builder: `.setCells().setRangeStyle().resizeRows().commit()`. |
| `plugin/transaction/TransactionFilter.ts` | `VetoContext`, `VetoEntry` — типы для veto-системы. |
| `plugin/index.ts` | Реэкспорт всего публичного API плагинов. |
| `models/` | Модели предметной области: `Cell`, `Range`, `JoinedCell`. |
| `utils/` | Утилиты: `SparseMatrixHelper`, `StyleManager`, `MetadataManager`, `PluginConfigManager`, `Debouncer`, `MetadataManager`. |
| `measurement/` | `IMeasurementAPI` — интерфейс для измерения текста в Canvas. |
| `components/Portal.tsx` | React Portal для рендера plugin UI вне DOM-иерархии таблицы. |
| `docs/` | **Эта документация.** |

---

## `SpreadSheetPlugins/` — Plugin Slices

Каждый плагин — самостоятельная директория со структурой:

```
PluginXxx/
├── PluginXxx.tsx      ← основной класс плагина (extends Plugin<...>)
├── constants.ts       ← PLUGIN_XXX_KEY + прочие константы
├── types.ts           ← PluginXxxState, PluginXxxOptions
├── index.ts           ← реэкспорт (обычно только PluginXxx + PLUGIN_XXX_KEY)
└── README.md          ← (если есть) документация плагина
```

### Реестр плагинов

| Плагин | Key-константа | Назначение | dependencies | render? | Мутабельный side-state |
|--------|--------------|-----------|--------------|---------|----------------------|
| `PluginCursorCell` | `'PluginCursorCell'` | Курсор, выделение, drag | `PluginMetadata` | нет | `_draggingRange` |
| `PluginMetadata` | `'PluginMetadata'` | Высоты строк/колонок, autofit | — | нет | нет |
| `PluginCellStyling` | `'PluginCellStyling'` | Toolbar стилей, format painter | `PluginCursorCell` | **да** (toolbar) | `_painterSourceStyles` |
| `PluginCellFormatting` | `'PluginCellFormatting'` | Числовые форматы ячеек | `PluginCursorCell` | **да** | нет |
| `PluginCellEdit` | `'PluginCellEdit'` | Inline editing ячейки | `PluginCursorCell` | **да** (input) | `_liveValue` |
| `PluginFormulas` | `'PluginFormulas'` | Formula bar, вычисление формул | `PluginCellEdit` | **да** (formula bar) | индекс зависимостей |
| `PluginHistory` | `'PluginHistory'` | Undo/Redo | — | нет | `_past`, `_future` |
| `PluginContextMenu` | `'PluginContextMenu'` | Контекстное меню | `PluginCursorCell` | **да** (menu portal) | нет |
| `PluginFill` | `'PluginFill'` | Fill handle (протяжка) | `PluginCursorCell` | нет | нет |
| `PluginJoinedCells` | `'PluginJoinedCells'` | Объединённые ячейки | — | нет | нет |
| `PluginFrozenPanes` | `'PluginFrozenPanes'` | Закреплённые строки/колонки | — | нет | нет |
| `PluginGroups` | `'PluginGroups'` | Группировка строк/колонок | — | нет | нет |
| `PluginZoom` | `'PluginZoom'` | Масштаб | — | нет | нет |
| `PluginPersist` | `'PluginPersist'` | Сохранение/загрузка state | — | нет | нет |
| `PluginPages` | `'PluginPages'` | Листы (sheets) | — | нет | нет |
| `PluginPivot` | `'PluginPivot'` | Сводная таблица (legacy facade) | — | **да** | нет |
| `NewPluginPivot` | `'NewPluginPivot'` | Новая сводная таблица | — | **да** | нет |
| `PluginReports` | `'PluginReports'` | Отчёты (facade) | — | **да** | нет |
| `PluginChartGeneration` | `'PluginChartGeneration'` | Генерация графиков | `PluginCursorCell` | **да** | нет |
| `PluginQuickCalculation` | `'PluginQuickCalculation'` | Быстрые вычисления в статусбаре | `PluginCursorCell` | **да** | нет |
| `PluginFullscreen` | `'PluginFullscreen'` | Полноэкранный режим | — | нет | нет |
| `PluginFetchError` | `'PluginFetchError'` | Отображение ошибок загрузки | — | **да** | нет |
| `PluginProfileQuery` | `'PluginProfileQuery'` | Профилирование запросов | — | нет | нет |

---

## `SpreadSheetTables/CanvasTable/` — Canvas Render Layer

| Путь | Назначение |
|------|-----------|
| `index.tsx` | `CanvasTable` (публичный) + `CanvasTableInternal` (React.memo с кастомным компаратором). Разбивает props на `stableContext` и `volatileContext`. |
| `context/types.ts` | `CanvasTableContext` — тип контекста, доступного всем render-hook'ам. |
| `types.ts` | `ICanvasTableProps`, `ICamera`, `IBox`, `IResizer`, `IComponentInfo`, `SpreadSheetData`. |
| `hooks/useBackgroundRendering.hook.ts` | Отрисовка фона ячеек. |
| `hooks/useContentRendering.hook.ts` | Отрисовка текста и иконок ячеек. |
| `hooks/useSelectionRendering.hook.ts` | Отрисовка выделения и fill handle. |
| `hooks/useHeadersRendering.hook.ts` | Отрисовка заголовков строк и колонок. |
| `hooks/useOverlayRendering.hook.ts` | Отрисовка оверлеев (resize, groups). |
| `hooks/useLayeredRendering.hook.ts` | Координатор всех слоёв. |
| `hooks/useCamera.hook.ts` | Управление камерой (scroll/pan/zoom). |
| `measurement/CanvasMeasurementAPI.ts` | Кэш измерений текста. Доступен через `context.getMeasurementAPI()`. |
| `utils/coordinates.ts` | Перевод экранных координат → rowIndex/columnIndex. **Здесь искать баги координат клика.** |
| `utils/animationManager.ts` | Управление анимационным циклом Canvas. |
| `components/Canvas/` | Главный Canvas-компонент: обработчики событий мыши/клавиш, hit-testing. |
| `docs/OPTIMIZATION_GUIDE.md` | Правила оптимизации Canvas. |

---

## `TableAdapters/` — Adapters

| Путь | Назначение |
|------|-----------|
| `types.ts` | Интерфейсы `ISpreadSheet`, `ITableAPI`, `Theme`. `ISpreadSheet` — это props, которые `getTableAdapterProps()` плагинов могут возвращать. |
| `CanvasTableAdapter/` | Адаптер, оборачивающий `CanvasTable` в интерфейс `ITableAPI`. Передаётся как `tableAdapter` в `AdapterSpreadSheetProps`. |

---

## Conventions

| Соглашение | Правило |
|-----------|---------|
| Файл плагина | `PluginXxx.tsx` (один класс на файл, название совпадает с `key`) |
| Константа ключа | `PLUGIN_XXX_KEY = 'PluginXxx'` в `constants.ts` |
| Типы | `PluginXxxState`, `PluginXxxOptions` в `types.ts` |
| Публичный реэкспорт | `index.ts` — только `PluginXxx` + `PLUGIN_XXX_KEY` |
| Зависимость от другого плагина | Только через `this.context.getPluginState(PLUGIN_YYY_KEY)`, никогда `import { PluginYyy }` с последующим `instanceof` |
| Новый action-тип | Добавить в `SpreadsheetActionMap` через declaration merging в `types.ts` плагина |
| Новый plugin type | Добавить в `PluginRegistry` через declaration merging в `types.ts` плагина |
