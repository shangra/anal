import { Component } from 'react';
import { ThemeProvider as ThemeProviderComponent, ThemeProviderProps as ThemeProviderComponentProps, Theme as ThemeUI } from 'ui-kit'
import "ui-kit/style.css"

export class ThemeProvider extends Component<ThemeProviderComponentProps> {
    render = () => (
        <ThemeProviderComponent {...this.props} />
    )
}

export type ThemeProviderProps = ThemeProviderComponentProps
export type Theme = ThemeUI