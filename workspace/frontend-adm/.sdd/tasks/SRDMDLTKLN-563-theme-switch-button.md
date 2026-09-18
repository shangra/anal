# SRDMDLTKLN-563 — Кнопка переключения темы в левом сайдбаре

## Цель

Реализовать переключатель тем «Светлая / Тёмная / Галактика / Авто» внутри существующего механизма `ThemeSwitchAgent` и добавить его в левый сайдбар `WindowsCMP` рядом с кнопкой `MetadataWindow`.

## Архитектурный контекст

- **`ThemeSwitchAgent`** (`src/components/ThemeSwitchAgent/index.tsx`) — корневой компонент, оборачивающий приложение в `<ThemeProvider>`. Подписывается на `StateManager.state.theme.subTheme` и применяет соответствующую тему (`DARK_THEME` / `LIGHT_THEME` / `GALAXY_THEME`, с учётом `prefers-color-scheme` для режима `auto`).
- **Механика публикации темы** уже была реализована: любой компонент может вызвать `StateManager.setState({ theme: { theme: 'light' | 'dark' | 'galaxy' | 'auto' } })`, и `ThemeSwitchAgent` подхватит изменение.
- **Левая кнопка «Настройки»** в `WindowsCMP` создаётся компонентом `MetadataWindow` через `$windows.open(<ControllIcon ... />, null, { position: PanelPosition.left, type: 'setting' })`. Этот же механизм (`type: 'setting'`) отрисовывается в `Sidebar` отдельным блоком `.settingButton`, минуя обычный `Tab`.
- **`StateManager`** (`lite-react-statemanager`) хранит единственное значение для каждого ключа: при `setState({ windows: payload })` подписчикам отправляется только последнее значение. Если подписчик подписывается **после** серии `setState`, ему через `subscribeState`-replay отправляется только последнее значение — **промежуточные события теряются**.

## Что было сделано

### 1. Расширение `ThemeSwitchAgent`

**`src/components/ThemeSwitchAgent/types.ts`** — добавлено поле `themeUUID: string` и `isPopoverOpened: boolean` в `ThemeSwitchAgentState`.

**`src/components/ThemeSwitchAgent/index.tsx`** — добавлена регистрация окна в `WindowsCMP` через `$windows.open`:

- `componentDidMount`: `$windows.open(<Popover ...>...</Popover>, null, { position: PanelPosition.left, type: 'setting' })`. UUID сохраняется в `state.themeUUID`.
- `componentWillUnmount`: `$windows.close(state.themeUUID)`.
- Контент поповера — вертикальный стек из четырёх кнопок «Светлая», «Тёмная», «Галактика», «Авто». Клик публикует тему через `StateManager.setState({ theme: { theme } })` и закрывает поповер.
- Триггер поповера — `<IconButton icon={EditIcon} size="small" variant="text" color="controlled" />` с `onMouseDown={e => e.stopPropagation()}` (иначе клик перехватывается `WindowsCMP` как drag-start).

### 2. Итерация: Dropdown → Popover + IconButton

Первая реализация использовала `<Dropdown>` с надписью «Тема» и `leftIcon={EditIcon}`. Выяснилось, что в узком левом сайдбаре текстовая кнопка `Dropdown` выглядит громоздко, поэтому был выполнен переход на компактную связку:

- `<Popover opened={...} onOpened={...} placement="right-start" offset={4} closeOnOutsideClick>` с контентом в виде `<Button variant="text" fullWidth>` для каждой темы.
- В качестве триггера — `<IconButton icon={EditIcon}>` 32×32, который укладывается в существующий 32×32-слот `.settingButton`.

У `Popover` из `ui-kit` нет `onClose` — есть только `onOpened?: (open: boolean) => void`, поэтому добавлен единый обработчик `handlePopoverOpened(open)` с защитой от лишних `setState`.

### 3. Исправление отображения нескольких `setting`-кнопок

В `src/components/WindowsCMP/components/Sidebar/index.tsx` ветка `type === 'setting'` в `windows.map` возвращала `<div>...</div>` **без prop `key`**. Из-за этого React не различал соседние `setting`-блоки и при reconcile оставлял только первый, фактически отрисовывая одну кнопку вместо двух.

Исправление: добавлен `key={key}` на корневой `<div>` блока `setting`-ветки.

```tsx
{windows.map(({ key, title, type }) => {
    if (type === 'setting') {
        return (
            <div key={key}>
                <div className={style.settingButton}>{title}</div>
                <hr style={{ margin: '8px -8px 0' }} />
            </div>
        );
    }
    return <Tab title={title} position={position} key={key} ... />;
})}
```

## Изменённые файлы

| Файл | Изменения |
|---|---|
| `src/components/ThemeSwitchAgent/index.tsx` | Регистрация окна в `WindowsCMP`, реализация UI (Popover + IconButton), обработчики выбора темы. |
| `src/components/ThemeSwitchAgent/types.ts` | Расширение `ThemeSwitchAgentState`: добавлены `themeUUID` и `isPopoverOpened`. |
| `src/components/WindowsCMP/components/Sidebar/index.tsx` | Добавлен `key={key}` на блок `setting`-ветки для корректного reconcile нескольких `setting`-окон. |

## Проверка

- `npx tsc --noEmit` — без новых ошибок во всех изменённых файлах.
- Визуально (после `npm start` и перехода на `/adminpanel`) в левом sidebar должно быть две кнопки в блоке `.settingButton` друг под другом:
  1. `ControllIcon` (от `MetadataWindow`) — открывает модал выбора сервера.
  2. `IconButton` с `EditIcon` (от `ThemeSwitchAgent`) — открывает popover вправо со списком «Светлая / Тёмная / Галактика / Авто».
- Выбор темы в поповере закрывает его и применяет соответствующую тему через `<ThemeProvider>`.
