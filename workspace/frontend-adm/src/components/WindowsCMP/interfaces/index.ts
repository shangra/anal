import type { CSSProperties, ReactNode } from 'react';

/**
 * Позиции расположения модального окна.
 */
export enum MENU_POSITION {
    window = 'window',
    left = 'left',
    right = 'right',
    top = 'top',
    bottom = 'bottom',
}

export type MenuPosition = MENU_POSITION;

export interface IWindowState {
    [key: string]: IWindow;
}

export type IWindowKey = keyof IWindowState;

/**
 * Интерфейс модального окна
 */
export interface IWindow {
    key: string;
    title: string;
    style?: CSSProperties;
    content: ReactNode;
    zIndex?: number;
    close?: boolean;
    callback?: () => void;
    portal?: Element;
    position?: PanelPosition;
    isMinimized?: boolean;
    type?: 'setting' | 'tab';
    onClose?: () => void;
}

export enum PanelPosition {
    left = 'left',
    right = 'right',
    bottom = 'bottom',
}

export interface ISidebarState {
    /** Состояние панели */
    isOpen: boolean;
    /** id окон в сайдбаре */
    tabs: Record<string, IWindow>;
    /** Активное окно в сайдбаре */
    activeTabId: string;
}
