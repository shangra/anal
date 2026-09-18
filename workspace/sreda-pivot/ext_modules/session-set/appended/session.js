const fs = require('node:fs');
const path = require('path');

const session = require('express-session');
const FileStore = require('session-file-store')(session);

const SIDS_PATH = path.join(
    sreda.env.VAR,
    sreda.env.SESSIONS_DIR || 'sessions',
    'sids'
);

try {
    fs.mkdirSync(SIDS_PATH, { recursive: true });
} catch (e) {
    if (e.code !== 'EEXIST') throw e;
}

const sessionParser = session({
    name: 'SID',
    store: new FileStore({
        path: SIDS_PATH,
    }),
    saveUninitialized: false,
    secret: sreda.env.SESSION_SECRET,
    rolling: false,
    resave: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        path: '/',
        secure: false,
        httpOnly: true,
    },
});

module.exports = sessionParser;
