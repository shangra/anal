# Модуль `MetadataWindow`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Архитектура](#architecture)
3. [Особенности применения](#apply-features)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Модуль `MetadataWindow` реализует окно выбора сервера метаданных для открытия соответствующего дерева. Это окно представляет собой панель управления, позволяющую пользователю выбрать, какой сервер метаданных открыть в интерфейсе.

**Основные функции**:
- Отображение списка доступных серверов
- Открытие дерева метаданных для выбранного сервера в отдельном окне слева
- Управление открытыми окнами деревьев
- Закрытие всех окон при размонтировании компонента
- **Сохранение списка открытых серверов в localStorage** — при перезагрузке страницы восстанавливаются открытые окна
- **Аккордеон "Недоступные сервера"** — отображает сервера из пропса `serverList`, которых нет на бэке

## 2. Архитектура <a id="architecture" name="architecture"></a>

### Основные компоненты

```
MetadataWindow
    └─ SimpleModal (окно выбора сервера)
    └─ MetadataHier (дерево метаданных для выбранного сервера)
    └─ savedServers.helper (localStorage — сохранение списка серверов)
```

### Используемые модули

| Модуль | Назначение |
|--------|------------|
| `$windows` | Helper для управления окнами приложения |
| `$message` | Флеш-сообщения для оповещения о недоступных серверах |
| `ControllIcon` | Иконка управления (управление окном) |
| `SimpleModal` | Простое модальное окно |
| `MetadataHier` | Компонент иерархии метаданных |
| `savedServers.helper` | Хелпер для работы с `localStorage` |

### Состояние компонента

```typescript
interface IState {
    settingUUID: string;               // ID окна иконки настройки
    openedModal: boolean;              // Открыто ли модальное окно выбора сервера
    openedTree: Map<string, string>;  // Map<имя сервера, uuid окна дерева>
    serverList: string[];              // Список серверов, загруженных с бэка
    unavailableServers: string[];      // Сервера, которые есть в props, но нет на бэке
    collapsedUnavailable: boolean;      // Свёрнут ли аккордеон недоступных серверов
}
```

### Порядок инициализации

1. При монтировании компонент открывает **иконку управления** слева
2. Загружает список серверов с `GET /systemsettings/servers/info`
3. Сравнивает `props.serverList` с загруженным списком — сервера, которых нет на бэке, попадают в `unavailableServers`
4. Если есть сохранённые серверы в `localStorage` — восстанавливает их
5. Если ни один сервер не восстановлен — показывает модальное окно выбора

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>

### Props компонента

```typescript
interface IProps {
    children: ReactNode;      // Содержимое, для которого открывается окно
    serverList: string[];     // Список доступных серверов (эталонный)
}
```

### Обработка закрытия дерева

```javascript
private handleTreeClose = (name: string, uuid: string) => {
    this.setState(prevState => ({
        openedTree: new Map(prevState.openedTree).delete(name),
    }));
    removeServer(name);          // Удаляем из localStorage
    $windows.removeRegistry(uuid);
};
```

### Открытие дерева

```javascript
private openTree = (name: string): void => {
    const existingUUID = this.state.openedTree.get(name);
    if (existingUUID) {
        $windows.focus(existingUUID);
        this.closeModal();
        return;
    }
    saveServer(name);             // Сохраняем в localStorage
    const server = name.toLowerCase() ?? '';
    const uuid = v4();
    $windows.open(
        name,
        <div style={{ height: '100%' }}>
            <MetadataHier server={server} actions={[]} />
        </div>,
        { uuid, position: 'left', isMinimized: false, onClose: () => this.handleTreeClose(name, uuid) },
    );
    this.setState(prevState => ({
        openedTree: new Map(prevState.openedTree).set(name, uuid),
    }));
    this.closeModal();
};
```

### Восстановление сохранённых серверов

```typescript
private restoreSavedServers(availableServers: string[]): void {
    const saved = getSavedServers();
    if (saved.length === 0) return;

    const available: string[] = [];
    const unavailable: string[] = [];

    for (const name of saved) {
        if (availableServers.includes(name)) {
            available.push(name);
        } else {
            unavailable.push(name);
            removeServer(name);
            $message.show(`Сервер ${name} недоступен`);
        }
    }

    this.setState({ unavailableServers: unavailable });
    available.forEach(name => this.openTree(name));
    if (available.length === 0) this.setState({ openedModal: true });
}
```

### Компонент SimpleModal

```typescript
<SimpleModal opened={this.state.openedModal} onClose={this.closeModal} title="Сервера">
    <div className={style.servers}>
        {this.state.serverList?.filter(name => !this.state.openedTree.has(name)).map(name => (
            <p key={name} onClick={() => this.openTree(name)} className={style.servers_item}>
                {name}
            </p>
        ))}
    </div>
    {this.state.unavailableServers.length > 0 && (
        <div className={style.unavailableBlock}>
            <div className={style.unavailableHeader} onClick={this.toggleUnavailable}>
                <p>Недоступные сервера ({this.state.unavailableServers.length})</p>
                <span>▼</span>
            </div>
            {!this.state.collapsedUnavailable && (
                <div>{this.state.unavailableServers.map(name => (<p>{name}</p>))}</div>
            )}
        </div>
    )}
</SimpleModal>
```

## Пример использования

```javascript
import { MetadataWindow } from 'components/MetadataWindow';

<MetadataWindow
    serverList={['mdm', 'analytics', 'reports', 'mssql']}
>
    {/* Другие компоненты */}
</MetadataWindow>
```

## Особенности

1. **Множественные деревья** — можно одновременно открыть несколько деревьев для разных серверов
2. **Предотвращение дублирования** — при повторном выборе уже открытого сервера окно просто активируется
3. **Автоматическая очистка** — при размонтировании все открытые окна закрываются
4. **Сохранение в localStorage** — открытые серверы сохраняются между сессиями
5. **Аккордеон недоступных** — сервера, отсутствующие на бэке, отображаются в свёрнутом списке