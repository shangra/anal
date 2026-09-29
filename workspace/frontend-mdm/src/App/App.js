import './App.css';
import 'bootstrap/dist/css/bootstrap.css';
// eslint-disable-next-line import/no-unresolved
import 'ui-kit/style.css';

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { DARK_THEME, GALAXY_THEME, ThemeProvider } from 'ui-kit';
import SessionContext from '../components/SessionContext/SessionContext';
import { RootComponents } from '../components/rootComponents';

import MDMPage from './routes/MDM';
import Home from './routes/Home';

class App extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            contentKey: null,
        };

        this.resetApp = this.resetApp.bind(this);
    }

    resetApp() {
        this.setState({ contentKey: Math.random() * Math.random() });
    }

    render() {
        return (
            <SessionContext resetApp={this.resetApp} key={this.state.contentKey}>
                <ThemeProvider theme={GALAXY_THEME}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/mdm" element={<MDMPage />} />
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
