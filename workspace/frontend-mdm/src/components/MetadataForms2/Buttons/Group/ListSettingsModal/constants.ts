import { GroupTabIcon } from '../Icon/groupTab.icon';
import { SelectionTabIcon } from '../Icon/selectionTab.icon';
import { SortingTabIcon } from '../Icon/sortingTab.icon';
import { ConditionalRegistrationTabIcon } from '../Icon/conditionalRegistrationTab.icon'
import React from 'react';

export const TITLES: readonly (string | { icon: React.ComponentType; tabName: string })[] = [
    { icon: SelectionTabIcon, tabName: "Отбор" },
    { icon: SortingTabIcon, tabName: "Сортировка" },
    { icon: ConditionalRegistrationTabIcon, tabName: "Условное оформление" },
    { icon: GroupTabIcon, tabName: "Группировка" }
];