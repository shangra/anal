# SRDMDLTKLN-578 — Множественный выбор узлов дерева метаданных

## Задача

Дать пользователю возможность выделять в дереве метаданных сразу несколько узлов
одновременно, чтобы действия `Delete` и `Update` могли выполняться пакетно.
Переключатель «множ. выбор» в виде `Switch` в шапке дерева должен быть убран —
множественный выбор включается/отключается автоматически по удержанию клавиши
`Ctrl`/`⌘`. Взамен в шапке отображается иконка `InfoIcon` с подсказкой через
`Tooltip` из ui-kit.

## Итоговое поведение

### Выбор узлов

| Действие | Без `Ctrl`/`⌘` | С `Ctrl`/`⌘` |
|---|---|---|
| Клик по невыделенному узлу | Заменить выбор одним этим узлом | Добавить узел к выделению |
| Клик по выделенному узлу | Снять выделение этого узла | Убрать узел из выделения |
| Клик по пустому месту в области дерева (но не по `Input` и не по строке узла) | Очистить выделение целиком | Ничего не делать |

`multiSelectMode` живёт в `ScopeState` и автоматически переключается через
глобальные слушатели `keydown`/`keyup`/`blur` на `window` в `MetadataHier`:

- `Ctrl`/`⌘` зажат → `setMultiSelectMode(server, true)` (без сброса уже выделенных узлов).
- `Ctrl`/`⌘` отпущен или окно потеряло фокус → `setMultiSelectMode(server, false)`.

### Действия в панели (`MetadataHierActions`)

Каждое действие получает массив `nodes: TreeDataControlled[]` и само решает,
что делать при `nodes.length > 1`:

| Действие | Поведение при `nodes.length > 1` |
|---|---|
| `ADD`, `EDIT`, `EDIT_ACCESS`, `SORT`, `OPEN_FILE_MANAGER` | Скрываются (`return null`) |
| `DELETE` | Показывается, если хотя бы один узел имеет право `crud.includes('d')`. Удаляются только узлы с этим правом. После успеха выделение сбрасывается (`clearSelectedIds`) |
| `UPDATE` | Показывается, если хотя бы один узел имеет `loadStrategy === 'lazy'` и развёрнут, либо среди выделенных есть корень. Узлы со стратегией `'eager'` игнорируются. После успеха выделение сбрасывается |

Контекстное меню (`getContextMenuActions`) всегда работает по одному узлу —
массив `nodes` всегда длиной 1.

### Шапка панели действий

Вместо `Switch` с лейблом «Мультивыбор» — `IconButton` с иконкой `InfoIcon`
(вариант `text`), обёрнутый в `Tooltip` из ui-kit:

> «Для выделения нескольких узлов дерева метаданных нажмите их, зажав клавишу
> Ctrl/⌘, а для снятия выделения нажмите на узел или свободное место без
> зажатой клавиши».

`Tooltip` наведён по умолчанию (`placement="left"`, `allowedPlacements` —
`['left', 'right', 'top', 'bottom']`). Это **не** кнопка действия —
обработчик клика не назначен.

## Изменения в коде

### `src/components/MetadataHier/lib/service.ts`

- `patch` экспортирован для использования из компонента.
- Добавлена утилита `setMultiSelectMode(server, value)` — отличается от
  `toggleMultiSelectMode` тем, что **не** очищает уже выделенные узлы при
  изменении значения (это нужно, чтобы зажатие `Ctrl` само по себе не сбрасывало
  выделение).
- `toggleMultiSelectMode` сохранён без изменений для обратной совместимости, но
  в UI больше не вызывается.

### `src/components/MetadataHier/index.tsx`

- Импорты: `Switch` убран, добавлены `IconButton`, `InfoIcon`, `Tooltip`;
  добавлены `clearSelectedIds`, `setMultiSelectMode` (вместо `toggleMultiSelectMode`).
- В классе добавлены:
  - поле `isModifierPressed: boolean`;
  - обработчики `onKeyDown` / `onKeyUp` / `onWindowBlur` — обновляют `multiSelectMode`
    через `setMultiSelectMode` без сброса выделения;
  - метод `onTreeAreaClick` — если не зажат модификатор и `selectedIds` не пуст,
    вызывает `clearSelectedIds`.
- В `componentDidMount` / `componentWillUnmount` навешиваются/снимаются слушатели
  `window.addEventListener('keydown'|'keyup'|'blur', …)`.
- `renderActions` перерисован: на месте `Switch` стоит `Tooltip` + `IconButton(InfoIcon)`.
- В `<TreeCMP>` добавлен проп `onAreaClick={this.onTreeAreaClick}`.

### `src/components/TreeCMP/index.tsx`

- Добавлен опциональный проп `onAreaClick?: (e: MouseEvent<HTMLDivElement>) => void`.
- В `render` корневой `<div>` (тот же, где `actions` + `Input` + `TreeControlled`)
  получил `onClick={onAreaClick ? this.onTreeAreaClick : undefined}`.
- Внутри `onTreeAreaClick` — двойная фильтрация:
  1. `target.closest('.tree-cmp')` — отсекает клики по `Input`, кнопкам и
     другим элементам вне дерева.
  2. `target.closest('.tree-item-container')` — отсекает клики по строке узла
     (там уже работает `onNodeClick`).

**Важный нюанс:** `TreeControlled` из ui-kit внутри использует `react-virtuoso`.
Если обернуть его в дополнительный `<div>`, виртуализированный список теряет
корректные размеры `ViewportComponent` и не рендерит ни одной строки. Поэтому
`onClick` вешается на уже существующий корневой `<div>` `TreeCMP` — DOM‑структура
вокруг `TreeControlled` остаётся неизменной.

### `src/components/MetadataHier/__test__/lib/service.test.ts`

- Добавлен `describe('setMultiSelectMode')` (3 теста):
  - включение режима не очищает текущий выбор;
  - выключение режима не очищает текущий выбор;
  - установка того же значения — no-op.

Существующие тесты `handleNodeClick` и `toggleMultiSelectMode` остались без
изменений: старая логика выбора по флагу `multiSelectMode` сохранена.

## Изменённые файлы

| Файл | Изменение |
|---|---|
| `src/components/MetadataHier/lib/service.ts` | экспорт `patch`, новая утилита `setMultiSelectMode` |
| `src/components/MetadataHier/index.tsx` | `Switch` → `Tooltip` + `IconButton(InfoIcon)`; window‑слушатели keydown/keyup/blur → `setMultiSelectMode`; проброс `onAreaClick` в `TreeCMP`; `onTreeAreaClick` чистит выделение без модификатора |
| `src/components/TreeCMP/index.tsx` | проп `onAreaClick?`, `onClick` на корневом `<div>` с фильтрацией по `.tree-cmp`/`.tree-item-container` |
| `src/components/MetadataHier/__test__/lib/service.test.ts` | `describe('setMultiSelectMode')` (3 теста) |
| `src/components/MetadataHier/README.md` | обновлены `ScopeState.multiSelectMode`, раздел «Как переключается множественный выбор», правила публикации глобального выбора |
| `src/components/TreeCMP/README.md` | обновлены `IProps` (`onAreaClick?`) и пример `renderActions` (Switch → Tooltip + IconButton) |

## Тесты

`npx craco test --watchAll=false --testPathPattern='src/components/MetadataHier/__test__'`
→ **176 passed, 0 failed** (было 173, +3 новых за `setMultiSelectMode`).

`tsc --noEmit` по `MetadataHier`/`TreeCMP` — без ошибок.
ESLint по затронутым файлам — чисто.

## Открытые вопросы / follow-up

- **Совместимость `TreeControlled`**: любая попытка обернуть `TreeControlled`
  в дополнительный `<div>` ломает рендер. Это нужно документировать для
  будущих правок или поднять апстримом в ui-kit (заменить внутренний Virtuoso
  на компонент, нечувствительный к обёрткам).
- **`onTreeAreaClick` и `target.closest('.tree-cmp')`** зависит от того, что
  `TreeControlled` действительно проставляет `className` проп на свой
  корневой `<ul>`. Это сейчас работает (ui-kit мерджит `className` пропа в
  `ic.container`), но при апдейте ui-kit может сломаться — желательно
  покрыть тестом.
- **DRY**: `setMultiSelectMode` и `toggleMultiSelectMode` имеют очень
  похожую логику, но разную семантику очистки. Можно унифицировать через
  единый `setMultiSelectMode` + явное решение об очистке на стороне вызова.
- **`KeyboardEvent` тип**: `onKeyDown`/`onKeyUp` в `MetadataHier` объявлены
  как `(e: KeyboardEvent) => void` (глобальный тип), не React‑овский. Это
  работает, но лучше вынести тип и добавить комментарий.
