import './helpers/console';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import 'bootstrap/dist/js/bootstrap.min.js';
import 'bootstrap/dist/js/bootstrap.esm.min.js';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import * as Components from './components/index'; // Инициализация компонент, если убрать может падать фронт

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
