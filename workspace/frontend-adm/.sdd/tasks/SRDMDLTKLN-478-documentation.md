## Задача SRDMDLTKLN-478: Документация для разработчиков и пользователей компонента MetadataWindow

### 1. Контекст и модель публикации

Компонент `MetadataWindow` реализует окно выбора сервера метаданных для открытия соответствующего дерева. Это панель управления, позволяющая пользователю выбрать, какой сервер метаданных открыть в интерфейсе.

Компонент расположен в `src/components/MetadataWindow/`, экспортируется через Module Federation (`ADMINPANEL_UI_COMPONENTS`), доступен для встраивания в host-приложения через `./MetadataWindow`.

### 2. Аудитория и результаты

Документация пишется для двух аудиторий:

#### A. `docs/developer-guide.md` — для разработчика админ-панели (внутренняя)

Аудитория — frontend-разработчики команды SREDA, ведущие `frontend-admin`. Описывает, как устроен компонент, как он работает, какие пропсы принимает, как его изменить.

#### B. `docs/integration-guide.md` — для разработчика host-приложения (внешняя)

Аудитория — frontend-разработчик потребительского сервиса, который встраивает `MetadataWindow` в свой фронтенд через MF. Описывает, как подключить, какие пропсы передавать, как обрабатывать состояния.

### 3. Содержание

#### 3.1. Назначение компонента

Компонент `MetadataWindow` — окно выбора сервера метаданных для открытия соответствующего дерева в интерфейсе админ-панели. Основные функции:
- Отображение списка доступных серверов (загружаются с `GET /systemsettings/servers/info`);
- Открытие дерева метаданных для выбранного сервера в отдельном окне слева;
- Управление открытыми окнами деревьев (множественные деревья для разных серверов);
- Закрытие всех окон при размонтировании компонента;
- **Сохранение списка открытых серверов в `localStorage`** — при перезагрузке страницы восстанавливаются открытые окна;
- **Аккордеон "Недоступные сервера"** — отображает сервера из пропса `serverList`, которых нет на бэке.

#### 3.2. Структура директории

```
src/components/MetadataWindow/
├── index.tsx              — основной компонент
├── SimpleModal.tsx         — модальное окно выбора сервера
├── savedServers.helper.ts  — хелпер для localStorage
├── md-window.module.css    — стили
├── README.md               — документация
└── __tests__/
    └── ...                  — тесты
```

#### 3.3. Пропсы и состояние

**Пропсы:**

```typescript
interface IProps {
    children: ReactNode;      // Содержимое, для которого открывается окно
    serverList: string[];     // Эталонный список серверов (из host-приложения или конфига)
}
```

**Состояние:**

```typescript
interface IState {
    settingUUID: string;               // UUID окна иконки настройки
    openedModal: boolean;              // Открыто ли модальное окно выбора сервера
    openedTree: Map<string, string>;  // Map<имя сервера, uuid окна дерева>
    serverList: string[];              // Список серверов с бэка
    unavailableServers: string[];      // Сервера из props, которых нет на бэке
    collapsedUnavailable: boolean;     // Свёрнут ли аккордеон
}
```

#### 3.4. Порядок инициализации

1. **Монтирование** — открывается иконка управления слева (`ControllIcon`).
2. **Проверка `localStorage`**:
   - Если в `localStorage` есть сохранённые серверы — `openedModal: false`, ждём загрузку с бэка;
   - Если нет — `openedModal: true`, сразу показываем модальное окно с `Loader`.
3. **Загрузка с бэка** (`GET /systemsettings/servers/info`):
   - Получаем список имён серверов;
   - Вычисляем разницу между `props.serverList` и ответом бэка (без учёта регистра);
   - Сервера, которые есть в пропсах, но не вернул бэк, попадают в `state.unavailableServers`.
4. **Восстановление сохранённых** (`restoreSavedServers`):
   - Для каждого сохранённого сервера проверяем, есть ли он в загруженном списке;
   - Если сервер недоступен — удаляем из `localStorage` и добавляем в `unavailableServers`;
   - Открываем доступные сохранённые серверы;
   - Если ни один сервер не восстановлен — `openedModal: true`.

#### 3.5. Логика открытия дерева

```typescript
private openTree = (name: string): void => {
    const existingUUID = this.state.openedTree.get(name);
    if (existingUUID) {
        $windows.focus(existingUUID);
        this.closeModal();
        return;
    }
    saveServer(name);
    // ...
    $windows.open(name, <MetadataHier server={name} />, { ... });
    this.setState(prev => ({
        openedTree: new Map(prev.openedTree).set(name, uuid),
    }));
    this.closeModal();
};
```

Особенности:
- **Предотвращение дублирования** — если окно уже открыто, просто активируем его;
- **Автоматическая очистка** — при размонтировании все окна закрываются.

#### 3.6. Рендер

```typescript
render(): ReactNode {
    const isLoading = this.state.serverList.length === 0;
    return (
        <SimpleModal opened={this.state.openedModal} onClose={this.closeModal} title="Сервера">
            {isLoading ? (
                <div className={style.loaderContainer}>
                    <Loader />
                </div>
            ) : (
                <>
                    <div className={style.servers}>
                        {this.state.serverList.filter(name => !this.state.openedTree.has(name)).map(name => (
                            <p key={name} onClick={() => this.openTree(name)}>{name}</p>
                        ))}
                    </div>
                    {this.state.unavailableServers.length > 0 && (
                        <div className={style.unavailableBlock}>
                            <div>Недоступные сервера ({this.state.unavailableServers.length})</div>
                            {!this.state.collapsedUnavailable && (
                                <div>{this.state.unavailableServers.map(name => (<p>{name}</p>))}</div>
                            )}
                        </div>
                    )}
                </>
            )}
        </SimpleModal>
    );
}
```

#### 3.7. Зависимости

- `react` — основной фреймворк;
- `$windows` — helper управления окнами (`src/ui/windows.helper`);
- `$message` — флеш-сообщения (`src/ui/message.helper`);
- `ui-kit` — `ControllIcon`, `DropDownIcon`, `DropUpIcon`, `Loader`;
- `SimpleModal` — модальное окно выбора сервера;
- `MetadataHier` — дерево метаданных для выбранного сервера;
- `uuid` — генерация идентификаторов окон;
- `axios` (`$api`) — HTTP-запросы к бэку;
- `savedServers.helper` — работа с `localStorage`.

#### 3.8. Тестирование

- Jest + React Testing Library;
- Тесты в `__tests__/` (Jest);
- Моки стилей (`identity-obj-proxy`), моки `$windows` и `$api`;
- `npm test` / `npm run test:all`.

#### 3.9. Изменение компонента

1. Изменить `index.tsx` — обновить логику, пропсы, рендер;
2. Обновить `README.md` — отразить изменения в пропсах и поведении;
3. Обновить тесты в `__tests__/`;
4. Проверить `npm run ts-check`, `npm run test:all`, `npm run lint`.

### 4. Содержание `src/components/MetadataWindow/docs/integration-guide.md`

#### 4.1. Что такое `MetadataWindow`

Компонент `MetadataWindow` — окно выбора сервера метаданных, экспортируемое через `./MetadataWindow` из `ADMINPANEL_UI_COMPONENTS`.

Подключается через `React.lazy(() => import('AdminPanel/MetadataWindow'))`.

#### 4.2. Пропсы

```typescript
interface MetadataWindowProps {
    children: ReactNode;      // Содержимое (опционально)
    serverList: string[];     // Эталонный список серверов
}
```

#### 4.3. Состояние компонента

- `openedModal` — `true`, если модальное окно открыто;
- `serverList` — список серверов, загруженных с бэка;
- `unavailableServers` — сервера из `serverList`, которых нет на бэке;
- `openedTree` — `Map<имя сервера, UUID>` открытых окон.

#### 4.4. Обязательные ENV

| Переменная | Значение |
| --- | --- |
| `PUBLIC_URL` | Префикс `BrowserRouter` (basename) |

#### 4.5. Подключение

```javascript
// craco.config.js
new ModuleFederationPlugin({
    name: 'HostContainer',
    remotes: {
        AdminPanel: 'ADMINPANEL_UI_COMPONENTS@https://<host>/remoteEntry.js',
    },
    shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
    },
});
```

```jsx
const MetadataWindow = React.lazy(() => import('AdminPanel/MetadataWindow'));

<MetadataWindow serverList={['mdm', 'analytics']}>
    {/* дети */}
</MetadataWindow>
```

#### 4.6. Версионирование

- Мажорные версии контракта — в `ADMINPANEL_UI_COMPONENTS@<version>/remoteEntry.js`;
- Перед bump — проверить changelog.

### 5. Чек-лист перед PR

- [ ] `index.tsx` — все пропсы задокументированы;
- [ ] `README.md` — актуален;
- [ ] `npm run ts-check` — без ошибок;
- [ ] `npm run test:all` — зелёный;
- [ ] `npm run lint` — без замечаний;
- [ ] Storybook-история (если нужно).

### 6. Связанные источники

- `src/components/MetadataWindow/index.tsx` — код;
- `src/components/MetadataWindow/SimpleModal.tsx` — модальное окно;
- `src/components/MetadataWindow/savedServers.helper.ts` — localStorage;
- `src/components/MetadataWindow/md-window.module.css` — стили;
- `src/ui/windows.helper` — управление окнами;
- `src/components/MetadataHier` — дерево метаданных;
- `ui-kit` — `ControllIcon`, `Loader`;
- `craco.config.js` — реестр MF-экспорта;
- `package.json` — зависимости.