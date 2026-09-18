import React from 'react';
import { User, Role, Rule, Group, AccessData, AccessGroup, UsersList } from 'components/AccessMatrix/network/types';
import AccessListItem from 'components/AccessMatrix/components/AccessListItem';
import styles from './AccessList.module.css';

interface AccessListProps {
    data: AccessData;
    showUsers?: boolean;
    showRoles?: boolean;
    showRules?: boolean;
    showGroups?: boolean;

    isEditing?: boolean;
    onToggleItem?: (group: AccessGroup, id: string, isSelected?: boolean) => Promise<void>;

    currentGroup?: AccessGroup;

    allItemsData: Record<AccessGroup, UsersList | any[]>;

    onPageChange?: (group: AccessGroup, page: number) => void;
    isListLoading?: boolean;
}

// Вспомогательная функция для получения offset из filter
const getOffsetFromFilter = (filterStr?: string): number => {
    if (!filterStr) return 0;
    try {
        const filter = JSON.parse(filterStr);
        return filter.offset || 0;
    } catch (e) {
        console.error('Error parsing filter:', e);
        return 0;
    }
};

export const AccessList: React.FC<AccessListProps> = ({
    data,
    showUsers = true,
    showRoles = true,
    showRules = true,
    showGroups = true,
    isEditing = false,
    onToggleItem,
    currentGroup = 'users',
    allItemsData,
    onPageChange,
    isListLoading = false,
}) => {
    const {
        users: allUsersData = { items: [], total: 0 },
        roles: allRolesData = [],
        rules: allRulesData = [],
        groups: allGroupsData = [],
    } = allItemsData;

    return (
        <div className={styles.accessList}>
            {/* Пользователи */}
            {showUsers && (
                <AccessListItem
                    items={data.users}
                    allItems={(allUsersData as UsersList).items}
                    idGetter={(u: User) => u.id}
                    labelGetter={(u: User) => u.login}
                    type="users"
                    isEditing={isEditing}
                    onToggleItem={onToggleItem}
                    currentGroup={currentGroup}
                    onPageChange={onPageChange}
                    total={(allUsersData as UsersList).total}
                    offset={getOffsetFromFilter((allUsersData as UsersList).filter)}
                    isPagination
                    _isListLoading={isListLoading}
                />
            )}

            {/* Роли */}
            {showRoles && (
                <AccessListItem
                    items={data.roles}
                    allItems={(allRolesData as any[]) || []}
                    idGetter={(r: Role) => r.id}
                    labelGetter={(r: Role) => r.name}
                    type="roles"
                    isEditing={isEditing}
                    onToggleItem={onToggleItem}
                    currentGroup={currentGroup}
                    onPageChange={onPageChange}
                />
            )}

            {/* Правила */}
            {showRules && (
                <AccessListItem
                    items={data.rules}
                    allItems={(allRulesData as any[]) || []}
                    idGetter={(r: Rule) => r.id}
                    labelGetter={(r: Rule) => r.name}
                    type="rules"
                    isEditing={isEditing}
                    onToggleItem={onToggleItem}
                    currentGroup={currentGroup}
                    onPageChange={onPageChange}
                />
            )}

            {/* Группы */}
            {showGroups && (
                <AccessListItem
                    items={data.groups}
                    allItems={(allGroupsData as any[]) || []}
                    idGetter={(g: Group) => g.id}
                    labelGetter={(g: Group) => g.name}
                    type="groups"
                    isEditing={isEditing}
                    onToggleItem={onToggleItem}
                    currentGroup={currentGroup}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
};
