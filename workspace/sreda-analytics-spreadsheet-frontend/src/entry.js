import './helpers/console';

import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App/App';
import { FRONTEND_PREFIX_PROCESSED } from './settings/settings';

window.addEventListener('error', (e) => {
    console.error(e);
    // prevent React's listener from firing
    e.stopImmediatePropagation();
    // prevent the browser's console error message
    e.preventDefault();
});

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <BrowserRouter basename={FRONTEND_PREFIX_PROCESSED}>
        <App />
    </BrowserRouter>,
);
