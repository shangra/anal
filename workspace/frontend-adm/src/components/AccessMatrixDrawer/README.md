# Модуль `AccessMatrixDrawer`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Архитектура](#architecture)
3. [Особенности применения](#apply-features)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Модуль `AccessMatrixDrawer` реализует выдвижную панель (Drawer) для редактирования прав доступа к объекту метаданных. Drawer содержит компонент `AccessMatrix` и открывается при необходимости изменить права доступа к выбранному узлу.

**Основные функции**:
- Открытие Drawer при клике на кнопку редактирования прав доступа
- Отображение компонента AccessMatrix внутри Drawer
- Управление открытием/закрытием Drawer
- Установка правильного zIndex для отображения поверх других элементов

## 2. Архитектура <a id="architecture" name="architecture"></a>

### Основные компоненты

```
AccessMatrixDrawer
    └─ Drawer (ui-kit Drawer)
        └─ AccessMatrix
```

### Используемые модули

| Модуль | Назначение |
|--------|------------|
| `StateManager` | Глобальное состояние для координации открытия Drawer |
| `Drawer` | Компонент выдвижной панели из ui-kit |
| `AccessMatrix` | Компонент матрицы прав доступа |

### Состояние компонента

```typescript
interface AccessMatrixState {
    nodeId: string | null;  // ID узла, для которого открывается редактор прав
    opened: boolean;        // Состояние открытости Drawer
}
```

### Инициализация

```javascript
componentDidMount(): void {
    StateManager.subscribeState({ nodeAccessId: { openNewNode: this.openNewNode } });
}

componentWillUnmount(): void {
    StateManager.unsubscribeState({ nodeAccessId: ['openNewNode'] });
}
```

Подписка на событие `nodeAccessId` в StateManager позволяет другим компонентам (например, `EditAccessAction`) открывать Drawer.

### Открытие Drawer (`openNewNode`)

```javascript
openNewNode(state: { nodeAccessId: string }): void {
    this.setState(
        {
            nodeId: state.nodeAccessId,
            opened: true,
        },
        () => {
            const drawerElement = document.querySelector('.access-matrix-drawer');
            if (drawerElement) {
                drawerElement.parentElement!.style.zIndex = '10011';
            }
        }
    );
}
```

Алгоритм:
1. Сохраняет ID узла в состояние
2. Открывает Drawer (`opened: true`)
3. Устанавливает `zIndex = 10011`  родительскому элементу для правильного отображения поверх других элементов

### Закрытие Drawer (`onDrawerClose`)

```javascript
onDrawerClose(opened: boolean) {
    this.setState({ opened });
}
```

### Рендеринг

```javascript
render() {
    return (
        <Drawer
            position="right"
            opened={this.state.opened}
            title="Редактирование доступа"
            onSetOpen={this.onDrawerClose}
            width="500px"
            classNames="access-matrix-drawer"
            lockScroll
        >
            {this.state.nodeId ? <AccessMatrix id={this.state.nodeId} /> : null}
        </Drawer>
    );
}
```

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>

### Props компонента

Компонент не принимает props, он полностью управляется через StateManager.

### Интеграция с EditAccessAction

Компонент открывается при клике на кнопку редактирования прав доступа:

```javascript
// actions/editAccess/index.tsx
export const EditAccessAction = ({ server, node }: IProps) => {
    const handleEditAccess = useCallback(() => {
        StateManager.setState({
            nodeAccessId: nodeFromStore?.id,
        });
    }, [nodeFromStore]);
    
    return <IconButton icon={AccessLockIcon} onClick={handleEditAccess} />;
};
```

При вызове `StateManager.setState({ nodeAccessId: ... })` сработает подписка в `AccessMatrixDrawer`.

### События StateManager

#### Публикация события

```javascript
// Открытие Drawer
StateManager.setState({ nodeAccessId: nodeId });

// Где nodeId - ID объекта метаданных
```

#### Подписка на событие

```javascript
componentDidMount(): void {
    StateManager.subscribeState({ nodeAccessId: { openNewNode: this.openNewNode } });
}
```

### Стили

CSS класс `access-matrix-drawer` используется для стилизации Drawer и установки zIndex.

### Особенности

1. **Один Drawer** - в один момент открыт только один Drawer редактирования прав
2. **Позиция** - Drawer открывается справа (`position="right"`)
3. **Ширина** - 500px
4. **Блокировка прокрутки** - `lockScroll` предотвращает прокрутку страницы при открытом Drawer
5. **zIndex** - устанавливается в 10011 для отображения поверх других окон

## Пример использования

Компонент `AccessMatrixDrawer` добавляется в корневые компоненты приложения:

```javascript
// rootComponents.js
import { AccessMatrixDrawer } from 'components/AccessMatrixDrawer';

rootComponents: [
    // ... другие компоненты
    AccessMatrixDrawer,
]
```

### Порядок действий пользователя

1. Пользователь переходит в дерево метаданных (`MetadataHier`)
2. Выбирает узел
3. Нажимает на кнопку редактирования прав доступа (иконка замка)
4. `EditAccessAction` устанавливает `nodeAccessId` в StateManager
5. `AccessMatrixDrawer` реагирует и открывает Drawer
6. Пользователь редактирует права через `AccessMatrix`
7. При закрытии Drawer сбрасывает `nodeAccessId`

## Управление извне

Other компоненты могут открывать Drawer через:

```javascript
import StateManager from 'lite-react-statemanager';

// Открыть Drawer для конкретного узла
StateManager.setState({ nodeAccessId: 'uuid-узла' });

// Закрыть Drawer (установить null или undefined)
StateManager.setState({ nodeAccessId: null });
```

## Очистка ресурсов

```javascript
componentWillUnmount(): void {
    StateManager.unsubscribeState({ nodeAccessId: ['openNewNode'] });
}
```

При размонтировании компонент отписывается от событий StateManager, предотвращая утечки памяти.

---

## TODO и доработки
- [ ] **Тесты**: Добавить юнит и интеграционные тесты