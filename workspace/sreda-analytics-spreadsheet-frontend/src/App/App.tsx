import './App.css';
import 'ui-kit/style.css';

import StateManager from 'lite-react-statemanager';
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { DARK_THEME, GALAXY_THEME, LIGHT_THEME, NotificationsProvider, Select, Theme, ThemeProvider } from 'ui-kit';

import { ErrorBoundary } from '../components/ErrorBoundary';
import SessionContext from '../components/SessionContext/SessionContext';
import Cube from './routes/Cube';
import Home from './routes/Home';
import Report from './routes/Report';

export const THEME_NAME = {
    LIGHT: 'light',
    DARK: 'dark',
    GALAXY: 'galaxy',
} as const;

export const THEME_OPTIONS = [
    { label: 'Галактика', value: THEME_NAME.GALAXY, testId: `theme-${THEME_NAME.GALAXY}` },
    { label: 'Темная', value: THEME_NAME.DARK, testId: `theme-${THEME_NAME.DARK}` },
    { label: 'Светлая', value: THEME_NAME.LIGHT, testId: `theme-${THEME_NAME.LIGHT}` },
];

export const THEME_DICTIONARY = {
    [THEME_NAME.DARK]: DARK_THEME,
    [THEME_NAME.LIGHT]: LIGHT_THEME,
    [THEME_NAME.GALAXY]: GALAXY_THEME,
};

export type Values<T> = T[keyof T];

export type ThemeTypes = Values<typeof THEME_NAME>;

class App extends React.Component<any, { contentKey: React.Key | null | undefined; currentTheme: ThemeTypes }> {
    constructor(props: any) {
        super(props);

        this.state = {
            contentKey: null,
            currentTheme: THEME_NAME.DARK,
        };

        this.resetApp = this.resetApp.bind(this);
    }

    componentDidMount() {
        StateManager.subscribeState({ theme: { subTheme: this.subTheme } });
    }

    componentWillUnmount() {
        StateManager.unsubscribeState({ theme: ['subTheme'] });
    }

    subTheme = (theme: { theme: ThemeTypes | 'auto' }) => {
        const selectedTheme = ['dark', 'light', 'galaxy', 'auto'].includes(theme?.theme) ? theme.theme : THEME_NAME.DARK;

        if (selectedTheme === 'auto') {
            const osTheme = window.matchMedia('(prefers-color-scheme: light)');
            const currentTheme = osTheme.matches ? THEME_NAME.LIGHT : THEME_NAME.DARK;
            this.setState({ currentTheme });
            return;
        }

        this.setState({
            currentTheme: selectedTheme,
        });
    };

    resetApp() {
        this.setState({ contentKey: Math.random() * Math.random() });
    }

    setTheme = (theme: ThemeTypes | null) => {
        this.setState((state) => ({
            ...state,
            currentTheme: theme ?? THEME_NAME.DARK,
        }));
    };

    render() {
        const theme = THEME_DICTIONARY[this.state.currentTheme] || DARK_THEME;

        return (
            <ErrorBoundary>
                <SessionContext resetApp={this.resetApp} key={this.state.contentKey}>
                    <ThemeProvider theme={theme}>
                        <div
                            style={{
                                position: 'absolute',
                                right: 15,
                                top: 20,
                            }}
                        >
                            <Select
                                testId="theme"
                                options={THEME_OPTIONS}
                                value={this.state.currentTheme || 'dark'}
                                onChange={this.setTheme}
                                hasSearch={false}
                                resettable={false}
                            />
                        </div>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/cube" element={<Cube theme={theme} />} />
                            <Route path="/report" element={<Report theme={theme} />} />
                        </Routes>
                    </ThemeProvider>
                </SessionContext>
            </ErrorBoundary>
        );
    }
}

export default App;
