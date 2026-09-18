# SRDMDLTKLN-596 — FormGRef: имена узлов дерева вместо class_id в заголовках групп

## Задача

В компоненте `FormGRef` (тип поля `REF` в формах метаданных) при группировке ссылок по `class_id` в заголовках групп отображался **сырой UUID** (идентификатор метаданных). Необходимо показывать **человекочитаемое имя узла**, как оно отображается в дереве метаданных (`MetadataHier`).

## Контекст и место в системе

`frontend-admin` — админ-панель SREDA, собирающая формы редактирования метаданных из JSON-схем. Форма может содержать поля типа `REF` (ссылка на другую сущность метаданных), которые рендерятся через компонент `FormGRef`.

### Связующее звено

`FormGRef` → `FormGroupList` → `Select` (группированный `Select` из `ui-kit`).

- `FormGRef` формирует `this.state.options` — объект вида `{ [groupKey]: { [itemKey]: itemLabel } }`.
- `FormGroupList` рендерит этот объект в `Select` с `grouped: true`. Ключи группы (`groupKey`) становятся заголовками групп.

До этой задачи в качестве `groupKey` использовался `class_id` (UUID), например:

```
📂 20901b97-d1cf-4472-a27b-b0442e436c9a
  ├─ СтандартнаяФормаВыбора
  ├─ СтандартнаяФормаГруппы
  └─ СтандартнаяФормаСписка
```

После:

```
📂 Формы
  ├─ СтандартнаяФормаВыбора
  ├─ СтандартнаяФормаГруппы
  └─ СтандартнаяФормаСписка
```

## Исходные данные

### Тип `FormGRefMetadataLink`

```typescript
type FormGRefMetadataLink = {
    class: string;       // техническое имя класса метаданных (например "Forms")
    class_id: string;    // UUID класса метаданных
    id: string;          // UUID ссылки
    owner_id: string;    // UUID владельца (родительская ветка в дереве)
    name: string;        // Имя ссылки
    description: string;
    // ... остальные поля
};
```

### Ответ бэкенда

`GET /metadata/link/<linkRef>/<parent>` возвращает массив `FormGRefMetadataLink[]`:

```json
[
    {
        "id": "9bc031cc-220e-4843-a172-612d80e8a337",
        "class_id": "20901b97-d1cf-4472-a27b-b0442e436c9a",
        "class": "Forms",
        "owner_id": "00000000-0000-0000-0000-000000000000",
        "name": "СтандартнаяФормаВыбора",
        "description": "СтандартнаяФормаВыбора"
    },
    { ... }
]
```

### Формат ответа дерева

`GET /metadata/v3/tree/:id` возвращает `RawChildNode[]` — тот же формат, что используется `MetadataHier` (`src/components/MetadataHier/api/api.ts`):

```typescript
interface RawChildNode {
    id: string;
    name: string;
    description: string;
    class_id: string;
    // ...
    children?: RawChildNode[];
}
```

Дерево рендерит `node.name` — поэтому «как в дереве» означает брать именно `name` из этого ответа.

## История решения (почему выбран обходной путь)

1. **Первая итерация** — HTTP-запрос `/metadata/object/:class_id` в `componentDidMount` из `FormGroupList`. Не сработала: в момент монтирования `props.data.list === undefined`. Перенесли в `componentDidUpdate` — работало, но концептуально неверно: слой отображения (`FormGroupList`) начинает самостоятельно ходить в сеть.
2. **Вторая итерация** — простое поле `class` из ответа `/metadata/link`. Работает без дополнительных запросов, но `class` — **техническое имя** (например `Forms`), а не человекочитаемое, как в дереве (`Формы`).
3. **Финальная итерация** — отдельный хелпер `buildTitle.helper.ts`, повторяющий путь дерева (описано ниже). Принято как компромисс: даёт имена, идентичные дереву, ценой 1-N дополнительных запросов.

## Решение

### Архитектура

Заголовки собираются в отдельном хелпере `buildTitle.helper.ts` (папка `FormGRef`), а не в компонентах:

- `FormGroupList` — чистый слой отображения, не должен ходить в сеть;
- `FormGRef` — владелец данных, передаёт готовый маппинг вниз как проп.

```
FormGRef.loadLinks()
    ├─ GET /metadata/link/<linkRef>/<parent>  → sortedData (уже было)
    ├─ dataLinks, dataInfo (уже было)
    ├─ await buildTitleLabels(sortedData, parent, server)   ← новое
    └─ setState({ options, dataInfo, refLoading, titleLabels })

FormGRef.render()
    └─ <FormGroupList ... titleLabels={this.state.titleLabels} />

FormGroupList.render()
    └─ label: titleLabels?.[groupValue] ?? groupValue
```

### Алгоритм `buildTitleLabels`

Напрямую получить «деревянное» имя по `class_id` нельзя: `/metadata/object/:id` и поле `class` из `/metadata/link` дают иное имя, чем рендерит дерево. Обходной путь:

1. Собрать уникальные `class_id` из `sortedData` (`class_id` может прийти строкой со значениями через запятую — поэтому уникальные атомарные id).
2. Для каждого `class_id`:
   - взять **первый** элемент `sortedData` с этим `class_id` и его `owner_id`;
   - корень дерева: `parent` (если задан — **один запрос** на все `class_id`) иначе `owner_id`;
   - `GET /metadata/v3/tree/<rootId>`;
   - рекурсивно найти узел с `id === class_id` (функция `findTreeNode`);
   - имя узла: `node.name`, fallback `node.description`.
3. Кеширование: дерево от одного корня запрашивается один раз за вызов (`Map<rootId, Promise>`).

### Приоритет имён и fallback

| Ситуация | Заголовок |
|---|---|
| Узел найден в дереве, `name` непустой | `node.name` |
| Узел найден, `name` пустой | `node.description` |
| Узел не найден в дереве | `item.class` (из `/metadata/link`), fallback `class_id` |
| Запрос дерева упал / `owner_id` отсутствует | «голый» `class_id` |

Примеры:

| `class_id` | Найден в дереве (`name`) | Заголовок |
|---|---|---|
| `20901b97-d1cf-4472-a27b-b0442e436c9a` | да, `Формы` | `📂 Формы` |
| `0cb5c67e-6ad1-4a68-874e-b61ab4118e2a` | да, `СхемыЗагрузокИзФайловСписок` | `📂 СхемыЗагрузокИзФайловСписок` |
| `a1b2c3d4-...` | нет | `📂 Forms` (fallback на `class`) |
| `e5f6a7b8-...` | нет, `class` пустой | `📂 e5f6a7b8-...` («голый» id) |
| любой | запрос дерева упал | `📂 <class_id>` («голый» id) |

### Роль `parent`

`parent` используется **только для оптимизации запросов**, не для формирования имени:

- задан → один `GET /metadata/v3/tree/:parent` покрывает все `class_id` (дерево кешируется внутри вызова);
- не задан → дерево запрашивается от `owner_id` каждого `class_id` (по-прежнему не более одного запроса на уникальный корень).

### Интеграция

**`types.ts`** — новое поле состояния:

```typescript
export type FormGRefState = {
    // ... существующие поля
    titleLabels?: Record<string, string>;
};
```

**`FormGRef.tsx`** (`loadLinks`, блок `else` — не-object link):

```typescript
const titleLabels = await buildTitleLabels(sortedData, parent, server);

this.setState({ options: dataLinks, dataInfo, refLoading: false, titleLabels }, () => { ... });
```

Передача в обе render-ветки `FormGroupList`: `titleLabels={this.state.titleLabels}`.

**`FormGroupList.tsx`**:

```typescript
interface FormGroupListProps {
    // ...
    titleLabels?: Record<string, string>;
}

// render():
const { titleLabels } = this.props;
// ...
options.push({
    value: groupValue,
    label: titleLabels?.[groupValue] ?? groupValue,  // имя узла или fallback на UUID
    options: option,
});
```

## Изменённые файлы

| Файл | Изменение |
|---|---|
| `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/buildTitle.helper.ts` | **создан**: `buildTitleLabels`, `findTreeNode` |
| `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/FormGRef.tsx` | вызов `buildTitleLabels` в `loadLinks`, передача `titleLabels` в `FormGroupList` (обе ветки) |
| `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/types.ts` | поле `titleLabels?: Record<string, string>` в `FormGRefState` |
| `src/components/Inspector/helpers/FormBuilderComponents/FormGroupList.tsx` | проп `titleLabels`, использование для label группы |

## Edge cases

1. **`class_id` со значениями через запятую** — обрабатывается: `Array.from(new Set(...))` по атомарным значениям. Каждый атомарный id ищется в дереве независимо.

2. **Пустой `class` при ненаходе в дереве** — `item.class || classId`: если и `class` пустой, остаётся «голый» id.

3. **Быстрая смена `parent`** — при быстрых изменениях `parentInfo` может сработать несколько параллельных `loadLinks`. Каждый `setState` перезаписывает `titleLabels`, поэтому после последнего завершившегося запроса состояние консистентно (тот же паттерн, что у `options`).

4. **Блок `if` (object link, `link.field`)** — `titleLabels` для этого пути **не формируется**. Там группы строятся от `uuid` из `parentInfo`, а элементы приходят из `treeObject`. Оставлено как отдельная задача.

5. **Одинаковые имена узлов** — разные `class_id` могут дать одинаковый `name`. Дубликаты заголовков допустимы (семантика бэкенда).

## Чек-листы

### Реализация

- [x] Хелпер `buildTitleLabels` вынесен в `FormGRef/buildTitle.helper.ts` с комментарием-обоснованием обходного пути
- [x] Поле `titleLabels?: Record<string, string>` в `FormGRefState`
- [x] Вызов `buildTitleLabels(sortedData, parent, server)` в `loadLinks` (блок `else`)
- [x] Проп `titleLabels` в `FormGroupListProps`
- [x] Использование `titleLabels` в `FormGroupList.render()` с fallback на `groupValue`
- [x] Передача `titleLabels` из `FormGRef` в `FormGroupList` (обе render-ветки)

### Проверки

- [x] `npm run ts-check` — без новых ошибок
- [x] `npx eslint` на `FormGRef.tsx`, `buildTitle.helper.ts` — без замечаний
- [ ] Runtime: группы показывают имена, идентичные дереву (`name` из `/metadata/v3/tree`)
- [ ] Runtime: при недоступности дерева показывается `class` или «голый» id
- [ ] Runtime: сценарий с заданным `parent` — ровно один запрос `/metadata/v3/tree/:parent`

## Связанные источники

- `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/buildTitle.helper.ts` — хелпер заголовков
- `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/FormGRef.tsx` — владелец `options`/`dataInfo`, вызов хелпера
- `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/types.ts` — `FormGRefMetadataLink`, `FormGRefState`
- `src/components/Inspector/helpers/FormBuilderComponents/FormGroupList.tsx` — рендер группированного `Select`
- `src/components/MetadataHier/api/api.ts` — контракт `/metadata/v3/tree` (TREE_BASE + VER_URL), формат `RawChildNode`
- `src/components/MetadataHier/types.ts` — `RawChildNode`
- `src/components/MetadataHier/lib/flatAdapter.ts` — дерево рендерит `node.name` (`title: node.name`)
- `helpers/axios` — `$api` (инстанс axios с interceptor'ами)
- `helpers/buildUrl` — сборка URL из частей
- `ui-kit` — `Select` с поддержкой `grouped: true`
