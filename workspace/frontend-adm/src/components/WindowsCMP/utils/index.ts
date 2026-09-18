import { ISidebarState } from 'components/WindowsCMP/interfaces';

export const isEmptySidebar = (sidebar: ISidebarState) =>
    Object.keys(sidebar.tabs).length === 0;

export const capitalizeFirstLetter = (str: string) =>
    String(str).charAt(0).toUpperCase() + String(str).slice(1);
