## 0. Контракт

Бэкенд кладёт на каждый узел строковый **семантический токен** иконки:

```
icon: 'folder' | 'wrench' | 'axis' | 'pencil' | 'indexes' | 'keys' | 'fkeys'
```

Иконка вычисляется по ТИПУ узла (`component`/`class`) через реестр `component → token`.
Неизвестный тип → `null` (фронт применит свою эвристику). Позиционные/глубинные иконки
остаются на фронте.

Фронт уже принимает поле: `RawBaseNode.icon?: string` → `normalize` → `iconName`.
Требуется одна обязательная фронтовая правка (Часть 3), иначе иконка не отрендерится.

## Затронутые файлы

Backend (`metadata-cmp` + расширения):

-   [ ] `metadata-cmp/services/metadata/source/iconRegistry.js` — **создать**
-   [ ] `metadata-cmp/services/metadata/source/LevelClass.class.js` — эмитить `icon`
-   [ ] `metadata-cmp/services/metadata/source/MetaData.class.js` — иконка корня
-   [ ] расширения (`metadata-cubes` и др.) — регистрация иконок своих типов

Frontend (обязательный follow-up):

-   [ ] `MetadataHier/lib/flatAdapter.ts` — исправить lookup в `getIcon`

---

## ЧАСТЬ 1. Backend

### Шаг 1.1. Создать реестр иконок

Создать файл `metadata-cmp/services/metadata/source/iconRegistry.js`:

```js
// Соответствие backend-класса (component) → семантический токен иконки на фронте.
// Токены ДОЛЖНЫ совпадать с ключами карты `icons` в MetadataHier/lib/flatAdapter.ts.
const iconRegistry = {
    Metadata: 'folder',
    Fields: 'axis',
    Indexes: 'indexes',
    Keys: 'keys',
    ForeignKeys: 'fkeys',
};

/**
 * @param {string} component
 * @returns {string | null}
 */
function getIconByComponent(component) {
    return iconRegistry[component] ?? null;
}

/**
 * Регистрация иконок из расширений.
 * @param {Record<string, string>} entries
 */
function registerIcons(entries) {
    Object.assign(iconRegistry, entries);
}

module.exports = { iconRegistry, getIconByComponent, registerIcons };
```

### Шаг 1.2. `LevelClass.class.js` — импорт реестра

В начало файла, рядом с существующими `require` (после
`const MetadataModel = require('../../model/Metadata.model');`), добавить:

```js
const { getIconByComponent } = require('./iconRegistry');
```

### Шаг 1.3. `LevelClass.class.js` — иконка в `item()`

В методе `item()` в объекте `menuItem` найти строку-якорь:

```js
            routes: this.props.routes,
```

и добавить сразу под ней строку:

```js
            icon: this.props?.icon ?? getIconByComponent(this.component) ?? null,
```

Итог (фрагмент объекта `menuItem`):

```js
            crud: this.childrenCRUD,
            routes: this.props.routes,
            icon: this.props?.icon ?? getIconByComponent(this.component) ?? null,
        };
```

### Шаг 1.4. `LevelClass.class.js` — иконка в `tree()`

В методе `tree()` найти строку-якорь:

```js
if (options.instance) tree.classInstance = this;
```

и добавить сразу под ней:

```js
tree.icon = tree.icon ?? getIconByComponent(this.component) ?? null;
```

> Приоритет: явный `icon` из `constants` (попадает в `this.props.icon`) → реестр по
> `component` → `null`. Реестр — источник по умолчанию, поэтому редактировать props-литерал
> каждого класса не требуется.

### Шаг 1.5. `MetaData.class.js` — иконка корня

В конструкторе найти объект `this.props`:

```js
this.props = {
    id: this.id,
    name: 'Метаданные',
    description: 'Метаданные',
    crud: ['rls'],
};
```

Добавить поле `icon`:

```js
this.props = {
    id: this.id,
    name: 'Метаданные',
    description: 'Метаданные',
    crud: ['rls'],
    icon: 'folder',
};
```

(Либо не трогать и положиться на реестр `Metadata: 'folder'` — `tree.icon` из шага 1.4
подставит его. Явное поле надёжнее для корня.)

### Шаг 1.6. Регистрация иконок в расширениях

В каждом расширении со своими `component` зарегистрировать токены в точке инициализации
модуля (где уже подключаются `constants`). Пример для `metadata-cubes`:

```js
const { registerIcons } = require('../../metadata-cmp/services/metadata/source/iconRegistry');

registerIcons({
    Fields: 'axis',
    Dimensions: 'axis',
    Measures: 'indexes',
    // прочие типы — по дизайну; неуказанные → эвристика фронта
});
```

Точный относительный путь до `iconRegistry` выверить от места регистрации. Токены — только
из набора контракта (п. 0). Типы без специфической иконки можно не регистрировать.

---

## ЧАСТЬ 2. (проверка данных) Ответ дерева содержит `icon`

После правок ответ `GET /metadata/v3/tree(/:id)` на узлах известных типов содержит
`icon: '<token>'`, у прочих `icon: null`. Быстрый чек в БД/логах не нужен — поле
формируется в `LevelClass`.

---

## ЧАСТЬ 3. Frontend — обязательная правка `getIcon`

Без неё backend-токен не рендерится: guard проверяет `in icons` (семантические ключи),
а возврат идёт из карты по именам компонентов.

`MetadataHier/lib/flatAdapter.ts`, в `getIcon` было:

```ts
if (node.iconName && node.iconName in icons) {
    return iconByComponentName[node.iconName as keyof typeof icons];
}
```

Стало:

```ts
if (node.iconName && node.iconName in icons) {
    return icons[node.iconName as keyof typeof icons];
}
```

После этого карта `iconByComponentName` и её импорт больше не нужны — удалить:

```ts
const iconByComponentName: Record<string, (typeof icons)[keyof typeof icons]> = {
    FolderIcon,
    SettingWrenchIcon,
    AxisIcon,
    EditIcon,
    IndicatorBarIcon,
    AccessGiveIcon,
    AttachmentIcon,
};
```

и убрать неиспользуемые импорты компонентов из `ui-kit`, если они больше нигде не нужны в
файле (оставить те, что используются в объекте `icons`).

---

## ЧАСТЬ 4. Проверка

```bash
grep -n "getIconByComponent" metadata-cmp/services/metadata/source/LevelClass.class.js   # импорт + item() + tree()
grep -rn "registerIcons" metadata-cubes metadata-connector                                # расширения зарегистрированы
grep -n "return icons\[" MetadataHier/lib/flatAdapter.ts                                   # исправленный lookup
grep -n "iconByComponentName" MetadataHier/lib/flatAdapter.ts                              # должно быть пусто
```

Ручная проверка:

-   В ответе дерева `icon` присутствует (поля → `axis`, известные типы → свой токен, прочие → `null`).
-   В UI: у известных типов иконка из backend-токена; у остальных — прежняя эвристика.
-   Токен вне набора → мягкая деградация к эвристике, без ошибок в консоли.

Кэш: если ответы дерева кэшируются (`memorysave-*`) — прогреть/сбросить, иначе старые
узлы придут без `icon`.

---

## Порядок применения

1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 3 → 4. Реестр и базовый класс — первыми; фронтовая
однострочная правка обязательна для рендера; расширения — по мере надобности.

## Ключевые тезисы

-   `icon` = семантический токен; бэкенд UI-агностичен, вычисляет иконку по `component`
    через реестр. Правится только базовый `LevelClass` (+ реестр, + регистрация в расширениях).
-   Фронт уже принимает `raw.icon`; но `getIcon` берёт иконку из неверной карты — правка
    `icons[node.iconName]` обязательна.
-   Depth/позиционные иконки остаются на фронте; бэкенд их не дублирует.
-   Рассинхрон наборов токенов бэк/фронт — главный риск; держать список согласованным.
