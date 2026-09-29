## Задача SRDMDLTKLN-519: Реализовать вкладку «Отбор» в окне настроек списков

### Цель и контекст задачи

`frontend-mdm` — модуль управления метаданными (MDM) платформы SREDA. Окно «Настройка списка» (`GroupSettingsWindow`, `src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/index.tsx`) открывается кнопкой **`MetadataForms.Buttons.Group`** (`src/components/MetadataForms/Buttons/Group/index.tsx`) и сейчас содержит четыре вкладки (`TITLES` в `src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/constants.ts`):

| Индекс | Вкладка | Иконка | Текущее состояние |
| --- | --- | --- | --- |
| 0 | Отбор | `SelectionTabIcon` | **Заглушка** — `<div key='filter'>Отбор</div>` |
| 1 | Сортировка | `SortingTabIcon` | **Заглушка** — `<div key='sort'>Сортировка</div>` |
| 2 | Условное оформление | `ConditionalRegistrationTabIcon` | Заглушка |
| 3 | Группировка | `GroupTabIcon` | Реализована |

Активная вкладка по умолчанию — `activeTab: 3` (`GroupSettingsWindow`). В state-объекте `IGroupingSettingsState` (`src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/types.ts`) уже описаны поля, общие для всех вкладок: `availableFields`, `selectedFields`, `expandedFolders`. Эти же поля логично переиспользовать для отбора.

Кнопка `Group` уже умеет загружать поля через `Api.fetchFieldsByObject(DataManager.metaOwner)` (`src/components/MetadataForms/Buttons/Group/index.tsx`, метод `loadFields`) и складывает их в `state.fields` с формой `{ field, name }`. Этот же источник полей должен использоваться и вкладкой «Отбор».

Требуется превратить заглушку вкладки «Отбор» в полноценный конструктор условий, опираясь на уже существующий инфраструктурный компонент `Mo.Inputs.StringBuilder` (`src/components/Mo/Inputs/StringBuilder/`) — интерактивный конструктор SQL-подобных условий с кнопками `+ Правило`, `+ Группа` и союзами `И`/`ИЛИ`.

---

### Ожидаемый результат

После выполнения задачи пользователь сможет прямо во вкладке «Отбор» окна настроек списка сформировать набор условий и применить их к списку метаданных.

**UX-конвенция и сроки реализации:**

1. **Конструктор условий** — UI вкладки «Отбор» строится на базе (или с UX-паттерном) `Mo.Inputs.StringBuilder`: правило = поле + оператор + значение; группа объединяет правила союзом `И`/`ИЛИ`; вложенность групп не ограничена (см. `src/components/Mo/Inputs/StringBuilder/README.md`).
2. **Источник полей** — список полей для отбора берётся из схемы метаданных, как в кнопке `Group`:
   ```ts
   const res = await Api.fetchFieldsByObject(DataManager.metaOwner);
   const fields = [
       ...res.registryFields ?? [],
       ...res.registryTableFields ?? [],
   ].map(el => ({ field: el.value, name: el.label }));
   ```
   Эти же `fields` прокидываются во вкладку «Отбор» (через props окна, состояние или контекст).
3. **Операторы сравнения** зависят от типа поля. Базовые типы проекта: `string`, `number`, `date`, `boolean` (по `src/helpers/comparator.ts` — `defaultComparatorForAllTypes`):
   - `string` → `=`, `≠`, `Содержит`, `Не содержит`, `Заполнено`, `Не заполнено`;
   - `number` → `=`, `≠`, `>`, `<`, `≥`, `≤`, `Заполнено`, `Не заполнено`;
   - `date` → `=`, `≠`, `>`, `<`, `≥`, `≤`;
   - `boolean` → `=`, `≠`.
4. **Сохранение условий** — состояние отбора хранится в `lite-react-statemanager` (singleton, см. `src/initState.js`), привязывается к идентификатору списка (`DataManager.metaOwner`). Ключ вида `listFilter__<metaOwner>` регистрируется в `userDataKeysDepended` (`src/settings/settings.js`) для корректного сброса при смене пользователя (по аналогии с `theme`, `assistant`, `backgroundImageHash`).
5. **Применение** — кнопка «Применить» в `<div className='settings-footer'>` (`GroupSettingsWindow`) пробрасывает собранные условия в API-запрос списка через `axios`/`src/helpers/axios.jsx`, `BACKEND_PROXY` из `src/settings/settings.js`.
6. **Сброс** — кнопка «Сбросить изменения» в `<div className='settings-footer'>` очищает сконструированный отбор до пустого.
7. **Совместимость** — реализация вкладки не ломает существующую вкладку «Группировка»: общий state `availableFields`/`selectedFields`/`expandedFolders` остаётся, либо выделяется в отдельный слот `selectionState`, чтобы не пересекаться с группировкой.

---

### Технические опорные точки в проекте

- **Окно настроек** — `src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/index.tsx`. Содержит классы `GroupSettingsWindow` и `Tabs`, `tabContent` (массив JSX по `activeTab`), общий `settings-footer` с кнопками «Сбросить изменения» и «Применить».
- **Заголовки вкладок и иконки** — `src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/constants.ts` (`TITLES`) и `src/components/MetadataForms/Buttons/Group/Icon/*` (`SelectionTabIcon`, `SortingTabIcon`, `ConditionalRegistrationTabIcon`, `GroupTabIcon`).
- **Кнопка-открыватель** — `src/components/MetadataForms/Buttons/Group/index.tsx`, методы `handleClick` (открывает окно через `$windows.open(<GroupSettingsWindow />)`) и `loadFields` (загружает поля через `Api.fetchFieldsByObject`).
- **Конструктор условий** — `src/components/Mo/Inputs/StringBuilder/` (`index.tsx`, `README.md`), `codeName: "StringBuilder"`, `main: "index.tsx"`.
- **Типы полей и компараторы** — `src/helpers/comparator.ts` (`defaultComparatorForAllTypes`, типы `string` / `number` / `date`).
- **Окна** — `src/components/ui/windows.helper.js` (`$windows.open/close` через `StateManager.setState({ windows: ... })`).
- **Состояние** — `src/initState.js`, `userDataKeysDepended` в `src/settings/settings.js`.
- **HTTP** — `src/helpers/axios.jsx`, `BACKEND_PROXY` из `src/settings/settings.js`.

---

### Критерии приёмки

1. В массиве `tabContent` (`GroupSettingsWindow`) индекс `0` возвращает полноценный UI конструктора условий вместо заглушки `<div>Отбор</div>`.
2. Список полей, доступных для отбора, формируется из `Api.fetchFieldsByObject(DataManager.metaOwner)` (тот же источник, что уже используется кнопкой `Group`).
3. Набор операторов зависит от типа поля согласно таблице выше.
4. Поддерживается произвольное количество правил и вложенных групп с союзами `И`/`ИЛИ`.
5. Кнопка «Применить» в `<div className='settings-footer'>` отправляет собранные условия в API списка.
6. Кнопка «Сбросить изменения» возвращает состояние отбора к пустому.
7. Сохранённые условия восстанавливаются после закрытия/открытия окна и после перезагрузки страницы (через `lite-react-statemanager` + `localStorage`, по аналогии с `markdelPages` из `src/initState.js`).
8. Новый ключ добавлен в `userDataKeysDepended` (`src/settings/settings.js`).
9. Вкладки «Группировка» и «Отбор» не конфликтуют по состоянию: либо используется раздельный state-слот, либо общий state расширен без потери обратной совместимости.
10. Добавлены unit/интеграционные тесты в `src/components/MetadataForms/Buttons/Group/GroupSettingsWindow/__tests__/` (Jest + Testing Library, конфигурация в `craco.config.js`).
11. Добавлена Storybook-история `*.stories.tsx` для вкладки (Storybook 7.6.19).
12. `npm run ts-check`, `npm run eslint`, `npm run prettier`, `npm run test:all` — без замечаний.
13. Покрытие не падает ниже существующих порогов (`collectCoverageFrom` исключает `*.d.ts`, `*.types.ts`, `*.type.ts`, `ui/`, `UIKit/`, `UiKitIcons/`, `Utils/`, `MetadataGuideList/`).
14. Глобальный `window.error`-листенер из `src/bootstrap.js` учтён: ошибки видны только в `console.error`.
