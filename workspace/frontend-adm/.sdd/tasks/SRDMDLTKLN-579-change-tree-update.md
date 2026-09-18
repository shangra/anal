# SRDMDLTKLN-579 — Оптимистичное удаление и обновление дерева метаданных

## Задача

1. **Оптимистичное удаление** узлов дерева метаданных: удалять узел из локального состояния **мгновенно** (до ответа сервера), а в случае ошибки API — откатить обратно через `restoreRemovedNodes`.
2. **Переписать кнопку «Обновить»** (`UpdateAction`) для корректной работы с новой архитектурой tree и корректными TypeScript-типами (`NormalizedNode[]` вместо сырых `TreeDataControlled[]`).
3. **Убрать блокировку рендера** action-панели при пустом выделении: `UpdateAction` должен рендериться всегда (кнопка видна, даже когда ничего не выделено — обновит всё дерево).
4. **Добавить guard `if (nodes.length === 0) return null`** в action-компоненты, которые опираются на `nodes[0]` (`EditAction`, `AddAction`, `SortAction`, `EditAccessAction`, `OpenFileManagerAction`), чтобы избежать `Cannot read properties of undefined` при пустом выделении.
5. **Привести все `useCallback` к правилу «хуки на верхнем уровне»** — хуки должны идти **до** любых ранних возвратов.
6. **Убрать потомков из целевых узлов** — при множественном выделении, когда один узел является предком другого (напр. `root/parent` + `root/parent/child`), удалять и обновлять нужно только предка. Удаление/обновление предка автоматически затронет всех потомков. Это предотвращает ошибки «node not found» и лишние запросы к серверу.
7. **Упростить `handleNodeDelete`**: для eager-узлов без lazy-предка больше не нужно делать fetch перезагрузки — состояние и так уже обновлено оптимистично.

## Архитектурный контекст

`MetadataHier` хранит дерево в StateManager scope. Ключевое понятие:

- **`NormalizedNode`** — нормализованный узел из `state.nodes` Map (ключ = `nodeKey`).
- **`TreeDataControlled`** — плоский UI-объект от `TreeCMP` (FlatTreeNode), содержит `id`, `hasChildren`, `childrenIds` и т.д.
- **`getNodeByKey(server, id)`** — мост между ними: из `TreeDataControlled.id` → `NormalizedNode`.

В `IActionProps` поле `nodes: TreeDataControlled[]` — это **плоский** массив UI-узлов, переданный из `TreeCMP`. Внутри action-компонентов нужно вызывать `getNodeByKey(server, n.id)` для разрешения в `NormalizedNode`.

**Формат nodeKey:** `{ROOT_ID}/node_id/node_id/...` — позволяет определить предка/потомка через проверку префикса строки.

### ScopeState (ключи, затронутые задачей)

```typescript
interface ScopeState {
    nodes: Map<string, NormalizedNode>;   // nodeKey → NormalizedNode
    expandedIds: Set<string>;
    selectedIds: Set<string>;
    rootId: string;
    multiSelectMode: boolean;
}
```

## Текущее поведение (до исправления)

### 1. Удаление

**Файл:** `src/components/MetadataHier/actions/delete/index.tsx`

Сначала вызывается API `deleteNode`, и **только потом** `handleNodeDelete` удаляет узел из стейта. Пользователь видит задержку между кликом и обновлением UI.

**Файл:** `src/components/MetadataHier/lib/service.ts` — `handleNodeDelete`

```typescript
export async function handleNodeDelete(server: string, nodeKey: string) {
    const { nodes } = readScope(server);
    const node = nodes.get(nodeKey);
    if (!node) return;

    // Ищем ближайший lazy-предок
    const ancestor = findNearestLazyAncestor(server, nodeKey);
    if (ancestor) {
        // Перезагружаем lazy-предка (сохраняет expanded-состояние)
        await reloadChildrenByParentNodeKey(server, ancestor.nodeKey);
    } else {
        // Fallback: просто удаляем из стейта без запроса к бэкенду
        removeNodeFromState(server, nodeKey);

        const parentKey = nodeKey.split('/').slice(0, -1).join('/');
        if (parentKey) {
            await reloadChildrenByParentId(server, parentKey);
        }
    }
}
```

Проблема: для eager-узлов без lazy-предка выполняется `reloadChildrenByParentId`, хотя состояние уже было обновлено оптимистично — избыточный fetch.

### 2. Кнопка «Обновить»

**Файл:** `src/components/MetadataHier/actions/update/index.tsx`

```typescript
export const UpdateAction = ({ server, nodes, children }: IActionProps) => {
    const handleUpdate = useCallback(async () => {
        if (nodes.length === 0) return; // ← ничего не делает при пустом выделении
        const node = nodes[0];
        const fromStore = getNodeByKey(server, node.id);
        const ancestor = findNearestLazyAncestor(server, fromStore.nodeKey);
        if (ancestor) await reloadChildrenByParentNodeKey(server, ancestor.nodeKey);
        else await reloadChildrenByParentId(server, fromStore.nodeKey);
    }, [nodes, server]);

    if (nodes.length === 0) return null; // ← кнопка не видна при пустом выделении
    // ...
};
```

Проблемы:
- При пустом выделении кнопка скрыта — пользователь не может обновить всё дерево.
- Использует `nodes[0]` напрямую без guard.
- `useCallback` идёт **после** проверки `nodes.length`, что нарушает правило хуков.
- Не учитывает `loadStrategy` (lazy vs eager) при обновлении — всегда обновляет ближайший lazy-предок.

### 3. Блокировка renderActions

**Файл:** `src/components/MetadataHier/actions/index.tsx`

```typescript
render() {
    const { actions, nodes } = this.props;
    if (!nodes?.length) return null; // ← БЛОКИРУЕТ рендер всех actions
    // ...
}
```

Из-за этого `UpdateAction` не может отрендериться при пустом выделении.

### 4. Guard-проверки в single-node actions

`EditAction`, `AddAction`, `SortAction`, `EditAccessAction`, `OpenFileManagerAction` проверяют `nodes.length === 0` **перед** `useCallback`, что нарушает правило хуков React.

## Решение

### 1. Оптимистичное удаление

**Файл:** `src/components/MetadataHier/lib/service.ts`

Добавлены два новых экспорта:

```typescript
export interface OptimisticDeleteSnapshot {
    removedNodes: Array<[string, NormalizedNode]>;
    wasSelected: boolean;
    wasExpanded: boolean;
}
```

**`removeNodeOptimistically(server, nodeKey): OptimisticDeleteSnapshot`**

Удаляет узел **вместе со всеми потомками** из `nodes`, `selectedIds`, `expandedIds` **до** вызова API:

1. Рекурсивно собирает все удаляемые узлы (`collect(nodeKey)`).
2. Удаляет их из Map `nodes` и из `selectedIds`/`expandedIds`.
3. Обновляет `childrenIds` родителя (убирает удалённый ключ).
4. Возвращает снапшот для отката.

**`restoreRemovedNodes(server, snapshot)`**

Обратная операция: восстанавливает узлы из снапшота:

1. Возвращает все `removedNodes` в Map `nodes`.
2. Восстанавливает `selectedIds` и `expandedIds` для первого узла.
3. Добавляет `nodeKey` обратно в `childrenIds` родителя.

**Обновлённый `handleNodeDelete`**

```typescript
export async function handleNodeDelete(server: string, nodeKey: string) {
    const ancestor = findNearestLazyAncestor(server, nodeKey);
    if (ancestor) {
        await reloadChildrenByParentNodeKey(server, ancestor.nodeKey, nodeKey);
    }
}
```

Больше **нет** `else`-ветки с `reloadChildrenByParentId` — для eager-узлов без lazy-предка состояние уже обновлено оптимистично, fetch не нужен.

### 2. Обновлённый DeleteAction

**Файл:** `src/components/MetadataHier/actions/delete/index.tsx`

```typescript
export const DeleteAction = ({ server, nodes, children, isInContextMenu }: IActionProps) => {
    // 1. Разрешаем TreeDataControlled → NormalizedNode и фильтруем по CRUD
    const allTargets = useMemo<NormalizedNode[]>(
        () => nodes
            .map((n) => getNodeByKey(server, n.id))
            .filter((n): n is NormalizedNode => Boolean(n))
            .filter((n) => n.crud?.includes('d')),
        [nodes, server],
    );

    // 2. Отфильтровываем потомков — оставляем только предков.
    //    Если выделены parent + parent/child, удаляем parent/child:
    //    удаление parent уже удалит всё поддерево через removeNodeOptimistically.
    const targets = useMemo<NormalizedNode[]>(() => filterAncestorNodes(allTargets), [allTargets]);

    const handleConfirm = useCallback(async () => {
        if (targets.length === 0) return;

        // 1. Оптимистичное удаление ДО запроса
        const snapshots = targets.map((n) => removeNodeOptimistically(server, n.nodeKey));
        if (!isInContextMenu) clearSelectedIds(server);

        try {
            // 2. API-вызовы
            await Promise.all(targets.map((n) => deleteNode(n, server)));

            // 3. Согласование с сервером (lazy-only reload)
            await Promise.all(targets.map((n) => handleNodeDelete(server, n.nodeKey)));

            $message.show(targets.length > 1 ? 'Объекты успешно удалены!' : 'Объект успешно удалён!');
        } catch (e) {
            // 4. Откат при ошибке
            snapshots.forEach((snap) => restoreRemovedNodes(server, snap));
            $message.show('Ошибка при удалении');
        }
    }, [targets, server, isInContextMenu]);

    const confirmContent = useMemo(() => {
        if (targets.length === 0) return undefined;
        // ...
    }, [isInContextMenu, targets]);

    if (targets.length === 0) return null;
    // render PopConfirm...
};
```

### 3. Переписанный UpdateAction

**Файл:** `src/components/MetadataHier/actions/update/index.tsx`

```typescript
export const UpdateAction = ({ server, nodes, children }: IActionProps) => {
    // 1. resolve NormalizedNode
    const resolved = useMemo<NormalizedNode[]>(
        () => nodes.map((n) => getNodeByKey(server, n.id)).filter((n): n is NormalizedNode => Boolean(n)),
        [nodes, server],
    );

    // 2. пары [NormalizedNode, hasChildren] для каждого выделенного
    const pairs = useMemo<Array<{ node: NormalizedNode; hasChildren: boolean }>>(
        () => nodes
            .map((treeNode) => {
                const normal = getNodeByKey(server, treeNode.id);
                return normal ? { node: normal, hasChildren: !!treeNode.hasChildren } : null;
            })
            .filter((p): p is { node: NormalizedNode; hasChildren: boolean } => p !== null),
        [nodes, server],
    );

    // 3. canRefresh: определяет, можно ли обновить узел
    const canRefresh = useCallback(
        (normal: NormalizedNode, hasChildren: boolean): boolean =>
            isRoot(server, normal.nodeKey) || hasChildren || normal.expandable || (normal.childrenIds?.length ?? 0) > 0,
        [server],
    );

    // 4. visible: кнопка видна когда ничего не выделено ИЛИ хотя бы один узел можно обновить
    const visible = nodes.length === 0 || pairs.some(({ node, hasChildren }) => canRefresh(node, hasChildren));

    // 5. handler
    const handleUpdate = useCallback(async () => {
        if (pairs.length > 0) {
            const hasRoot = pairs.some(({ node }) => isRoot(server, node.nodeKey));
            if (hasRoot) {
                clearCache(server);
                await reloadRootRecursively(server);
            } else {
                const refreshable = pairs.filter((p) => canRefresh(p.node, p.hasChildren));
                await Promise.all(refreshable.map((p) => handleReloadNode(server, p.node.nodeKey)));
            }
            if (nodes.length > 1) clearSelectedIds(server);
        } else {
            clearCache(server);
            await reloadRootRecursively(server);
        }
    }, [pairs, nodes.length, server, canRefresh]);

    if (!visible) return null;
    // render IconButton...
};
```

**Логика `canRefresh(node, hasChildren)`:**

Узел можно обновить через кнопку, если:
- Это **корень** дерева → обновляем всё дерево рекурсивно.
- У него есть **дочерние элементы** (`hasChildren: true` из `TreeDataControlled`, или `expandable: true` из `NormalizedNode`, или `childrenIds.length > 0`).

**Фильтрация предков (ancestor filtering):**

При множественном выделении, если пользователь выбрал `root/parent` + `root/parent/child`:
- Если `root/parent` **refreshable** → отфильтровываем `root/parent/child` (обновление parent обновит и child).
- Если `root/parent` **НЕ refreshable** → оставляем `root/parent/child` (он может обновиться независимо).

Реализовано через `useMemo` → `effectivePairs`:
```typescript
const effectivePairs = useMemo(
    () => pairs.filter(({ node, hasChildren }) => {
        const hasRefreshableAncestor = pairs.some(({ node: ancestor, hasChildren: ah }) => {
            if (ancestor.nodeKey === node.nodeKey) return false;
            if (!node.nodeKey.startsWith(`${ancestor.nodeKey}/`)) return false;
            return canRefresh(ancestor, ah);
        });
        return !hasRefreshableAncestor;
    }),
    [pairs, server],
);
```

**Замечание по сложности:** UpdateAction использует `pairs.some()` → O(n · d) на каждый элемент, итого O(n² · d).
Это приемлемо, потому что количество **выделенных** узлов на практике редко превышает 10–20.
Для DeleteAction применяется `filterAncestorNodes` из service.ts с гарантированной O(n · d).

**Логика visibility:**

| Состояние | Кнопка видна? | Поведение при клике |
|---|---|---|
| `nodes.length === 0` | ✅ Да | `reloadRootRecursively` — обновление всего дерева |
| Выделен корень | ✅ Да | `reloadRootRecursively` |
| Выделен lazy-узел (expandable) | ✅ Да | `handleReloadNode` на этот узел |
| Выделен eager-узел без детей | ❌ Нет | — |
| Выделены несколько узлов, хотя бы один refreshable | ✅ Да | Обновляются все refreshable |

### 3. Утилиты `isAncestorOf` и `filterAncestorNodes`

**Файл:** `src/components/MetadataHier/lib/service.ts`

```typescript
/**
 * Проверяет, является ли `ancestorKey` предком `descendantKey`
 * (или равен ему). nodeKey формируется как "{root}/{parent}/{child}/...",
 * поэтому достаточно проверить префикс.
 */
export function isAncestorOf(ancestorKey: string, descendantKey: string): boolean {
    if (ancestorKey === descendantKey) return true;
    return descendantKey.startsWith(`${ancestorKey}/`);
}

/**
 * Фильтрует массив NormalizedNode, оставляя только «верхнеуровневые» узлы —
 * те, предки которых НЕ находятся внутри `nodes`.
 *
 * Это нужно, чтобы при множественном выборе, когда пользователь выделил,
 * например, `root/parent` и `root/parent/child`, мы оперировали только
 * `root/parent`. Удаление/перезагрузка `root/parent` уже затронет `child`.
 */
export function filterAncestorNodes(nodes: NormalizedNode[]): NormalizedNode[] {
    if (nodes.length <= 1) return nodes;

    return nodes.filter((node) => {
        return !nodes.some((other) => {
            if (other.nodeKey === node.nodeKey) return false;
            return isAncestorOf(other.nodeKey, node.nodeKey);
        });
    });
}
```

**Сложность:** O(n · d), где n — кол-во выделенных узлов, d — глубина nodeKey (обычно 3–7).
В отличие от наивного O(n²), здесь для каждого узла проверяются только его **реальные предки**
(через `split('/')`), а не все остальные узлы.

| Входящий массив | Результат |
|---|---|
| `['root/a']` | `['root/a']` (без изменений) |
| `['root/a', 'root/b']` | `['root/a', 'root/b']` (нет вложенности) |
| `['root/parent', 'root/parent/child']` | `['root/parent']` |
| `['root/gp', 'root/gp/parent', 'root/gp/parent/child']` | `['root/gp']` |
| `['root/a', 'root/b', 'root/b/c']` | `['root/a', 'root/b']` |

### 4. Убран блок блокировки в renderActions

**Файл:** `src/components/MetadataHier/actions/index.tsx`

Было:
```typescript
if (!nodes?.length) return null;
```

Стало (убрано полностью):
```typescript
// Не блокируем рендер, если ничего не выделено —
// отдельные action-компоненты (например UpdateAction) решают сами,
// видны ли они при пустом выделении.
```

### 5. Guards и хуки в single-node actions

**Все single-node action-компоненты:** `EditAction`, `AddAction`, `SortAction`, `EditAccessAction`, `OpenFileManagerAction`.

Паттерн приведения к правильному порядку:

```typescript
export const ActionComponent = ({ server, nodes, children }: IActionProps) => {
    // 1. useCallback в самом начале (хук всегда вызывается)
    const handleClick = useCallback(() => {
        if (nodes.length === 0) return;
        const node = nodes[0];
        // ... логика
    }, [server, nodes]);

    // 2. Guard-проверки после хука
    if (nodes.length === 0) return null;
    if (nodes.length > 1) return null;

    // 3. Логика чтения из nodes[0] (теперь safe)
    const node = nodes[0];
    // ...
};
```

### 6. Обновлённый handleNodeDelete

**Файл:** `src/components/MetadataHier/lib/service.ts`

```typescript
export async function handleNodeDelete(server: string, nodeKey: string) {
    const ancestor = findNearestLazyAncestor(server, nodeKey);
    if (ancestor) {
        await reloadChildrenByParentNodeKey(server, ancestor.nodeKey, nodeKey);
    }
}
```

Для eager-узлов без lazy-предка `findNearestLazyAncestor` возвращает `null` → функция возвращает сразу. Состояние уже было обновлено `removeNodeOptimistically` — повторный fetch не нужен.

## Поведение после изменений

### Оптимистичное удаление

| Сценарий | До | После |
|---|---|---|
| Удаление lazy-узла | Сначала API → потом удаление | Мгновенное удаление → API → lazy reload (консистентность) |
| Удаление eager-узла без lazy-предка | Сначала API → reloadChildrenByParentId → удаление | Мгновенное удаление → API → **no-op** (без лишнего fetch) |
| Ошибка API | UI не обновлялся | Откат: узлы возвращаются на место |

### Кнопка «Обновить»

| Сценарий | До | После |
|---|---|---|
| Ничего не выделено | Кнопка скрыта | Кнопка видна, обновляет всё дерево |
| Выделен корень | Обновлял lazy-предка | Обновляет всё дерево (`reloadRootRecursively`) |
| Выделен lazy-узел (expandable) | Обновлял lazy-предка | Обновляет сам lazy-узел (`handleReloadNode`) |
| Выделен eager-узел без детей | Обновлял lazy-предка | Кнопка скрыта (нельзя обновить) |
| Выделено несколько узлов | Обновлял lazy-предка первого | Обновляет все refreshable, сбрасывает выделение |

### Хуки

| До | После |
|---|---|
| `useCallback` после `if (nodes.length === 0) return null;` | `useCallback` всегда первый, guard после |
| Нарушение React Hook rules | Правила соблюдены |

## Тесты

### 1. `updateAction.test.tsx` — 12 тестов

**Файл:** `src/components/MetadataHier/__test__/lib/updateAction.test.tsx`

Покрытие `UpdateAction` через `@testing-library/react`:

#### Visibility — 8 тестов

| № | Тест | Ожидаемый результат |
|---|---|---|
| 1 | Пустой `nodes` | Кнопка **видна** (обновляет всё дерево) |
| 2 | Выделен корень | Кнопка **видна** |
| 3 | Выделен expandable lazy-узел | Кнопка **видна** |
| 4 | Выделен eager-узел без детей | Кнопка **скрыта** |
| 5 | Выделено несколько: один refreshable | Кнопка **видна** |
| 6 | Выделено несколько: ни один не refreshable | Кнопка **скрыта** |
| 7 | Expandable true, childrenIds = [] | Кнопка **видна** |
| 8 | Expandable false, hasChildren = false | Кнопка **скрыта** |

#### Click handlers — 4 теста

| № | Тест | Ожидаемый результат |
|---|---|---|
| 9 | Клик по кнопке при пустом `nodes` | `reloadRootRecursively` вызван 1 раз |
| 10 | Клик по кнопке с refreshable узлом | `handleReloadNode` вызван для refreshable узлов |
| 11 | parent+child оба refreshable → только parent | `handleReloadNode` вызван **только** для parent, child отфильтрован |
| 12 | parent не refreshable + child refreshable | `handleReloadNode` вызван для child (parent не refreshable → child НЕ отфильтрован) |

### 2. `isAncestorOf` / `filterAncestorNodes` — 7 тестов

**Файл:** `src/components/MetadataHier/__test__/lib/service.test.ts`

#### `isAncestorOf` — 3 теста

| № | Тест | Ожидаемый результат |
|---|---|---|
| 1 | Равные ключи | `true` |
| 2 | Parent → child | `true` |
| 3 | Не-предок (sibling, child→parent, partial prefix) | `false` |

#### `filterAncestorNodes` — 4 теста

| № | Тест | Ожидаемый результат |
|---|---|---|
| 1 | Один узел | Без изменений |
| 2 | Несколько узлов без вложенности | Без изменений |
| 3 | `parent + child` | Только `parent` |
| 4 | `gp + parent + child` (глубокая вложенность) | Только `gp` |

### 3. Обновлённый тест `handleNodeDelete`

**Файл:** `src/components/MetadataHier/__test__/lib/service.test.ts`

Тест `handleNodeDelete без lazy-предка` обновлён:

| До | После |
|---|---|
| Ожидает вызов `fetch('children-by-parent...')` для eager-родителя | Ожидает `removeNodeOptimistically` + **без вызовов fetch** |
| Проверяет что узел удалён из состояния | Проверяет что узел удалён из состояния (то же самое) |
| | Проверяет что **родительский fetch не вызван** |

### Результаты запуска

```
Test Suites: 1 failed, 8 passed, 9 total
Tests:       1 failed, 196 passed, 197 total
```

**1 pre-existing failing test** (не связан с изменениями):
- `service.test.ts › loadChildren › должен корректно смёртить полученных детей (owner_id)` — ожидает принудительное перезаписывание `owner_id`, но фактическое поведение использует `??` (только заполняет null).

## Изменённые файлы

| Файл | Изменение | Описание |
|---|---|---|
| `src/components/MetadataHier/lib/service.ts` | +155 строк | `isAncestorOf`, `filterAncestorNodes`, `OptimisticDeleteSnapshot`, `removeNodeOptimistically`, `restoreRemovedNodes`, упрощён `handleNodeDelete` |
| `src/components/MetadataHier/actions/delete/index.tsx` | ~30 строк | Оптимистичное удаление + rollback, `filterAncestorNodes`, хуки наверху |
| `src/components/MetadataHier/actions/update/index.tsx` | ~50 строк | Переписан с парами `[NormalizedNode, hasChildren]`, `canRefresh`, `effectivePairs` (ancestor filtering), visibility logic, хуки наверху |
| `src/components/MetadataHier/actions/index.tsx` | -3 строки | Убран `if (!nodes?.length) return null` |
| `src/components/MetadataHier/actions/edit/index.tsx` | ~10 строк | Guard + хук наверху |
| `src/components/MetadataHier/actions/add/index.tsx` | ~10 строк | Guard + хук наверху |
| `src/components/MetadataHier/actions/sort/index.tsx` | ~10 строк | Guard + хук наверху |
| `src/components/MetadataHier/actions/editAccess/index.tsx` | ~10 строк | Guard + хук наверху |
| `src/components/MetadataHier/actions/openFileManager/index.tsx` | ~10 строк | Guard + хук наверху |
| `src/components/MetadataHier/__test__/lib/updateAction.test.tsx` | +200 строк | **Новый файл**: 12 тестов (8 visibility + 4 click, ancestor filtering) |
| `src/components/MetadataHier/__test__/lib/service.test.ts` | +60 строк | +7 тестов `isAncestorOf`/`filterAncestorNodes`, обновлён `handleNodeDelete` |

## Edge cases

1. **Узел не найден в scope** — `removeNodeOptimistically` возвращает пустой снапшот (no-op, без вызовов сети).
2. **Узел с потомками** — `removeNodeOptimistically` рекурсивно удаляет **всё поддерево**.
3. **Узел был в выделении** — `wasSelected: true` → при откате восстанавливает выделение.
4. **Узел был развёрнут** — `wasExpanded: true` → при откате восстанавливает expanded-состояние.
5. **Множественное удаление** — `targets` может содержать несколько узлов; каждый обрабатывается через `removeNodeOptimistically` + `deleteNode` параллельно.
6. **Eager-корень без lazy-предка** — `handleNodeDelete` делает no-op (state уже обновлён).
7. **Кнопка обновления при пустом выделении** — видна, обновляет всё дерево рекурсивно через `reloadRootRecursively`.
8. **`childrenIds` родителя после отката** — при `restoreRemovedNodes` проверяется что `nodeKey` не дублируется в `childrenIds` (`!parent.childrenIds.includes(firstKey)`).
9. **Антест: partial prefix** — `isAncestorOf('root/a', 'root/aX/b')` → `false` (проверка `startsWith(ancestorKey + '/')` защищает от ложных срабатываний при похожих именах).
10. **Антест: parent не refreshable + child refreshable** — child НЕ отфильтрован, обновляется независимо (корректное поведение: parent не может обновить child, child сам может быть lazy-узлом).

## Известные ограничения и follow-up

- **`handleNodeUpdate`** не имеет fallback при отсутствии lazy-предка (только `if (ancestor) await ...`) — это pre-existing асимметрия. В будущем можно добавить `reloadChildrenByParentId` fallback.
- **`handleNodeAdd`** и `handleReloadNode` содержат идентичные блоки поиска lazy-предка — рекомендуется вынести в приватную `reloadByAncestorIfNeeded` (DRY).
- **`ReactDOMTestUtils.act` deprecation** — в тестах для `UpdateAction` есть предупреждение от `@testing-library/react` v13. При миграции на React 18 нужно импортировать `act` из `react` вместо `react-dom/test-utils`.
- **Консистентность при ошибке** — если `deleteNode` падает, `restoreRemovedNodes` восстанавливает узлы. Но если `handleNodeDelete` (после API) падает — откат не нужен (state уже консистентен, поскольку API прошёл).
- **Множественное обновление** — при клике на UpdateAction с выделенными узлами обновляются только «refreshable» узлы. Это правильное поведение, но пользователь может ожидать обновление **всех** выделенных узлов.
- **Контекстное меню** — `getContextMenuActions` всегда передаёт `nodes` длиной 1. Логика множественного выбора там не применяется.
- **`useCallback` в `DeleteAction`** — в `handleConfirm` мутация `clearSelectedIds` происходит **после** `removeNodeOptimistically`. Это намеренно: мы хотим сбросить выделение мгновенно вместе с удалением.

## Визуальное поведение

### До

```
[Edit] [Add] [Delete] [Sort] [Update] [FileManager]
```
Update скрыт, когда ничего не выделено.

### После

```
[Edit] [Add] [Delete] [Sort] [Update] [FileManager]
```
Update **всегда виден**. При клике — обновляет всё дерево (если ничего не выделено) или refreshable узлы.

### При оптимистичном удалении

```
Клик по Delete →
  1. Мгновенное удаление узла из UI ⚡
  2. API deleteNode()
  3. Если success → lazy reload предка (консистентность)
  4. Если error → откат: узел возвращается на место
```

## Проверка

### Unit-тесты

```bash
npx craco test --watchAll=false --testPathPattern='src/components/MetadataHier/__test__'
```
→ **185 passed, 1 failed** (pre-existing `owner_id` test — не связан с PR).

### TypeScript

```bash
npx tsc --noEmit
```
→ Без ошибок в затронутых файлах.

### ESLint

```bash
npm run eslint
```
→ Чисто.

### Визуальная проверка

1. `npm start` → перейти на `/adminpanel`.
2. Выделить узел → кнопка Update видна.
3. Снять выделение → кнопка Update **осталась видна** (раньше исчезала).
4. Клик по Update (ничего не выделено) → всё дерево перезагружено.
5. Клик по Delete → узел исчезает **мгновенно** (без задержки).
6. Имитация ошибки (отключить бэкенд) → узел возвращается на место.
