# SRDMDLTKLN-592 — TreeRef: ленивая загрузка в FormGRef

## Задача

В компоненте `FormGRef` для **глобальных** ссылок (`data.link.type === 'global'`) реализовать **ленивую (on-demand) загрузку** узлов дерева. До этой задачи при `isGlobal === true` все узлы дерева загружались **одним запросом** `GET /metadata/metacompositehelper/tree` сразу при монтировании компонента, что:

- возвращало избыточный payload, когда пользователю нужно выбрать 1–2 узла;
- неоптимально работало на больших деревьях метаданных;
- затрудняло актуализацию при изменении состава узлов.

После — дерево двухуровневое: **первый уровень грузится сразу**, **второй — только при раскрытии** соответствующего узла. Дочерние узлы второго уровня — листья (выбираются, но не раскрываются).

## Контекст и место в системе

`frontend-admin` — админ-панель SREDA. Поля типа `REF` в формах метаданных рендерятся через `FormGRef`, который делегирует глобальные ссылки в `TreeRef`.

```
FormGRef (index.tsx)
  └─ isGlobal ?
        ├─ нет  → LocalRef → FormGroupList   (локальные ссылки, по class_id)
        └─ да   → TreeRef → TreeSelect        (глобальные ссылки, по дереву метаданных)
```

До этой задачи `TreeRef` был частью `FormGRef` и использовал тот же запрос `/metadata/metacompositehelper/tree`, что и `MetadataHier`. Это требовало согласования форматов с основным деревом, ломалось при изменении структуры ответа и не позволяло независимо эволюционировать контракт `TreeSelect`.

В рамках этой задачи:

1. `FormGRef` разделён на `index.tsx` (общая часть: state, `loadLinks`, диспетчеризация), `LocalRef.tsx` (рендер `FormGroupList`) и `TreeRef.tsx` (самостоятельный компонент с ленивой загрузкой).
2. `TreeRef` использует **отдельные эндпоинты** `/metadata/links` (корень) и `/metadata/link/{id}` (дети).

## Решение

### Архитектура

```
TreeRef.componentDidMount()
  └─ loadRootLevel()
        └─ GET /metadata/links                     → treeData (1-й уровень)
                                                  → applyInitialExpand()

TreeRef.onExpand(next, change)
  └─ change.action === 'expanded' ?
        └─ loadChildren(change.node)
              └─ если loadedNodes.includes(node) → no-op (кэш)
              └─ GET /metadata/link/{node}        → children + expandable
                                                  → loadedNodes.push(node)

TreeRef.onChangeLink(value)
  └─ findParentValue(treeData, value)            → parentId
  └─ onChange(dataName, { link, value }, { [dataName]: { id } })
```

`TreeSelect` работает в **управляемом** режиме: `expandedNodes` хранится в state, `onExpand` пробрасывает обновления, `onChange` отдаёт выбранное значение.

### Состояние `TreeRef`

```typescript
type TreeRefState = {
    treeData: TreeSelectOption<string>[];        // 1-й уровень (с детьми, когда они загружены)
    treeDataLoaded: boolean;                      // первая загрузка завершена (успех или ошибка)
    treeDataLoading: boolean;                     // идёт запрос /metadata/links
    expandedNodes: string[];                      // id развёрнутых узлов 1-го уровня
    loadedNodes: string[];                        // id узлов, для которых дети уже загружены
};
```

`treeDataKey` из первоначального плана был удалён — он не нужен, `TreeSelect` реактивно реагирует на изменение `treeOptions`/`expandedNodes`/`value` без ремаунта.

### Контракт `TreeRefProps`

```typescript
type TreeRefProps = {
    server?: string;
    dataName: string;                              // имя поля формы (= data.name в FormGRef)
    value: FormGRefValue | string;                 // { link, value } | string
    disabled?: boolean;
    description?: string;                          // для FormInputWrapper
    onChange?: (name: string, value: {}, options: Record<string, FormGRefMetadataLink>) => void;
};
```

Изменение относительно старого `TreeRef` (был в `FormGRef.tsx`): props `data` и `dataInfo` заменены на плоские `dataName` и `description` — `TreeRef` теперь полностью автономен и не зависит от внутреннего state `FormGRef`.

### API-эндпоинты

| Запрос | Метод | Описание | Контракт ответа |
|---|---|---|---|
| `/metadata/links` | GET | Узлы 1-го уровня | `RootLink[]` |
| `/metadata/link/{parent_id}` | GET | Дети узла `parent_id` | `FormGRefMetadataLink[]` |

#### `RootLink`

```typescript
type RootLink = {
    id: string;
    name: string;
    description?: string;
    parent?: string;
    class_id: string;
    class?: string;
    manifest?: string;
    rank?: number;
};
```

`/metadata/links` — новый эндпоинт для задачи; раньше не использовался.

`/metadata/link/{parent_id}` — переиспользован из существующего контракта `/metadata/link/<linkRef>/<parent>`, но без первого сегмента `linkRef`: здесь передаётся только id родительского узла.

### Маппинг в `TreeSelectOption`

#### Узел 1-го уровня

```typescript
{
    value: item.id,
    label: item.name || item.description || item.id,
    title: item.description || item.name,
    disabled: true,          // нельзя выбрать (это группа)
    expandable: true,        // всегда раскрывается
    children: [],
}
```

#### Дочерний узел (2-й уровень)

```typescript
{
    value: item.id,
    label: item.name || item.description || item.id,
    title: item.description || item.name,
    disabled: false,         // можно выбрать
    expandable: false,       // 2-й уровень — всегда листья
    children: [],
}
```

> **Решение по `expandable` для детей:** вне зависимости от того, вернёт ли сервер для дочернего узла своих детей, раскрытие **запрещено** в `TreeRef`. Это упрощает UX (дерево всегда двухуровневое) и снимает вопрос о дальнейшей ленивой загрузке.

#### Узел после `loadChildren(parentId)`

После успешного запроса состояние узла обновляется через `replaceNode`:

```typescript
{
    ...node,
    children,                            // массив FormGRefMetadataLink → TreeSelectOption
    loading: false,
    expandable: items.length > 0,        // false, если сервер вернул [] (узел — лист)
}
```

### Иммутабельное обновление дерева

`replaceNode(nodes, targetValue, updater)` рекурсивно обходит дерево и возвращает **новый** массив с заменённым узлом. Используется во всех `setState((prev) => …)`:

```typescript
private replaceNode(
    nodes: TreeSelectOption<string>[],
    targetValue: string,
    updater: (node: TreeSelectOption<string>) => TreeSelectOption<string>,
): TreeSelectOption<string>[] {
    return nodes.map((node) => {
        if (node.value === targetValue) return updater(node);
        if (node.children?.length) {
            return { ...node, children: this.replaceNode(node.children, targetValue, updater) };
        }
        return node;
    });
}
```

Это нужно, чтобы:

- `TreeSelect` корректно перерисовывал только затронутую ветку (новые ссылки на узлы → re-render);
- не нарушалась работа `loadedNodes`/`expandedNodes` по identity.

### Авто-раскрытие при инициализации

Если `value` — это `FormGRefValue` (`{ link, value }`):

1. `applyInitialExpand()` вызывается в `callback` `setState` после успешной загрузки корня.
2. Добавляет `value.link` в `expandedNodes` (если ещё не там).
3. Запускает `loadChildren(value.link)` — дети подгружаются до того, как `TreeSelect` получит `value`.
4. Так как `expandedNodes` уже содержит `value.link` к моменту рендера, `TreeSelect` сразу показывает развёрнутую ветку; после прихода `children` (внутри `loadChildren`) — подсвечивается `value.value`.

```
componentDidMount → loadRootLevel → setState(treeData)
                                       └─ callback: applyInitialExpand
                                                       └─ setState(expandedNodes + value.link)
                                                       └─ loadChildren(value.link)
                                                              └─ setState(treeData.children + loadedNodes)
```

### Обработка `onChange`

`onChangeLink(selected)`:

- `selected === undefined` — очистка значения: `onChange(dataName, {}, {})`.
- Иначе рекурсивно ищет родителя в дереве (`findParentValue`) и формирует `FormGRefValue = { link: parentId, value: selected }`.

```typescript
const findParentValue = (nodes, targetValue) => {
    for (const node of nodes) {
        if (node.children?.length) {
            for (const child of node.children) {
                if (child.value === targetValue) return node.value;
                const found = findParentValue([child], targetValue);
                if (found) return found;
            }
        }
    }
    return null;
};
```

Если родитель не найден (теоретически не должно случаться, т.к. `selected` приходит только из `treeData`) — `parentId = ''`.

### Переиспользование компонента (смена `dataName`)

`componentDidUpdate(prevProps)` следит за `dataName`: если имя поля изменилось (тот же компонент рендерится для другой роли в другой форме), полностью сбрасывает state и загружает корень заново:

```typescript
if (prevProps.dataName !== this.props.dataName) {
    this.setState({
        treeData: [],
        treeDataLoaded: false,
        treeDataLoading: false,
        expandedNodes: [],
        loadedNodes: [],
    });
    this.loadRootLevel();
}
```

## Изменённые файлы

| Файл | Изменение |
|---|---|
| `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/TreeRef.tsx` | Полностью переписан: ленивая загрузка через `/metadata/links` + `/metadata/link/{id}`, кэш `loadedNodes`, auto-expand, иммутабельный `replaceNode` |
| `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/types.ts` | Добавлены `TreeRefState` (без `treeDataKey`) и `TreeRefProps` |
| `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/index.tsx` | В `render()` для глобальной ссылки пробрасываются плоские пропы: `dataName`, `description`, `disabled` (вместо `data` + `dataInfo`) |

## Edge cases

1. **Пустой ответ `/metadata/link/{id}`** — `expandable: false`, кнопка раскрытия у этого узла скрывается. Дочерние `children: []`.
2. **Ошибка `/metadata/links`** — `treeData: []`, `treeDataLoaded: true`, `loading: false`. Tree показывается пустым.
3. **Ошибка `/metadata/link/{id}`** — `loading: false` на узле, дерево не модифицируется, `loadedNodes` не пополняется (повторное раскрытие снова пойдёт в сеть).
4. **Повторное раскрытие уже загруженного узла** — `loadedNodes.includes(parentId)` → no-op, нового запроса нет.
5. **Смена `dataName`** — `componentDidUpdate` сбрасывает state и перезагружает корень.
6. **Параллельные запросы `/metadata/links`** — `treeDataLoading: true` блокирует повторный вход.
7. **`onChange` с очисткой** (`undefined`) — передаёт `{}` и пустой options в родительский `onChange`.
8. **`value` — строка (а не объект)** — `currentValue` = строка, передаётся в `TreeSelect.value`; `applyInitialExpand` пропускается.

## Поведение по сценариям

| Сценарий | Поведение |
|---|---|
| Монтирование, `value` не задан | Один запрос `/metadata/links` → дерево 1-го уровня |
| Монтирование, `value = { link: 'X', value: 'Y' }` | Запрос `/metadata/links` → auto-expand `X` → запрос `/metadata/link/X` → подсветка `Y` |
| Клик по «+» на узле 1-го уровня | Запрос `/metadata/link/{id}` (если не в кэше) → раскрытие с детьми |
| Повторный клик по «−/+» того же узла | Кэш → no-op, дети отображаются мгновенно |
| Сервер вернул `[]` для ребёнка | Узел становится листом (`expandable: false`), кнопка раскрытия скрывается |
| Клик по дочернему узлу | `onChange(dataName, { link: parentId, value: id }, { [dataName]: { id } })` |
| Очистка значения (`Clear` в `TreeSelect`) | `onChange(dataName, {}, {})` |

## Чек-листы

### Реализация

- [x] Разделение `FormGRef` → `index.tsx` + `LocalRef.tsx` + `TreeRef.tsx`
- [x] `TreeRef` использует `/metadata/links` (1-й уровень) и `/metadata/link/{id}` (ленивая догрузка)
- [x] Узлы 1-го уровня: `disabled: true`, `expandable: true`
- [x] Узлы 2-го уровня: `disabled: false`, `expandable: false`
- [x] Пустой ответ → `expandable: false` на родителе
- [x] `loading: true` на узле во время запроса
- [x] `loadedNodes: string[]` — кэш загруженных узлов
- [x] Auto-expand при инициализации, если `value.link` задан
- [x] Иммутабельное обновление через `replaceNode`
- [x] Сброс state и перезагрузка при смене `dataName`
- [x] Без `treeDataKey`/ремаунта `TreeSelect` — реактивное обновление

### Проверки

- [x] `npm run ts-check` — без новых ошибок
- [x] `npx eslint` на `FormGRef/` — без замечаний
- [x] `npx prettier --check` — отформатировано

## Открытые вопросы / follow-up

- **`autoExpand` проп `TreeSelect`** — в `ui-kit` есть проп `autoExpand`, который разворачивает дерево до выбранного элемента. Сейчас auto-expand реализован вручную через `expandedNodes`. Можно упростить, если поведение `ui-kit` совпадёт с нашим.
- **Поиск по дереву (`hasSearch`)** — `TreeSelect` поддерживает `hasSearch`, но поиск работает только по уже загруженным узлам. Для большого дерева может потребоваться серверный поиск (out of scope).
- **`/metadata/links` без параметров** — сейчас предполагается, что эндпоинт возвращает узлы 1-го уровня с `parent === ROOT_ID`. Если контракт изменится, потребуется поддержка `parent`-параметра.
- **`applyInitialExpand` при пустом `value.value`** — если `value.link` есть, а `value.value` пустой, узел всё равно раскроется (children загрузятся). Это нужно для UX «открыть форму и сразу увидеть группу».
- **DRY: `findParentValue`** — есть и в `onChangeLink`, и в `applyInitialExpand` через `findNode`. Можно унифицировать, но сейчас функциональности хватает.
- **Тесты для `TreeRef`** — задача покрыта только ручной проверкой. При наличии тест-инфраструктуры для axios-моков стоит добавить unit-тесты: монтирование, раскрытие, кэш, auto-expand, ошибки.

## Связанные источники

- `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/TreeRef.tsx` — реализация
- `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/types.ts` — `TreeRefState`, `TreeRefProps`
- `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/index.tsx` — диспетчеризация `isGlobal → TreeRef`
- `src/components/Inspector/helpers/FormBuilderComponents/FormInputWrapper.tsx` — обёртка с `description`
- `node_modules/ui-kit/dist/ui-kit.d.ts` — `TreeSelectProps`, `TreeSelectOption`, `TreeSelectExpandChange`
- `src/helpers/axios.ts` — `$api`
- `src/helpers/buildUrl.ts` — сборка URL из частей
