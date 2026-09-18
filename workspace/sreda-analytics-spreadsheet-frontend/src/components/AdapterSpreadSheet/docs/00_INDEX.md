# 00 — INDEX & GLOSSARY

> **Target audience:** LLM agents writing or reviewing code in this repository.  
> **Language:** Headers EN, explanations RU/EN bilingual.

---

## How to consume this documentation

| Use-case | Recommended files |
|----------|------------------|
| System-prompt (full context) | `00_INDEX` + `01_BLUEPRINT` + `04_RULES` |
| RAG retrieval (on-demand) | All 7 files chunked by `##` heading |
| Writing a new plugin | `01_BLUEPRINT` + `04_RULES` + `05_RECIPES` § Recipe A–B |
| Debugging canvas / click coords | `02_LIFECYCLE` + `05_RECIPES` § Recipe E |
| Changing cell style / size | `05_RECIPES` § Recipe C–D |
| Understanding real code | `06_REAL_WORLD_PATTERNS` |

---

## Glossary

| Term | Definition |
|------|-----------|
| **AdapterSpreadSheet** | React class-компонент — единственная публичная точка входа в систему. Оркестратор: пробрасывает события DOM → `dispatch()`, владеет `dataMatrix`, передаёт пропсы в `CanvasTable`. |
| **Adapter** | Внутренний класс (`plugin/Adapter.ts`). Хранит `state: PluginStatesMap`, управляет очередью транзакций (`_txQueue`), вызывает pipeline каждого плагина. |
| **Plugin Slice** | Экземпляр абстрактного класса `Plugin<K, S, O>`. Содержит: `key` (уникальный строковый идентификатор), `initialState`, три фазы транзакционного pipeline + selectors. |
| **Transaction** | Объект-носитель одного атомарного изменения: `action`, `pendingWrites`, `dataChanges`, snapshots стилей/конфигов/метаданных, `meta.skipHistory`. |
| **TransactionBuilder** | Fluent-builder для создания сложных транзакций: `.setCells().setRangeStyle().resizeRows().commit()`. Builder становится нельзя переиспользовать после `commit()`. |
| **Veto / Two-Phase Filter** | Стадия 1 pipeline. `collectVeto(tr, state)` → плагин возвращает `string` (причина блокировки) или `null`. `resolveVetoes(ctx, state)` → другой плагин может снять вето. |
| **Pending Writes** | Мутации `dataMatrix`, накопленные в `TransactionBuilder` и применяемые к `Map` _до_ вызова reducers. |
| **reducer(state, tr)** | Стадия 2. Чистая функция: `(S, Transaction) → S`. Единственное место обновления иммутабельного plugin-state. **Без side-effects.** |
| **appendTransaction** | Стадия 3. Плагин может вернуть `SpreadsheetAction \| TransactionBuilder \| null` — они ставятся в очередь и обрабатываются после текущей транзакции. Должна быть **чистой функцией**. |
| **afterTransaction** | Hook для side-effects ПОСЛЕ применения транзакции: фокус, мутация мутабельных полей, `requestAnimationFrame`. **Не должен вызывать `dispatch` напрямую.** |
| **onHistoryRestore** | Вызывается PluginHistory после undo/redo. Обязателен для плагинов с мутабельным state вне reducer (пример: `_draggingRange` в PluginCursorCell). |
| **PluginContext** | Объект, инжектируемый в каждый плагин через `_inject()`. Предоставляет: `dispatch`, `transaction()`, `getPluginState()`, `styleManager`, `metadataManager`, `pluginConfigManager`, `getCellAt()`, `getData()`, `getMeasurementAPI()`. |
| **dataMatrix** | `Map<rowIndex, Map<colIndex, ICell>>` — мутабельное хранилище данных ячеек. Живёт в `AdapterSpreadSheet`, **вне** reducer-state. Читается Canvas-ом напрямую. |
| **StyleManager** | Мутабельный сервис стилей ячеек и ranges. Снапшотируется через `styleManager.export()` перед мутирующей транзакцией для возможности rollback. |
| **MetadataManager** | Мутабельный сервис метаданных: высоты строк, ширины колонок, кол-во строк/колонок, overrides. Снапшотируется аналогично. |
| **PluginConfigManager** | Мутабельный сервис конфигурации ячеек по плагину (`ICellPluginsConfig`). Снапшотируется аналогично. |
| **PluginRegistry** | TypeScript interface-map `{ [pluginKey]: PluginClass }`. Расширяется через declaration merging в каждом плагине — даёт типизацию `getPlugin<K>(key)`. |
| **SpreadsheetActionMap** | TypeScript interface-map `{ [actionType]: payloadType }`. Расширяется через declaration merging — даёт типизацию `dispatch({ type, payload })`. |
| **lastupdate** | Числовое поле `AdapterReactState`. При изменении вызывает `React.setState`, что провоцирует ре-рендер `CanvasTable` и перерисовку всех canvas-слоёв. |
| **displayPriority** | Числовое поле `Plugin`. Порядок вызова `getCellDisplay()` — плагин с меньшим числом вызывается первым. |
| **skipHistory** | Флаг транзакции: `{ skipHistory: true }` означает, что транзакция не пишется в стек undo/redo PluginHistory. Используется для UI-жестов. |
| **ping-pong protection** | Встроенная защита Adapter: если одна A/B/A/B пара action-типов повторяется ≥3 раз подряд в окне из 8 — очередь сбрасывается с ошибкой. |
