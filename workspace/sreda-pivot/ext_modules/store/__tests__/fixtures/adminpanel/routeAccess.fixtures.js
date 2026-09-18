const freeRoutes = [
    { route: '/users/getuserdata', method: 'GET' },
    { route: '/users/getuserdata/key', method: 'GET' },
    { route: '/users/getuserdata/key', method: 'POST' },
];

const authRoutes = [];

const baseAuthRoutes = [];

const accessRoutes = [];

module.exports = { freeRoutes, authRoutes, baseAuthRoutes, accessRoutes };
