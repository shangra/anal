# Модуль `TreeCMP`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Архитектура](#architecture)
3. [Особенности применения](#apply-features)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Модуль `TreeCMP` реализует компонент отображения иерархического дерева с поддержкой поиска, раскрытия/сворачивания узлов и кликов по элементам. Это универсальный компонент для отображения любых иерархических данных.

**Основные функции**:
- Отображение иерархического дерева
- Поиск узлов по имени
- Раскрытие/сворачивание узлов
- Обработка кликов по узлам
- Интеграция с ui-kit TreeControlled
- Отображение действий над узлами

## 2. Архитектура <a id="architecture" name="architecture"></a>

### Основные компоненты

```
TreeCMP (контейнер)
    ├─ actions (кнопки действий над узлом)
    ├─ Input (поле поиска)
    └─ TreeControlled (ui-kit компонент дерева)
```

### Используемые модули

| Модуль | Назначение |
|--------|------------|
| `Input` | Поле ввода для поиска |
| `TreeControlled` | Компонент дерева из ui-kit |
| `searchFn` | Функция поиска узлов |
| `MetadataHier/lib/service.ts` | Сервисные функции (включая searchFn) |

### Состояние компонента

```typescript
interface IState {
    searchValue: string;  // Текст поиска
}
```

### Props компонента

```typescript
interface IProps {
    server: string;                           // Имя сервера (для поиска)
    current: FlatTreeNode[];                  // Текущие выбранные узлы (включая multi-select)
    data: FlatTreeNode[];                     // Данные дерева в формате FlatTreeNode
    actions?: (nodes: FlatTreeNode[]) => ReactNode;  // Компоненты действий
    onNodeClick: (node: TreeDataControlled) => void;           // Callback при клике на узел
    onNodeExpand: (node: TreeDataControlled) => void;          // Callback при раскрытии узла
    expandedNodes: string[];                  // Массив ID раскрытых узлов
}
```

### Обработка поиска

```javascript
private onSearch = (value: string) => this.setState({ searchValue: value });

private onInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    this.setState({ searchValue: e.target.value });

private search = (_data: unknown, value: string): FlatTreeNode[] =>
    searchFn(this.props.server, value);
```

Алгоритм поиска (`searchFn`):
1. Преобразует запрос в нижний регистр
2. Ищет совпадения по имени узла
3. Автоматически разворачивает путь к найденным узлам
4. Возвращает отфильтрованный массив узлов

## 3. Особенности применения <a id="apply-features" name="apply-features"></a>

### Инициализация

```javascript
constructor(props: IProps) {
    super(props);
    this.state = { searchValue: '' };
}
```

### Рендеринг

```javascript
render() {
    const { current, data, actions, expandedNodes, onNodeClick, onNodeExpand } = this.props;

    return (
        <div style={TreeCMP.rootStyle}>
            {/* Блок действий */}
            {actions && actions(current)}

            {/* Поле поиска */}
            <Input
                style={TreeCMP.inputStyle}
                value={this.state.searchValue}
                onChange={this.onInputChange}
                variant="outlined"
                placeholder="Поиск..."
            />

            {/* Дерево */}
            <TreeControlled
                data={data}
                expandedNodes={expandedNodes}
                onNodeExpand={onNodeExpand}
                onNodeClick={onNodeClick}
                maxLevel={10}
                style={TreeCMP.treeStyle}
                fallback={<p>Ничего не найдено</p>}
                searchValue={this.state.searchValue}
                onSearch={this.onSearch}
                searchFn={this.search}
            />
        </div>
    );
}
```

### Интеграция с MetadataHier

`TreeCMP` используется как компонент отображения в `MetadataHier`:

```javascript
// MetadataHier/index.tsx
<TreeCMP
    server={server}
    expandedNodes={[...expandedIds]}
    onNodeExpand={this.onExpand}
    onNodeClick={this.onClick}
    current={getSelectedFlatNodes(server)}
    data={treeData}
    actions={this.renderActions}
/>
```

### Компонент действий

Компонент `actions` отображается над деревом и содержит кнопки действий над узлом.
В `MetadataHier` он получает массив `FlatTreeNode[]` (один или несколько выделенных
узлов). Переключатель «множ. выбор» рендерится всегда, а блок кнопок действий
отображается только при наличии выделенных узлов — каждое действие само решает,
поддерживает ли оно multi-select:

```javascript
private renderActions = (nodes: FlatTreeNode[]): ReactNode => {
    const { server } = this.props;
    const { multiSelectMode } = this.state;

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {nodes?.length ? (
                    <MetadataHierActions
                        actions={[
                            Actions.ADD,
                            Actions.SORT,
                            Actions.DELETE,
                            Actions.EDIT_ACCESS,
                            Actions.UPDATE,
                            Actions.OPEN_FILE_MANAGER,
                        ]}
                        nodes={nodes}
                    />
                ) : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Switch checked={multiSelectMode} onChange={() => toggleMultiSelectMode(server)} />
                множ. выбор
            </div>
        </div>
    );
};
```

### Поиск в дереве

```javascript
private search = (_data: unknown, value: string): FlatTreeNode[] =>
    searchFn(this.props.server, value);
```

Функция `searchFn` (из `MetadataHier/lib/service.ts`):
```javascript
export const searchFn = (server: string, term: string): FlatTreeNode[] => {
    const t = term.toLowerCase().trim();
    const { nodes, rootId, expandedIds, selectedIds } = readScope(server);
    
    if (!t || !rootId) return [];
    
    // Логика поиска: поиск по имени, раскрытие путей и т.д.
    // ...
}
```

### Особенности TreeControlled

Компонент `TreeControlled` из ui-kit поддерживает:
- `data` - данные в формате FlatTreeNode
- `expandedNodes` - массив раскрытых узлов
- `onNodeExpand` - callback при раскрытии/сворачивании
- `onNodeClick` - callback при клике на узел
- `maxLevel` - максимальный уровень вложенности
- `fallback` - отображается при пустом результате
- `searchValue` - значение поиска
- `onSearch` - callback при изменении поискового запроса
- `searchFn` - функция фильтрации узлов

## Примеры использования

### Базовое дерево

```javascript
<TreeCMP
    server="mdm"
    current={[]}
    data={treeData}
    expandedNodes={expandedIds}
    onNodeExpand={handleExpand}
    onNodeClick={handleClick}
/>
```

### Дерево с действиями

```javascript
<TreeCMP
    server="mdm"
    current={selectedNodes}
    data={treeData}
    expandedNodes={expandedIds}
    actions={(nodes) => (
        <div className="tree-actions">
            <IconButton icon={PlusIcon} onClick={() => handleAdd(nodes)} />
            <IconButton icon={EditIcon} onClick={() => handleEdit(nodes)} />
            <IconButton icon={DeleteIcon} onClick={() => handleDelete(nodes)} />
        </div>
    )}
    onNodeExpand={handleExpand}
    onNodeClick={handleClick}
/>
```

### Интеграция с MetadataHier

```javascript
import { TreeCMP } from 'components/TreeCMP';
import { MetadataHierActions, Actions } from 'components/MetadataHier/actions';

<TreeCMP
    server={server}
    expandedNodes={[...expandedIds]}
    onNodeExpand={this.onExpand}
    onNodeClick={this.onClick}
    current={getSelectedFlatNodes(server)}
    data={treeData}
    actions={this.renderActions}
/>
```

## Основные методы

### onSearch

```javascript
private onSearch = (value: string) => this.setState({ searchValue: value });
```

Обновляет состояние поиска и передает значение в TreeControlled.

### onInputChange

```javascript
private onInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    this.setState({ searchValue: e.target.value });
```

Обработчик изменения текста в поле поиска.

### search

```javascript
private search = (_data: unknown, value: string): FlatTreeNode[] =>
    searchFn(this.props.server, value);
```

Вызывает функцию поиска из MetadataHier/lib/service.ts для фильтрации узлов.

## Вспомогательные функции

### searchFn (из MetadataHier/lib/service.ts)

Функция выполняет поиск узлов по имени:

1. Преобразует запрос в нижний регистр
2. Ищет совпадения в именах узлов
3. Строит множество `matched` - найденные узлы
4. Строит множество `show` - узлы, которые нужно показать (включая родителей)
5. Строит множество `expanded` - узлы, которые нужно раскрыть
6. Возвращает отфильтрованный массив FlatTreeNode

```javascript
export const searchFn = (server: string, term: string): FlatTreeNode[] => {
    // Логика поиска
    // ...
    return buildFlatFromMap(rootId, nodes, expanded, selectedIds, server).filter((n) => show.has(n.id));
};
```

## Особенности

1. **Максимальная глубина** - `maxLevel={10}` ограничивает вложенность
2. **Fallback сообщение** - при пустом результате отображается "Ничего не найдено"
3. **Высота дерева** - вычисляется как `calc(100% - 64px)` (высота блока действий и поиска)
4. **Синхронизация** - состояние поиска синхронизируется через `searchFn` и `onSearch`
5. **Гибкость** - компонент принимает любые данные в формате FlatTreeNode из ui-kit
---

## TODO и доработки

- [ ] **Тесты**: Добавить юнит и интеграционные тесты