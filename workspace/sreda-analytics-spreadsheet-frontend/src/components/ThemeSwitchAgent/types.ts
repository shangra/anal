import { ReactNode } from 'react';

import { Theme } from '../UIKit/ThemeProvider';
import { THEMES } from './constants';

export type Themes = keyof typeof THEMES;

export type ThemeSwitchAgentProps = {
    children?: ReactNode;
};

export type ThemeSwitchAgentState = {
    currentTheme: Theme;
};
