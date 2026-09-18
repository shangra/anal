## Задача SRDMDLTKLN-362: Исправление смещения выпадающего списка в компоненте Select

### 1. Проблема

При нажатии на "+" в мульти-выборе (MultiSelect) и раскрытии выпадающего списка окно со списком отображалось в смещённом виде — вылезало за верхнюю панель или перекрывало поля ввода данных.

**Описание задачи:**
> 4.1. При нажатии на "+" и раскрытии выпадающего списка в мульти выборе, окно со списком отображается в смещенном виде (вылезает за верхнюю панель/ перекрывает поля ввода данных)

### 2. Решение

Проблема решена увеличением вертикального смещения выпадающего списка (`Popover`) относительно поля ввода с **10 пикселей** до **16 пикселей**.

Для обеспечения гибкости смещение вынесено в параметр `popoverOffset`, который:

1. Добавлен в интерфейс `ISelectProps` компонента `Select` (`src/components/MetadataForms/Inputs/Select/index.tsx`).
2. Пробрасывается вниз в компоненты `CustomSelect` и `GroupedSelect`.
3. В каждом из этих компонентов добавлен параметр `popoverOffset?: number` в интерфейс `ICustomInputProps`.
4. Значение по умолчанию — **10 px** (старое поведение) — используется, если `popoverOffset` не передан.

### 3. Изменённые файлы

| Файл | Изменение |
| --- | --- |
| `src/components/MetadataForms/Inputs/Select/index.tsx` | Добавлен проп `popoverOffset?: number` в `ISelectProps`, проброшен в `CustomSelect` и `GroupedSelect`. |
| `src/components/MetadataForms/Inputs/Select/components/CustomSelect/index.tsx` | Добавлен проп `popoverOffset?: number` в `ICustomInputProps`, значение передано в `Popover.offset` с фоллбэком на `10`. |
| `src/components/MetadataForms/Inputs/Select/components/GroupedSelect/index.tsx` | Аналогично `CustomSelect`: добавлен `popoverOffset`, передан в `Popover.offset` с фоллбэком на `10`. |
| `src/components/Inspector/helpers/FormBuilderComponents/FormComposite.tsx` | В компоненте `FormComposite` при рендере `FormList` добавлен `popoverOffset={16}`. |
| `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/FormGRef.tsx` | В компоненте `FormGRef` добавлен `popoverOffset={16}` при рендере `FormList`. |
| `src/components/Inspector/helpers/FormBuilderComponents/FormGroupList.tsx` | В компоненте `FormGroupList` добавлен `popoverOffset={16}` при рендере `Select`. |
| `src/components/Inspector/helpers/FormBuilderComponents/FormList.tsx` | В компоненте `FormList` добавлен `popoverOffset={16}` при рендере `FormList`. |
| `vendors/ui-kit/ui-kit-1.6.13.tgz` → `vendors/ui-kit/ui-kit-1.6.15.tgz` | Обновлён вендорный `ui-kit` с версии `1.6.13` до `1.6.15`. |

### 4. Детали реализации

#### 4.1. Компонент `Select` (точка входа)

```tsx
// src/components/MetadataForms/Inputs/Select/index.tsx
interface ISelectProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    // ...existing...
    popoverOffset?: number;  // <-- новый проп
}
```

Значение пробрасывается в оба подкомпонента:

```tsx
<GroupedSelect
    popoverOffset={this.props.popoverOffset}
    // ...
/>

<CustomSelect
    popoverOffset={this.props.popoverOffset}
    // ...
/>
```

#### 4.2. Компонент `CustomSelect`

```tsx
// src/components/MetadataForms/Inputs/Select/components/CustomSelect/index.tsx
interface ICustomInputProps<T = string, R extends boolean = true> extends SelectProps<T, R> {
    opened: boolean;
    setOpen: () => void;
    popoverOffset?: number;  // <-- новый проп
}

// В JSX:
<Popover
    opened={opened}
    offset={popoverOffset ?? 10}  // <-- фоллбэк на 10
    // ...
/>
```

#### 4.3. Компонент `GroupedSelect`

```tsx
// src/components/MetadataForms/Inputs/Select/components/GroupedSelect/index.tsx
interface ICustomInputProps<T = string, R extends boolean = true> extends SelectProps<T, R> {
    opened: boolean;
    options?: (IGroupedSelectOption<T> | { value: T; label: string })[];
    setOpen: () => void;
    popoverOffset?: number;  // <-- новый проп
}

// В JSX:
<Popover
    opened={opened}
    offset={popoverOffset ?? 10}  // <-- фоллбэк на 10
    // ...
/>
```

#### 4.4. Потребители с `popoverOffset={16}`

Компоненты в `Inspector/helpers/FormBuilderComponents/` теперь явно задают `popoverOffset={16}` для решения описанной проблемы:

```tsx
// src/components/Inspector/helpers/FormBuilderComponents/FormComposite.tsx
<FormList
    popoverOffset={16}
    // ...
/>

// src/components/Inspector/helpers/FormBuilderComponents/FormGRef/FormGRef.tsx
<FormList
    popoverOffset={16}
    // ...
/>

// src/components/Inspector/helpers/FormBuilderComponents/FormGroupList.tsx
<Select
    popoverOffset={16}
    // ...
/>

// src/components/Inspector/helpers/FormBuilderComponents/FormList.tsx
<FormList
    popoverOffset={16}
    // ...
/>
```

### 5. Вспомогательные изменения

#### 5.1. Обновление `ui-kit`

Вендорный пакет `ui-kit` обновлён с версии `1.6.13` до `1.6.15`:

| Файл | До | После |
| --- | --- | --- |
| `vendors/ui-kit/ui-kit-1.6.13.tgz` | Удалён | — |
| `vendors/ui-kit/ui-kit-1.6.15.tgz` | — | Создан |
| `package.json` → `ui-kit` | `file:vendors/ui-kit/ui-kit-1.6.13.tgz` | `file:vendors/ui-kit/ui-kit-1.6.15.tgz` |

#### 5.2. Рефакторинг `FormGroupList.tsx`

В компоненте `FormGroupList` проведена дополнительная работа по улучшению типизации:

- Изменён тип `onChange` с `(name: string, value: string) => void` на `(name: string, value: string \| undefined) => void`.
- Изменён тип `state.value` с `string` на `string \| undefined`.
- Функция `handleChange` теперь принимает `string \| null` и корректно обрабатывает `null` → `undefined` преобразование.
- Убраны неиспользуемые интерфейсы `FormGroupListItem` и `FormGroupListData`.
- Рендер `Select` переписан с spread-props на явное перечисление пропсов.

### 6. Как проверить

1. Запустить dev-сервер: `npm start`.
2. Перейти в админ-панель к компоненту с мульти-выбором (например, `FormComposite`, `FormGRef`, `FormGroupList`).
3. Нажать на "+" для раскрытия выпадающего списка.
4. **Ожидаемый результат:** выпадающий список отображается с корректным смещением от поля ввода, не перекрывает верхнюю панель, не вылезает за пределы видимой области.

### 7. Обратная совместимость

- Параметр `popoverOffset` является **опциональным** (`popoverOffset?: number`).
- Если `popoverOffset` не передан, используется значение по умолчанию **10 px** (старое поведение).
- Компоненты, которые не передают `popoverOffset`, продолжат работать без изменений.
- Изменения затронули только компоненты в `Inspector/helpers/FormBuilderComponents/` — это внутренние компонентыInspector, не являющиеся публичным API Module Federation.

### 8. Использование `popoverOffset` в других компонентах

Если аналогичная проблема возникает в других местах, где используется `Select`:

```tsx
<Select
    name="mySelect"
    options={options}
    value={selectedValue}
    onChange={handleChange}
    popoverOffset={16}  // <-- задать необходимое смещение
/>
```

Или для `CustomSelect` / `GroupedSelect`:

```tsx
<CustomSelect
    opened={isOpen}
    setOpen={() => setIsOpen(false)}
    options={options}
    value={value}
    popoverOffset={16}  // <-- задать необходимое смещение
/>
```

### 9. Чек-лист приёмки

- [x] Проблема со смещением выпадающего списка воспроизводится до исправления и устраняется после.
- [x] `popoverOffset` проброшен через всю цепочку: `Select` → `CustomSelect` / `GroupedSelect` → `Popover.offset`.
- [x] Значение по умолчанию `10 px` не ломает существующие компоненты.
- [x] Все потребители в `Inspector/helpers/FormBuilderComponents/` передают `popoverOffset={16}`.
- [x] `npm run ts-check` проходит без ошибок.
- [x] `npm run test:all` зелёный.
- [x] Обновлён `ui-kit` с `1.6.13` до `1.6.15`.
- [x] Коммит принят, CI-пайплайн прошёл.

### 10. Связанные источники

- `src/components/MetadataForms/Inputs/Select/index.tsx` — точка входа, проброс `popoverOffset`.
- `src/components/MetadataForms/Inputs/Select/components/CustomSelect/index.tsx` — рендер `Popover` с `offset`.
- `src/components/MetadataForms/Inputs/Select/components/GroupedSelect/index.tsx` — рендер `Popover` с `offset`.
- `src/components/Inspector/helpers/FormBuilderComponents/FormComposite.tsx` — потребитель, передаёт `popoverOffset={16}`.
- `src/components/Inspector/helpers/FormBuilderComponents/FormGRef/FormGRef.tsx` — потребитель, передаёт `popoverOffset={16}`.
- `src/components/Inspector/helpers/FormBuilderComponents/FormGroupList.tsx` — потребитель, передаёт `popoverOffset={16}`.
- `src/components/Inspector/helpers/FormBuilderComponents/FormList.tsx` — потребитель, передаёт `popoverOffset={16}`.
- `vendors/ui-kit/` — вендорный пакет `ui-kit`.
- `README 2.md` — документация по Module Federation.
- `GIGACODE.md` — контекст проекта.
