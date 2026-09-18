# SRDMDLTKLN-575 — Fix tree eager element reload

## Задача

При добавлении дочернего элемента в узел метаданных, загружаемый с стратегией `loadStrategy: 'eager'`, дерево перезагружало **непосредственный родительский элемент**, а не ближайший lazy-предок. Это приводило к избыточным перезагрузкам: если в дереве есть цепочка eager-узлов `lazy(root) → eager(parent) → eager(child)`, добавление в `child` вызывало полную перезагрузку `parent`, хотя достаточно было обновить только lazy-предка `root`.

Аналогичная проблема присутствовала в кнопке «Обновить» и в удалении eager-узла без lazy-предков.

## Текущее поведение (до исправления)

| Операция | Что вызывалось | Проблема |
|---|---|---|
| **Add** (actions/add) | `reloadChildrenByParentId(server, node.id)` | Всегда перезагружает детей непосредственного родителя, независимо от loadStrategy |
| **Update** (кнопка «Обновить») | `reloadChildrenByParentNodeKey(server, node.id)` | Перезагружает текущий узел напрямую, игнорируя loadStrategy |
| **Delete** | `findNearestLazyAncestor` → `reloadChildrenByParentNodeKey`, иначе `removeNodeFromState` | Fallback только локальное удаление без перезагрузки с бэкенда |

## Решение

### 1. Новая функция `handleNodeAdd`

**Файл:** `src/components/MetadataHier/lib/service.ts`

```typescript
export async function handleNodeAdd(server: string, nodeKey: string) {
    const { nodes } = readScope(server);
    const node = nodes.get(nodeKey);
    if (!node) return;

    const ancestor = findNearestLazyAncestor(server, nodeKey);
    if (ancestor) {
        await reloadChildrenByParentNodeKey(server, ancestor.nodeKey);
    } else {
        await reloadChildrenByParentId(server, nodeKey);
    }
}
```

- Ищет ближайший предок с `loadStrategy: 'lazy'` через существующую `findNearestLazyAncestor`
- Если lazy-предок найден — перезагружает его детей через `reloadChildrenByParentNodeKey` (с сохранением expanded-состояния и кэшированием)
- Если lazy-предка нет (eager-корень или глубокая eager-цепочка) — fallback на `reloadChildrenByParentId`

### 2. Новая функция `handleReloadNode`

**Файл:** `src/components/MetadataHier/lib/service.ts`

```typescript
export async function handleReloadNode(server: string, nodeKey: string) {
    const { nodes } = readScope(server);
    const node = nodes.get(nodeKey);
    if (!node) return;

    // lazy-узел — перезагружаем напрямую
    if (node.loadStrategy === 'lazy') {
        await reloadChildrenByParentNodeKey(server, nodeKey);
        return;
    }

    // eager-узел — ищем ближайший lazy-предок
    const ancestor = findNearestLazyAncestor(server, nodeKey);
    if (ancestor) {
        await reloadChildrenByParentNodeKey(server, ancestor.nodeKey);
    } else {
        await reloadChildrenByParentId(server, nodeKey);
    }
}
```

- Lazy-узлы перезагружаются напрямую (быстро, без поиска предков)
- Eager-узлы используют ту же логику, что `handleNodeAdd`

### 3. Изменение `handleNodeDelete`

**Файл:** `src/components/MetadataHier/lib/service.ts`

Было:
```typescript
if (ancestor) await reloadChildrenByParentNodeKey(server, ancestor.nodeKey);
else removeNodeFromState(server, nodeKey);
```

Стало:
```typescript
if (ancestor) {
    await reloadChildrenByParentNodeKey(server, ancestor.nodeKey);
} else {
    removeNodeFromState(server, nodeKey);
    const parentKey = nodeKey.split('/').slice(0, -1).join('/');
    if (parentKey) await reloadChildrenByParentId(server, parentKey);
}
```

- Добавлена перезагрузка детей родителя при отсутствии lazy-предка (вместо простого локального удаления)
- Гарантирует консистентность state с бэкендом

### 4. Обновление actions

**`actions/add/index.tsx`:**
```diff
- await reloadChildrenByParentId(server, node.id);
+ await handleNodeAdd(server, node.id);
```

**`actions/update/index.tsx`:**
```diff
- reloadChildrenByParentNodeKey(server, node.id);
+ handleReloadNode(server, node.id);
```

## Поведение после исправления

| Сценарий | Задействованный lazy-предок | Загружаемый узел |
|---|---|---|
| `lazy(root) → eager(parent) → add(child)` | `root` | `root.children` |
| `eager(node) без lazy-предка → add` | нет (fallback) | `node.children` |
| `lazy(root) → eager(a) → eager(b) → update(b)` | `root` | `root.children` |
| `lazy(root) → eager(parent) → delete(parent/child1)` | `root` | `root.children` |
| Кнопка «Обновить» на `eager(b)` | `root` | `root.children` |
| Кнопка «Обновить» на `lazy(root)` | сам `root` | `root.children` |

## Тесты

Добавлено 20 новых unit-тестов в `src/components/MetadataHier/__test__/lib/service.test.ts`:

### `handleNodeAdd` — 5 тестов
- lazy-предок найден → перезагрузка его детей
- eager-корень → fallback на `reloadChildrenByParentId`
- узел не найден → no-op, без вызовов сети
- lazy-предок среди родителей → находит ближайший
- lazy-корень → перезагрузка root

### `handleReloadNode` — 4 теста
- lazy-узел → перезагрузка напрямую
- eager-узел с lazy-предком → lazy-предок
- несуществующий узел → без ошибок
- глубокая eager-цепочка с lazy наверху → находит root

### Комбинированные `handleNodeAdd/Delete/Update` — 6 тестов
- eager-родитель с детьми → lazy-предок перезагружается
- обновление/удаление eager-ребёнка → lazy-предок
- перезагрузка lazy-узла → напрямую
- граница lazy/eager при update → nothing (no-op на root)

Всего тестов в suite: **172 passed** (было 152).

## Изменённые файлы

| Файл | Изменение |
|---|---|
| `src/components/MetadataHier/lib/service.ts` | +44 строки: `handleNodeAdd`, `handleReloadNode`, обновлён `handleNodeDelete` |
| `src/components/MetadataHier/actions/add/index.tsx` | `reloadChildrenByParentId` → `handleNodeAdd` |
| `src/components/MetadataHier/actions/update/index.tsx` | `reloadChildrenByParentNodeKey` → `handleReloadNode` |
| `src/components/MetadataHier/__test__/lib/service.test.ts` | +190 строк: 20 новых тестов |

## Edge cases

1. **Узел не найден в scope** — все три функции делают ранний `return` (no-op, без вызовов сети)
2. **eager-корень** — `findNearestLazyAncestor` возвращает `null`, используется `reloadChildrenByParentId`
3. **lazy-корень** — `findNearestLazyAncestor('root')` возвращает `null` (корень не является предком себе), используется `reloadChildrenByParentId`
4. **Глубокая eager-цепочка без lazy-предков** — fallback на `reloadChildrenByParentId` для каждого узла

## Известные ограничения и follow-up

- **DRY**: `handleNodeAdd` и `handleReloadNode` содержат идентичный блок из 4 строк — рекомендуется вынести в приватную `reloadByAncestorIfNeeded`
- **`handleNodeUpdate`** не имеет fallback при отсутствии lazy-предка — это pre-existing асимметрия, не закрытая данным PR (только обновлён `handleNodeDelete`)
- **Обработка ошибок** в `windowCallback` (`actions/add/index.tsx`) не обрабатывает сбои сети — можно добавить `try/catch` с `$message.show`
- **Форматирование** (Prettier) в других файлах (`AccessMatrixFiles`, `FileManagerWindow`) вынесено в отдельный коммит
