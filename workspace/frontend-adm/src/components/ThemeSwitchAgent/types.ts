import { ReactNode } from 'react';
import { THEMES } from 'components/ThemeSwitchAgent/constants';
import { Theme } from 'ui-kit';

export type Themes = keyof typeof THEMES;

export type ThemeSwitchAgentProps = {
    children?: ReactNode;
};

export type ThemeSwitchAgentState = {
    currentTheme: Theme;
    themeUUID: string;
    isPopoverOpened: boolean;
};
