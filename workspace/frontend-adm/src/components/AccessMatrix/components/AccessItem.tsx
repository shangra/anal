import React from 'react';
import { User, Role, Rule, Group } from 'components/AccessMatrix/network/types';
import { formatUserName } from 'components/AccessMatrix/network/metadataApi';
import { List } from 'ui-kit';

interface AccessItemProps {
    item: User | Role | Rule | Group;
    type: 'user' | 'role' | 'rule' | 'group';
}

// Компонент для отображения одного элемента доступа (для режима просмотра)
export const AccessItem: React.FC<AccessItemProps> = ({ item, type }) => {
    let label: string;
    let hint: string | undefined;

    switch (type) {
        case 'user':
            label = formatUserName(item as User);
            hint = (item as User).login;
            break;

        case 'role':
            label = (item as Role).name;
            hint = (item as Role).details;
            break;

        case 'rule':
            label = (item as Rule).name;
            hint = (item as Rule).details;
            break;

        case 'group':
            label = (item as Group).name;
            hint = (item as Group).info;
            break;

        default:
            label = '';
            hint = undefined;
    }

    // В режиме просмотра используем List с type="unselectable"
    return <List type="unselectable" options={[{ label, hint }]} />;
};
