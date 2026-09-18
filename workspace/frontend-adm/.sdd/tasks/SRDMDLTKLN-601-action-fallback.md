# SRDMDLTKLN-601 — Action fallback в контекстном меню дерева метаданных

## Задача

`getContextMenuActions` собирал массив JSX-обёрток для контекстного меню дерева
(`MetadataHier`) и затем проверял, что «все элементы — `null`», чтобы показать
заглушку «Нет доступных действий».

Дополнительно компоненты `DeleteAction` и `UpdateAction` использовали `useMemo`
для вычисления `targets`. Эта логика нужна вне компонентов (для фильтрации до
создания JSX), что делает её трудной для переиспользования.

## Цель

1. Корректно показывать заглушку «Нет доступных действий», когда ни одно действие
   не видно для выбранного узла.
2. Не создавать React-элементы для невидимых действий (избегаем бесполезной работы
   `React.createElement` и потенциальных побочных эффектов в дочерних хуках).

## Решение

### 1. Чистые функции видимости

Для каждого компонента действия введена отдельная чистая функция, которая
вычисляет, нужно ли показывать это действие для данного узла:

**`actions/add/index.tsx`** — `isAddActionVisible(node)`:
```typescript
export const isAddActionVisible = (node: NormalizedNode | null | undefined): boolean => {
    if (!node) return false;
    if (!node.routes) return false;
    if (!node.crud?.includes('c')) return false;
    return true;
};
```

**`actions/sort/index.tsx`** — `isSortActionVisible(node)`:
```typescript
export const isSortActionVisible = (node?: NormalizedNode): boolean => {
    if (!node?.childrenIds || node.childrenIds.length === 0) return false;
    return true;
};
```

**`actions/delete/index.tsx`** — `isDeleteActionVisible(server, nodes)`:
```typescript
export const isDeleteActionVisible = (server: string, nodes: IActionProps['nodes']): boolean => {
    const targets = nodes
        .map((n) => getNodeByKey(server, n.id))
        .filter((n): n is NormalizedNode => Boolean(n))
        .filter((n) => n.crud?.includes('d'));
    return targets.length > 0;
};
```

**`actions/editAccess/index.tsx`** — `isEditAccessActionVisible(node)`:
```typescript
export const isEditAccessActionVisible = (node: NormalizedNode | null | undefined): boolean =>
    Boolean(node);
```

**`actions/update/index.tsx`** — `isUpdateActionVisible(server, nodes)`:
```typescript
export const isUpdateActionVisible = (server: string, nodes: IActionProps['nodes']): boolean => {
    const resolved = nodes.map((n) => getNodeByKey(server, n.id)).filter((n): n is NormalizedNode => Boolean(n));
    const root = resolved.find((n) => isRoot(server, n.nodeKey));
    if (root) return true;
    return resolved.some((n) => n.loadStrategy === 'lazy' && isExpanded(server, n.nodeKey));
};
```

Каждая функция возвращает `true`/`false` — без побочных эффектов и без вызовов
JSX. Их можно безопасно вызывать до создания React-элементов.

### 2. Условное создание JSX в `getContextMenuActions`

**Файл:** `src/components/MetadataHier/lib/getActions.tsx`

Вместо массива JSX-элементов с последующей проверкой, теперь каждый элемент
добавляется только если соответствующая функция видимости возвращает `true`:

```typescript
export const getContextMenuActions = (node: NormalizedNode, server: string): ReactNode[] => {
    const treeNode: TreeDataControlled = { id: node.nodeKey, title: node.name, hasChildren: node.expandable };
    const treeNodes = [treeNode];
    const visibleActions: ReactNode[] = [];

    if (node.crud?.includes('c') && node.routes) {
        visibleActions.push(<AddAction server={server} nodes={treeNodes}>...</AddAction>);
    }
    if (node.expandable) {
        visibleActions.push(<SortAction server={server} nodes={treeNodes}>...</SortAction>);
    }
    if (isDeleteActionVisible(server, treeNodes)) {
        visibleActions.push(<DeleteAction server={server} nodes={treeNodes} isInContextMenu>...</DeleteAction>);
    }
    if (isEditAccessActionVisible(node)) {
        visibleActions.push(<EditAccessAction server={server} nodes={treeNodes}>...</EditAccessAction>);
    }
    if (isUpdateActionVisible(server, treeNodes)) {
        visibleActions.push(<UpdateAction server={server} nodes={treeNodes} isInContextMenu>...</UpdateAction>);
    }

    if (visibleActions.length === 0) {
        return [<div style={{ userSelect: 'none' }}>Нет доступных действий</div>];
    }
    return visibleActions;
};
```

Заглушка показывается ровно тогда, когда ни одна функция видимости не вернула
`true`.

### 3. Упрощение `DeleteAction` и `UpdateAction`

Чтобы функция видимости могла безопасно использоваться вне компонентов,
убраны лишние хуки:

**`DeleteAction`**:
- Убран `useMemo` для `targets` (синхронное вычисление на рендере).
- `confirmContent` переведён из `useMemo` в IIFE (`(() => {...})()`).

**`UpdateAction`**:
- Убран `useMemo` для `targets` (используется `visibleTargets` для рендера).

`SortAction` и `EditAccessAction` оставлены без изменений в плане хуков;
`useMemo` для `fromStore` в `SortAction` восстановлен обратно после этапа
оптимизации (важно для производительности на больших деревьях).

## Изменённые файлы

| Файл | Изменение |
|---|---|
| `src/components/MetadataHier/lib/getActions.tsx` | Полностью переписан: условное создание JSX, fallback при отсутствии видимых действий |
| `src/components/MetadataHier/actions/add/index.tsx` | + `isAddActionVisible`; рефакторинг условий рендера |
| `src/components/MetadataHier/actions/sort/index.tsx` | + `isSortActionVisible`; |
| `src/components/MetadataHier/actions/delete/index.tsx` | + `isDeleteActionVisible`; убран `useMemo` для `targets`, `confirmContent` через IIFE |
| `src/components/MetadataHier/actions/editAccess/index.tsx` | + `isEditAccessActionVisible` |
| `src/components/MetadataHier/actions/update/index.tsx` | + `isUpdateActionVisible`; убран `useMemo` для `targets` |
| `src/components/MetadataHier/__test__/lib/getActions.test.tsx` | Полностью переписан: проверки количества действий при разных правах |

## Тесты

`src/components/MetadataHier/__test__/lib/getActions.test.tsx`:

| Сценарий | Ожидание |
|---|---|
| `crud: [], routes: null` | 1 элемент — fallback «Нет доступных действий» |
| `crud: ['c', 'd'], routes: '/test', expandable: true, loadStrategy: 'eager'` | 3 элемента (Добавить/Сортировать/Удалить) |
| `crud: ['c', 'd'], routes: '/test', expandable: true, loadStrategy: 'lazy', isExpanded: true` | 5 элементов (+ EditAccess + Update) |
| `crud: ['c', 'd'], routes: '/test', expandable: true, loadStrategy: 'eager', isExpanded: true` | 4 элемента (без Update) |
| `crud: ['c']` (без `d`) | 2 элемента (без Удалить) |
| `crud: ['c'], expandable: false` | 1 элемент (только Добавить) |
| `crud: [], routes: null, expandable: false` | fallback |

Тесты в `flatAdapter.test.ts` (24 теста) продолжают проходить — `getContextMenuActions`
сохранил контракт вызова `(node, server)`.

## Edge cases

1. **Пустой `nodes`** — `nodes?.[0]` безопасен, компоненты получают `node === undefined`,
   `fromStore === undefined`, функции видимости возвращают `false`.
2. **Узел без `crud.includes('d')`** — `DeleteAction` скрыт, не создаётся JSX.
3. **Узел без `routes`** — `AddAction` скрыт (требует `routes` для создания формы).
4. **Eager-узел без `isExpanded`** — `UpdateAction` скрыт (обновление только для
   `lazy + expanded` или для `root`).
5. **Lazy-корень** — `UpdateAction` виден (root → полная перезагрузка).

## Известные ограничения и follow-up

- **DRY**: `DeleteAction` и `UpdateAction` имеют почти идентичные блоки
  `nodes.map(...).filter(Boolean).filter(...)` — можно вынести в общий хелпер
  `resolveTargetsByCrud`.
- **`isUpdateActionVisible` использует `isRoot`/`isExpanded`** — это хелперы из
  `service.ts`; поведение может измениться при их рефакторинге, нужны тесты на
  эти хелперы.
- **EditAccess без проверки прав** — в текущей реализации `EditAccessAction` всегда
  показывается, если узел найден. Это намеренное упрощение; если потребуется
  гейтинг по правам, нужно добавить соответствующую проверку.
