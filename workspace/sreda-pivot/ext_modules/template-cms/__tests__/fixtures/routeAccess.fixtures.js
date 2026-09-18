const id = 'cc33f534-5c0e-4da6-afdc-23846bf75eb0';

const freeRoutes = [];

const authRoutes = [];

const baseAuthRoutes = [];

const accessRoutes = [
    // template
    { route: '/templates/getlisttypes', method: 'GET' },
    { route: '/templates', method: 'GET' },
    { route: '/templates', method: 'POST' },
    { route: `/templates/${id}`, method: 'GET' },
    { route: `/templates/${id}`, method: 'DELETE' },
    { route: `/templates/${id}`, method: 'PUT' },
    { route: `/templates/${id}/params`, method: 'GET' },
    { route: `/templates/${id}/params/${id}`, method: 'PUT' },
];

module.exports = { freeRoutes, authRoutes, baseAuthRoutes, accessRoutes };
