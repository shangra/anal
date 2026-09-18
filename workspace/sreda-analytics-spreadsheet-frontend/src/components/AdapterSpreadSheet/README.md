# AdapterSpreadSheet — Navigation

Этот модуль — ядро электронной таблицы на Canvas с Reducer-Based Plugin Slices.

## Документация для LLM / разработчиков

| Файл | Содержание |
|------|-----------|
| [docs/00_INDEX.md](./docs/00_INDEX.md) | Словарь терминов, как использовать как system-prompt / RAG |
| [docs/01_ARCHITECTURAL_BLUEPRINT.md](./docs/01_ARCHITECTURAL_BLUEPRINT.md) | Mental model: слои, Plugin Slice, мутабельные side-stores |
| [docs/02_STATE_LIFECYCLE.md](./docs/02_STATE_LIFECYCLE.md) | Dispatch → Veto → Reducers → appendTransaction → Canvas render |
| [docs/03_REPOSITORY_MAP.md](./docs/03_REPOSITORY_MAP.md) | Карта директорий — где что искать |
| [docs/04_CODESMITHING_RULES.md](./docs/04_CODESMITHING_RULES.md) | DO / DON'T: иммутабельность, canvas-perf, plugin contract |
| [docs/05_RECIPES.md](./docs/05_RECIPES.md) | TypeScript boilerplate: plugin slice, action, style, resize, bugfix |
| [docs/06_REAL_WORLD_PATTERNS.md](./docs/06_REAL_WORLD_PATTERNS.md) | Канонические фрагменты из реальных плагинов |

> **Для LLM:** при работе с задачей прочитайте как минимум `00_INDEX.md`, `01_ARCHITECTURAL_BLUEPRINT.md` и `04_CODESMITHING_RULES.md`. Остальные файлы — on-demand по теме задачи.
