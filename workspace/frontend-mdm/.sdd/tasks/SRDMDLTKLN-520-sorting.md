## Задача SRDMDLTKLN-520: Реализовать вкладку «Сортировка» в окне настроек списков

### Цель и контекст задачи

`frontend-mdm` — модуль управления метаданными (MDM) платформы SREDA. Окно «Настройка списка» (`GroupSettingsWindow`, `src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/index.tsx`) открывается кнопкой **`MetadataForms.Buttons.Group`** (`src/components/MetadataForms/Buttons/Group/index.tsx`) и сейчас содержит четыре вкладки (`TITLES` в `src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/constants.ts`):

| Индекс | Вкладка | Иконка | Текущее состояние |
| --- | --- | --- | --- |
| 0 | Отбор | `SelectionTabIcon` | Заглушка |
| 1 | Сортировка | `SortingTabIcon` | **Заглушка** — `<div key='sort'>Сортировка</div>` |
| 2 | Условное оформление | `ConditionalRegistrationTabIcon` | Заглушка |
| 3 | Группировка | `GroupTabIcon` | Реализована |

Активная вкладка по умолчанию — `activeTab: 3` (`GroupSettingsWindow`). State-объект `IGroupingSettingsState` (`src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/types.ts`) уже описывает общие поля: `availableFields`, `selectedFields`, `expandedFolders` — они логично переиспользуются и для сортировки.

Кнопка `Group` уже умеет загружать поля через `Api.fetchFieldsByObject(DataManager.metaOwner)` (`src/components/MetadataForms/Buttons/Group/index.tsx`, метод `loadFields`) и собирает их в форму `{ field, name }`. Этот же источник должен использоваться вкладкой «Сортировка».

Требуется превратить заглушку вкладки «Сортировка» в полноценный блок управления порядком записей списка, опираясь на уже реализованную локальную сортировку в `MetadataForms.TabularPart` и компараторы из `src/helpers/comparator.ts`.

---

### Ожидаемый результат

После выполнения задачи пользователь сможет прямо во вкладке «Сортировка» окна настроек списка задать порядок записей, применить его к списку и сохранить между сессиями.

**UX-конвенция и сроки реализации:**

1. **Источник полей** — список полей для сортировки берётся из схемы метаданных, как в кнопке `Group`:
   ```ts
   const res = await Api.fetchFieldsByObject(DataManager.metaOwner);
   const fields = [
       ...res.registryFields ?? [],
       ...res.registryTableFields ?? [],
   ].map(el => ({ field: el.value, name: el.label }));
   ```
2. **Уровни сортировки.** Пользователь может добавлять несколько уровней с приоритетом (поле 1 → поле 2 → поле 3). Для каждого уровня:
   - выбор поля из динамического списка;
   - направление: `По возрастанию` (ASC) / `По убыванию` (DESC);
   - изменение приоритета (вверх/вниз) — паттерн уже реализован в `GroupSettingsWindow.moveField`;
   - удаление уровня — паттерн `removeField`.
3. **Алгоритм упорядочивания.** Используется `defaultComparatorForAllTypes` из `src/helpers/comparator.ts` с направлениями `'asc' | 'desc'` (тип `SORT_DIRECTION_TYPE = 'ASC' | 'DESC'`) и поддержкой типов полей `string` (через `localeCompare`), `number` (числовое сравнение), `date` (через `Date.parse`).
4. **Совместимость с `MetadataForms.TabularPart`.** В табличной части уже есть локальная сортировка по клику на заголовке колонки (тесты `describe('TabularPart Sorting')` в `src/components/MetadataForms/TabularPart/__test__/TabularPart.test.tsx`). Настройки из вкладки «Сортировка» не должны ломать этот UX — поведение «клик по заголовку → сортировка по этому полю → повторный клик → инверсия» сохраняется, а новая вкладка становится источником сортировки по умолчанию для таблицы.
5. **Применение.** Кнопка «Применить» в `<div className='settings-footer'>` (`GroupSettingsWindow`) пробрасывает собранные уровни сортировки в API-запрос списка через `axios`/`src/helpers/axios.jsx`, `BACKEND_PROXY` из `src/settings/settings.js`. Для серверной сортировки — параметры `sortField` + `sortDirection` (или список уровней), для клиентской — применяется `defaultComparatorForAllTypes` последовательно по уровням.
6. **Сброс.** Кнопка «Сбросить изменения» в `<div className='settings-footer'>` возвращает сортировку к значению по умолчанию.
7. **Сохранение.** Состояние сортировки хранится в `lite-react-statemanager` (singleton, см. `src/initState.js`), привязывается к идентификатору списка (`DataManager.metaOwner`). Ключ вида `listSort__<metaOwner>` регистрируется в `userDataKeysDepended` (`src/settings/settings.js`) для корректного сброса при смене пользователя (по аналогии с `theme`, `assistant`, `backgroundImageHash`).
8. **Совместимость с группой.** Вкладки «Группировка» и «Сортировка» не конфликтуют по состоянию: либо используется раздельный state-слот, либо общий state расширен без потери обратной совместимости.

---

### Технические опорные точки в проекте

- **Окно настроек** — `src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/index.tsx`. Содержит классы `GroupSettingsWindow` и `Tabs`, `tabContent` (массив JSX по `activeTab`), общий `settings-footer` с кнопками «Сбросить изменения» и «Применить». Методы `addField`, `removeField`, `moveField`, `toggleFolder` — готовые паттерны для управления списком уровней.
- **Заголовки вкладок и иконки** — `src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/constants.ts` (`TITLES`) и `src/components/MetadataForms/Buttons/Group/Icon/*` (`SortingTabIcon`).
- **Кнопка-открыватель** — `src/components/MetadataForms/Buttons/Group/index.tsx`, методы `handleClick` (открывает окно через `$windows.open(<GroupSettingsWindow />)`) и `loadFields` (загружает поля через `Api.fetchFieldsByObject`).
- **Компараторы** — `src/helpers/comparator.ts` (`defaultComparator`, `defaultComparatorForAllTypes`, типы `'asc' | 'desc'`, `SORT_DIRECTION_TYPE = 'ASC' | 'DESC'`, типы полей `string` / `number` / `date`).
- **Локальная сортировка в таблице** — `MetadataForms.TabularPart` (`src/components/MetadataForms/TabularPart/`), тесты `describe('TabularPart Sorting')` в `src/components/MetadataForms/TabularPart/__test__/TabularPart.test.tsx`. Поведение «asc по клику, desc по второму клику» должно сохраниться.
- **Окна** — `src/components/ui/windows.helper.js` (`$windows.open/close` через `StateManager.setState({ windows: ... })`).
- **Состояние** — `src/initState.js`, `userDataKeysDepended` в `src/settings/settings.js`.
- **HTTP** — `src/helpers/axios.jsx`, `BACKEND_PROXY` из `src/settings/settings.js`.

---

### Критерии приёмки

1. В массиве `tabContent` (`GroupSettingsWindow`) индекс `1` возвращает полноценный UI управления сортировкой вместо заглушки `<div>Сортировка</div>`.
2. Список полей для сортировки формируется из `Api.fetchFieldsByObject(DataManager.metaOwner)` (тот же источник, что уже используется кнопкой `Group`).
3. Поддерживается многоуровневая сортировка: добавление/удаление уровней, изменение приоритета (используются паттерны `addField`/`removeField`/`moveField`).
4. Для каждого уровня доступны направления ASC/DESC.
5. Алгоритм упорядочивания опирается на `defaultComparatorForAllTypes` из `src/helpers/comparator.ts` и поддерживает минимум типы `string`, `number`, `date`.
6. Кнопка «Применить» в `<div className='settings-footer'>` применяет сортировку к списку (через API-параметры или клиентскую сортировку).
7. Кнопка «Сбросить изменения» возвращает сортировку к значению по умолчанию.
8. Сохранённые настройки восстанавливаются после закрытия/открытия окна и после перезагрузки страницы (через `lite-react-statemanager` + `localStorage`, по аналогии с `markdelPages` из `src/initState.js`).
9. Новый ключ добавлен в `userDataKeysDepended` (`src/settings/settings.js`).
10. Локальная сортировка по клику на заголовке колонки в `MetadataForms.TabularPart` продолжает работать и не конфликтует с настройками из вкладки (существующие тесты `TabularPart Sorting` остаются зелёными).
11. Вкладки «Группировка» и «Сортировка» не конфликтуют по состоянию: либо используется раздельный state-слот, либо общий state расширен без потери обратной совместимости.
12. Добавлены unit/интеграционные тесты в `src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/__tests__/` (Jest + Testing Library, конфигурация в `craco.config.js`).
13. Добавлена Storybook-история `*.stories.tsx` для вкладки (Storybook 7.6.19).
14. `npm run ts-check`, `npm run eslint`, `npm run prettier`, `npm run test:all` — без замечаний.
15. Покрытие не падает ниже существующих порогов (`collectCoverageFrom` исключает `*.d.ts`, `*.types.ts`, `*.type.ts`, `ui/`, `UIKit/`, `UiKitIcons/`, `Utils/`, `MetadataGuideList/`).
16. Глобальный `window.error`-листенер из `src/bootstrap.js` учтён: ошибки видны только в `console.error`.
