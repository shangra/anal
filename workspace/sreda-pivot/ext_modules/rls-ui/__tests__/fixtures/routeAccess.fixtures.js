const id = 'cc33f534-5c0e-4da6-afdc-23846bf75eb0';

const freeRoutes = [];

const authRoutes = [
    { route: `/rls/meta/table/${id}/owner`, method: 'GET' },
    { route: `/rls/table/${id}/permissions`, method: 'GET' },
];

const baseAuthRoutes = [];

const accessRoutes = [];

module.exports = { freeRoutes, authRoutes, baseAuthRoutes, accessRoutes };
