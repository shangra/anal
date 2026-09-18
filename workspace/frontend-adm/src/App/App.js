import './App.css';
import 'bootstrap/dist/css/bootstrap.css';
// eslint-disable-next-line import/no-unresolved
import 'ui-kit/style.css';

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { DARK_THEME, GALAXY_THEME, ThemeProvider } from 'ui-kit';
import SessionContext from '../components/SessionContext/SessionContext';
import { RootComponents } from '../components/rootComponents';

import AdminPanelPage from './routes/AdminPanel';
import Home from './routes/Home';

function themeFromDocument() {
    const name = typeof document !== 'undefined' ? document.documentElement.dataset.theme : 'dark';
    if (name === 'galaxy') return GALAXY_THEME;
    return DARK_THEME;
}

class App extends React.Component {
    constructor(props) {
        super(props);

        if (typeof document !== 'undefined') {
            document.documentElement.dataset.theme = document.documentElement.dataset.theme || 'dark';
            if (document.documentElement.dataset.theme === 'light') {
                document.documentElement.dataset.theme = 'dark';
            }
        }

        this.state = {
            contentKey: null,
            uiTheme: themeFromDocument(),
        };

        this.resetApp = this.resetApp.bind(this);
        this.syncTheme = this.syncTheme.bind(this);
    }

    componentDidMount() {
        this._themeObserver = new MutationObserver(this.syncTheme);
        this._themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        this.syncTheme();
    }

    componentWillUnmount() {
        this._themeObserver?.disconnect();
    }

    syncTheme() {
        const next = themeFromDocument();
        if (next !== this.state.uiTheme) {
            this.setState({ uiTheme: next });
        }
    }

    resetApp() {
        this.setState({ contentKey: Math.random() * Math.random() });
    }

    render() {
        return (
            <SessionContext resetApp={this.resetApp} key={this.state.contentKey}>
                <ThemeProvider theme={this.state.uiTheme}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/adminpanel" element={<AdminPanelPage />} />
                    </Routes>
                    <div>
                        <RootComponents />
                    </div>
                </ThemeProvider>
            </SessionContext>
        );
    }
}

export default App;
