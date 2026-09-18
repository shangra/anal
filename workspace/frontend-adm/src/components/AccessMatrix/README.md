# Модуль `AccessMatrix`

## Содержание

1. [Применение и функционал](#component-purpose)
2. [Архитектура](#architecture)
3. [Типы данных](#data-types)
4. [Особенности применения](#apply-features)

## 1. Применение и функционал <a id="component-purpose" name="component-purpose"></a>

Модуль `AccessMatrix` реализует матрицу прав доступа для объекта метаданных. Компонент отображает и позволяет управлять правами доступа для пользователей, ролей, групп и правил.

**Основные функции**:
- Отображение прав доступа (чтение, просмотр, запись, удаление)
- Переключение между группами: Полномочия, Пользователи, Роли, Права, Группы
- Режим просмотра (кто имеет доступ) и редактирования (кому выдать доступ)
- Пагинация списков
- Сворачивание/разворачивание блоков для Полномочий
- Интеграция с RLS (Row-Level Security) через API

## 2. Архитектура <a id="architecture" name="architecture"></a>

### Основные компоненты

```
AccessMatrix
    ├─ Tabs: typeOptions (Чтение, Просмотр, Запись, Удаление)
    ├─ Tabs: groupTabs (Полномочия, Пользователи, Роли, Права, Группы)
    ├─ Tabs: editTabs (Доступ выдан, Редактировать) - только для групп
    ├─ PermissionBlock (для группы 'permissions')
    └─ AccessList (для групп 'users', 'roles', 'rules', 'groups')
```

### Используемые модули

| Модуль | Назначение |
|--------|------------|
| `$api` | HTTP клиент для API запросов к RLS |
| `$modal` | Helper для модальных окон |
| `ErrorBoundary` | Обработка ошибок рендеринга |
| `components/AccessList` | Компонент списка доступа |
| `components/PermissionBlock` | Компонент блока прав доступа |
| `network/accessApi.ts` | API функции для работы с доступом |

### Состояние компонента

```typescript
interface AccessMatrixState {
    currentGroup: AccessGroup;      // Текущая выбранная группа ('permissions' | 'users' | 'roles' | 'rules' | 'groups')
    currentType: AccessType;        // Текущий тип прав ('read' | 'view' | 'write' | 'delete')
    accessData: Record<AccessGroup, any>;      // Данные доступа для текущих групп
    allItemsData: Record<AccessGroup, any>;    // Все доступные элементы для выбора
    loading: boolean;               // Индикатор загрузки
    error: string | null;           // Ошибка при загрузке
    collapsedBlocks: Record<string, boolean>;  // Состояние сворачивания блоков
    isEditing: boolean;             // Режим редактирования (выбор кого добавить)
    currentEditTab: number;         // Индекс активного таба редактирования
    pagination: Record<AccessGroup, { offset: number; limit: number }>;  // Пагинация
    isListLoading: boolean;         // Индикатор загрузки списка элементов
}
```

### Константы

#### typeOptions - типы прав

```typescript
[
    { label: 'Чтение', value: 'read' },
    { label: 'Просмотр', value: 'view' },
    { label: 'Запись', value: 'write' },
    { label: 'Удаление', value: 'delete' },
]
```

#### groupTabs - группы элементов

```typescript
[
    { label: 'Полномочия', value: 'permissions' },
    { label: 'Пользователи', value: 'users' },
    { label: 'Роли', value: 'roles' },
    { label: 'Права', value: 'rules' },
    { label: 'Группы', value: 'groups' },
]
```

#### editTabs - табы редактирования

```typescript
[
    { label: 'Доступ выдан', value: 'view' },
    { label: 'Редактировать', value: 'edit' },
]
```

### API endpoints

```javascript
// Для группы 'permissions'
GET  /rls/Metadata/:id/permissions/?type=:type

// Для остальных групп
GET  /rls/meta/Metadata/:id/:group/?type=:type
POST /rls/Metadata/:id/:group/?type=:type
DELETE /rls/Metadata/:id/:group/?type=:type

// Получение всех элементов
GET /api/rls/users?filter={...}
GET /api/rls/roles?filter={...}
GET /api/rls/rules?filter={...}
GET /api/rls/groups?filter={...}
```

### Загрузка данных (`fetchAccessData`)

```javascript
fetchAccessData = async (id: string, group: AccessGroup, type: AccessType)
```

Алгоритм:
1. Показывает индикатор загрузки
2. Для группы 'permissions' использует `/rls/Metadata/:id/permissions/?type=:type`
3. Для остальных групп использует `/rls/meta/Metadata/:id/:group/?type=:type`
4. Обновляет состояние `accessData`
5. Скрывает индикатор загрузки

### Получение всех элементов (`fetchAllItems`)

```javascript
fetchAllItems = async (group: AccessGroup)
```

Алгоритм:
1. Показывает индикатор загрузки списка
2. Формирует фильтр: `{ offset, limit, order, where }`
3. Отправляет запрос в зависимости от группы
4. Обновляет состояние `allItemsData`
5. Для пользователей сохраняет filter для последующей пагинации

### Переключение элемента (`handleToggleItem`)

```javascript
handleToggleItem = async (group: AccessGroup, id: string)
```

Алгоритм:
1. Проверяет, добавлен элемент уже или нет
2. Если нет → вызывает `handleAddItem`
3. Если да → вызывает `handleRemoveItem`
4. Обновляет состояние

## 3. Типы данных <a id="data-types" name="data-types"></a>

### Типы прав доступа

```typescript
type AccessType = 'view' | 'read' | 'write' | 'delete';
```

### Типы групп

```typescript
type AccessGroup = 'permissions' | 'users' | 'roles' | 'rules' | 'groups';
```

### Пользователь

```typescript
interface User {
    id: string;
    login: string;
    status: number;
    name: string;
    session: null | any;
    details: string;
    avatar: string;
    email: string;
    attributes: UserAttribute[];
}
```

### Роль

```typescript
interface Role {
    id: string;
    code: number;
    markdel?: number;
    name: string;
    color: string;
    details: string;
    createdAt?: string;
    updatedAt?: string;
}
```

### Правило

```typescript
interface Rule {
    id: string;
    name: string;
    details: string;
}
```

### Группа

```typescript
interface Group {
    id: string;
    name: string;
    info: string;
    logo_link: string;
    open_group: boolean;
    all_users_add: boolean;
    markdel: number;
    createdAt: string;
    updatedAt: string;
}
```

### Пользовательские атрибуты

```typescript
interface UserAttribute {
    id: string;
    code: number;
    markdel: number;
    user_id: string;
    attribute_id: string;
    value: string;
    name: string;
    type: string;
}
```

## 4. Особенности применения <a id="apply-features" name="apply-features"></a>

### Props компонента

```typescript
interface AccessMatrixProps {
    id: string;      // ID элемента метаданных
    onClose?: () => void;  // Callback при закрытии
}
```

### Инициализация

```javascript
constructor(props: AccessMatrixProps) {
    super(props);
    this.state = {
        currentGroup: 'permissions',
        currentType: 'read',
        accessData: EMPTY_ACCESS_DATA,
        allItemsData: { ...EMPTY_ACCESS_DATA, users: { items: [], total: 0 } },
        loading: false,
        error: null,
        collapsedBlocks: {},
        isEditing: false,
        currentEditTab: 0,
        pagination: {
            permissions: { offset: 0, limit: 20 },
            users: { offset: 0, limit: 20 },
            roles: { offset: 0, limit: 50 },
            rules: { offset: 0, limit: 50 },
            groups: { offset: 0, limit: 50 },
        },
        isListLoading: false,
    };
}
```

### Рендеринг

#### Для группы 'permissions'

Отображаются блоки прав доступа для каждого типа элемента:

```javascript
<PermissionBlock
    title="Пользователи"
    icon={<UsersIcon />}
    items={currentData.users}
    collapsed={collapsedBlocks.users}
    onToggle={handleBlockToggle}
    listOptions={listOptions}
/>
```

#### Для остальных групп

Отображается компонент `AccessList`:

```javascript
<AccessList
    data={currentData}
    showUsers={currentGroup === 'users'}
    showRoles={currentGroup === 'roles'}
    showRules={currentGroup === 'rules'}
    showGroups={currentGroup === 'groups'}
    isEditing={isEditing}
    onToggleItem={handleToggleItem}
    currentGroup={currentGroup}
    allItemsData={allItemsData}
    onPageChange={handlePageChange}
    isListLoading={isListLoading}
/>
```

### Обработка изменения типа прав

```javascript
handleTypeChange = (index: number) => {
    const type = typeOptions[index].value as AccessType;
    this.setState(
        { currentType: type, currentEditTab: 0, isEditing: false, accessData: EMPTY_ACCESS_DATA },
        () => {
            this.fetchAccessData(this.props.id, this.state.currentGroup, type);
            if (this.state.currentGroup !== 'permissions') {
                this.fetchAllItems(this.state.currentGroup);
            }
        }
    );
};
```

### Обработка изменения группы

```javascript
handleGroupChange = (index: number) => {
    const group = groupTabs[index].value as AccessGroup;
    this.setState(
        { currentGroup: group, currentEditTab: 0, isEditing: false },
        () => {
            this.fetchAccessData(this.props.id, group, this.state.currentType);
            if (this.state.currentGroup !== 'permissions') {
                this.fetchAllItems(this.state.currentGroup);
            }
        }
    );
};
```

### Пагинация

```javascript
handlePageChange = (group: AccessGroup, page: number) => {
    const newOffset = (page - 1) * 20;
    this.setState(
        { pagination: { ...pagination, [group]: { ...pagination[group], offset: newOffset } } },
        () => this.fetchAllItems(group)
    );
};
```

### Сворачивание блоков

```javascript
handleBlockToggle = (blockKey: string, count: number) => {
    if (count === 0) return;
    this.setState(prevState => ({
        collapsedBlocks: {
            ...prevState.collapsedBlocks,
            [blockKey]: !prevState.collapsedBlocks[blockKey],
        },
    }));
};
```

### Очистка данных

```typescript
const EMPTY_ACCESS_DATA = {
    permissions: [],
    users: [],
    roles: [],
    rules: [],
    groups: [],
};
```

## Пример использования

```javascript
import { AccessMatrix } from 'components/AccessMatrix';

<AccessMatrix id="1858caf2-b845-4175-9463-b1da250914e1" />
```

## Интеграция с AccessMatrixDrawer

Компонент часто используется внутри `AccessMatrixDrawer`:

```javascript
<AccessMatrixDrawer>
    <AccessMatrix id={nodeId} />
</AccessMatrixDrawer>
```

## Ошибки и обработка

- При ошибке загрузки отображается сообщение об ошибке
- Компонент обернут в `ErrorBoundary` для перехвата ошибок рендеринга
- Логи ошибок сохраняются через `generateLogsFileName('AccessMatrix')`

---

## TODO и доработки

- [ ] **Единый API доступа**: Создать единый интерфейс для всех компонентов доступа
- [ ] **Импорт/экспорт**: Реализовать импорт/экспорт настроек доступа
- [ ] **Групповое редактирование**: Добавить возможность редактировать доступ для нескольких объектов сразу
- [ ] **Шаблоны доступа**: Реализовать шаблоны прав доступа для быстрого применения
- [ ] **Интеграция с Undo/Redo**: Подключить Undo/Redo
- [ ] **Загрузка**: Добавить спиннеры при загрузке данных
- [ ] **Подсветка изменений**: Подсветка измененных прав
- [ ] **Virtual scrolling**: Использовать virtual scrolling для больших списков
- [ ] **Тесты**: Добавить юнит и интеграционные тесты
