import 'ui-kit/style.css';

import { Component } from 'react';
import {
    Theme as ThemeUI,
    ThemeProvider as ThemeProviderComponent,
    ThemeProviderProps as ThemeProviderComponentProps,
} from 'ui-kit';

export class ThemeProvider extends Component<ThemeProviderComponentProps> {
    render() {
        return <ThemeProviderComponent {...this.props} />;
    }
}

export type ThemeProviderProps = ThemeProviderComponentProps;
export type Theme = ThemeUI;
