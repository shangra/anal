import StateManager from 'lite-react-statemanager';
import { Component } from 'react';
import { DARK_THEME } from 'ui-kit';

import { ThemeProvider } from '../UIKit/ThemeProvider';
import { THEMES } from './constants';
import { Themes, ThemeSwitchAgentProps, ThemeSwitchAgentState } from './types';

export class ThemeSwitchAgent extends Component<ThemeSwitchAgentProps, ThemeSwitchAgentState> {
    constructor(props: ThemeSwitchAgentProps) {
        super(props);
        this.state = {
            currentTheme: DARK_THEME,
        };
    }

    componentDidMount() {
        StateManager.subscribeState({ theme: { subTheme: this.subTheme } });
    }

    componentWillUnmount() {
        StateManager.unsubscribeState({ theme: ['subTheme'] });
    }

    subTheme = (theme: { theme: Themes | 'auto' }) => {
        const selectedTheme = ['dark', 'light', 'galaxy', 'auto'].includes(theme?.theme) ? theme.theme : 'dark';

        if (selectedTheme === 'auto') {
            const osTheme = window.matchMedia('(prefers-color-scheme: light)');
            const currentTheme = osTheme.matches ? 'light' : 'dark';
            this.setState({
                currentTheme: THEMES[currentTheme],
            });

            return;
        }

        this.setState({
            currentTheme: THEMES[selectedTheme],
        });
    };

    render() {
        return <ThemeProvider theme={this.state.currentTheme}>{this.props.children}</ThemeProvider>;
    }
}
