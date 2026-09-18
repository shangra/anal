const id = 'cc33f534-5c0e-4da6-afdc-23846bf75eb0';

const freeRoutes = [
    { route: `/rls/table/${id}/owner/?type=write`, method: 'GET' },
    { route: `/rls/table/${id}/owner/?type=write`, method: 'POST' },
    { route: `/rls/table/${id}/owner/?type=write`, method: 'DELETE' },
];

const authRoutes = [
    { route: `/rls/status/table/${id}`, method: 'GET' },
    { route: `/rls/multi/status/table`, method: 'POST' },
];

const baseAuthRoutes = [];

const accessRoutes = [];

module.exports = { freeRoutes, authRoutes, baseAuthRoutes, accessRoutes };
