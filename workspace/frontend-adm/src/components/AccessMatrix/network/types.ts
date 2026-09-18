// Типы прав доступа
export type AccessType = 'view' | 'read' | 'write' | 'delete';

// Типы групп доступа
export type AccessGroup = 'permissions' | 'users' | 'roles' | 'rules' | 'groups';

// Атрибут пользователя
export interface UserAttribute {
    id: string;
    code: number;
    markdel: number;
    user_id: string;
    attribute_id: string;
    value: string;
    name: string;
    type: string;
}

// Пользователь
export interface User {
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

// Роль
export interface Role {
    id: string;
    code: number;
    markdel?: number;
    name: string;
    color: string;
    details: string;
    createdAt?: string;
    updatedAt?: string;
}

// Правило
export interface Rule {
    id: string;
    name: string;
    details: string;
}

// Группа
export interface Group {
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

// Данные доступа
export interface AccessData {
    users: User[];
    roles: Role[];
    rules: Rule[];
    groups: Group[];
}

// Props компонента AccessMatrix
export interface AccessMatrixProps {
    id: string; // ID элемента метаданных
    server?: string; // Сервер (префикс URL)
    onClose?: () => void;
    tableName?: string; // Имя таблицы для запросов (по умолчанию Metadata)
    separate?: boolean; // добавлять ли &separate=yes к запросам (по умолчанию - false)
}

// Props компонента AccessItem с режимом редактирования
export interface AccessItemEditableProps {
    item: User | Role | Rule | Group;
    type: 'user' | 'role' | 'rule' | 'group';
    selected: boolean;
    onToggle: () => void;
}

export interface UsersList {
    items: User[];
    total: number;
    filter?: string;
}
