## 0. Что чиним и почему

Сортировка идёт внутри группы `(владелец, тип)`. В дереве сортируемая группа — это
контейнерный узел (`Fields`, `Dimensions`, …) c `id == class_id ==` константой типа и
`owner_id ==` реальным id владельца. Реальные дети — строки БД с `parent = owner_id` и
`class_id = <константа типа>`.

1. **Frontend** шлёт в `parent` константу типа (`id`/`class_id` контейнера) вместо
   реального `owner_id` → пустой ответ. Плюс кнопка сортировки показывается на
   несортируемых (контейнерных/виртуальных) узлах.

## Затронутые файлы

Frontend (`MetadataHier`):

-   [ ] `MetadataHier/types.ts` — тип `NodeSort`, поля в `RawChildNode`/`NormalizedNode`
-   [ ] `MetadataHier/lib/normalize.ts` — проброс `sort`
-   [ ] `MetadataHier/actions/sort/index.tsx` — гейтинг + координаты из `sort`

## ЧАСТЬ 3. Frontend — гейтинг и координаты из `sort`

### Шаг 3.1. `MetadataHier/types.ts` — типы

Добавить тип `NodeSort` и поля `sort` в `RawChildNode` и `NormalizedNode`.

В `RawChildNode` (рядом с `class_id`, `routes`) добавить:

```ts
    sort?: NodeSort;
```

Перед `export interface NormalizedNode {` добавить:

```ts
export type NodeSort =
    | { strategy: 'none' }
    | { strategy: 'db'; parent: string; classId: string }
    | { strategy: 'manifest'; ownerRowId: string; orderPath: string };
```

В `NormalizedNode` (рядом с `class`, `routes`) добавить:

```ts
sort: NodeSort;
```

### Шаг 3.2. `MetadataHier/lib/normalize.ts` — проброс

В `normalizeRootNode` добавить поле (корень несортируем):

```ts
        sort: { strategy: 'none' },
```

В `normalizeChildNode` добавить:

```ts
        sort: raw.sort ?? { strategy: 'none' },
```

### Шаг 3.3. `MetadataHier/actions/sort/index.tsx` — гейтинг + параметры

Показывать кнопку только для `strategy === 'db'`; в `RankEditor` слать координаты из
`sort` (реальный `owner_id` как `parent`, константу типа как `classId`).

Заменить начало компонента:

```tsx
export const SortAction = ({ server, node, children }: IActionProps) => {
    if (!node.hasChildren) return null;
    if (!isExpanded(server, node.id)) return null;

    const fromStore = getNodeByKey(server, node.id);
```

на:

```tsx
export const SortAction = ({ server, node, children }: IActionProps) => {
    if (!node.hasChildren) return null;
    if (!isExpanded(server, node.id)) return null;

    const fromStore = getNodeByKey(server, node.id);

    // Сортируем только группы реальных строк БД; координаты берём из дескриптора sort.
    const sort = fromStore?.sort;
    if (!sort || sort.strategy !== 'db') return null;
```

Заменить содержимое модалки:

```tsx
                    content: (
                        <RankEditor
                            classId={fromStore?.classId ?? ''}
                            parentId={fromStore?.parentId ?? ''}
                            callback={modalCallback}
                        />
                    ),
```

на:

```tsx
                    content: (
                        <RankEditor
                            server={server}
                            classId={sort.classId}
                            parentId={sort.parent}
                            callback={modalCallback}
                        />
                    ),
```

Обновить массив зависимостей `useCallback`:

```tsx
        [fromStore?.classId, fromStore?.ownerId, node.id, server],
```

на:

```tsx
        [sort.classId, sort.parent, node.id, server],
```

> Здесь также добавлен проп `server` в `<RankEditor />` — если он уже был добавлен
> прошлой правкой (server-фикс), оставить как есть. `RankEditor` не меняется:
> он передаёт `classId`/`parentId` в `fetchRankingList(server, classId, parentId)`.

---

## ЧАСТЬ 4. (Этап 2, опционально) Сортировка виртуальных сущностей

Для типов, чьи дети виртуальны (проекции из `manifest`, без строк БД). Требует знания
конкретной структуры `manifest` каждого класса, поэтому — как отдельный этап.

### 4.1. Контракт класса

Добавить в контейнерный класс два метода и пометить узел `strategy:'manifest'`:

```js
// в конструкторе соответствующего *.class.js:
this.props.sort = { strategy: 'manifest', ownerRowId: this.owner_id, orderPath: 'settings.order' };

// методы класса:
async getSortable(item, options = {}) {
    const owner = await this.getItem(this.owner_id, options);          // строка-владелец с manifest
    const order = owner.manifest?.settings?.order ?? [];
    // стабильный ключ виртуальной записи = ключ/имя поля в manifest
    return order.map((key, rank) => ({ id: key, name: key, rank }));
}
async reorder(item, orderedKeys, options = {}) {
    const owner = await this.getItem(this.owner_id, options);
    owner.manifest.settings.order = orderedKeys;                       // явный порядок
    return this.update(this.owner_id, { manifest: owner.manifest }, options); // атомарно
}
```

### 4.2. Диспатч в контроллере

`getRanksByParent`/`setRanks` в контроллере должны спросить класс: если у него есть
`getSortable`/`reorder` — использовать их, иначе fallback на БД-путь Части 1. Точную
реализацию `resolveInstance(class_id, parent)` определить по способу, которым сервис уже
инстанцирует классы (см. `getClassInstance`/`getTreeChildrenV3`).

> Этап 2 не начинать без карты `manifest` для конкретных виртуальных типов и стабильного
> ключа порядка (имя/ключ поля). До внедрения такие узлы остаются `strategy:'none'`.

---

## ЧАСТЬ 5. Проверка

### 5.1. Backend

```bash
grep -n "getChild(parent)" metadata-cmp/services/Metadata.service.js   # не в rank-методах
grep -n "get({ class_id, parent" metadata-cmp/services/Metadata.service.js  # в обоих rank-методах
grep -n "tree.sort" metadata-cmp/services/metadata/source/LevelClass.class.js
```

Юнит-тесты `getRanksByParent`/`setRanks` (в `metadata-cmp/__tests__`) обновить под ключ
`(class_id, parent)`.

### 5.2. Сеть (ручная)

-   Сортировка группы реальных полей под владельцем `O`:
    `GET /<server>/metadata/rank/<typeConst>/<O>` возвращает всех детей группы (не пусто и
    не 1 «родитель»); `parent` в URL — реальный id владельца, не константа типа.
-   Сохранение: `PUT` пишет `rank` атомарно; порядок сохраняется и совпадает с деревом.
-   Разные группы под одним владельцем (напр. поля и измерения) сортируются независимо.
-   На контейнерных/виртуальных узлах кнопки сортировки нет (`strategy:'none'`).

### 5.3. Регрессия

Дерево (`getTreeChildrenV3`) не затронуто — `sort` лишь добавочное поле узла.

---

## Порядок применения

1.1 → 1.2 → 2.1 → 2.2 → 3.1 → 3.2 → 3.3 → 5. Этап 2 (Часть 4) — отдельно, после Этапа 1.
Сначала backend (ключ группы + дескриптор), затем FE (типы → normalize → SortAction),
затем проверки.

## Ключевые тезисы

-   Ключ сортировки — `(parent, class_id)`; `class_id` обязателен (разделяет типовые группы
    под общим владельцем). Прошлую правку `getChild(parent)` в rank-методах откатываем.
-   `parent` в запросе = реальный `owner_id` (из `sort.parent`), а не константа типа.
-   Кнопка сортировки — только при `sort.strategy === 'db'`.
-   Виртуальные сущности — Этап 2 через `manifest`-порядок; до него скрыты.
