const id = 'cc33f534-5c0e-4da6-afdc-23846bf75eb0';

const freeRoutes = [];

const authRoutes = [];

const baseAuthRoutes = [];

const accessRoutes = [
    // pages
    { route: '/pages', method: 'POST' },
    { route: '/pages', method: 'GET' },
    { route: `/pages/${id}`, method: 'GET' },
    { route: `/pages/${id}`, method: 'DELETE' },
    { route: `/pages/${id}`, method: 'PUT' },
    { route: `/pages/${id}/params/${id}`, method: 'PUT' },
    { route: `/pages/${id}/templates/${id}/params}`, method: 'GET' },
    { route: `/pages/params/${id}`, method: 'PUT' },
];

module.exports = { freeRoutes, authRoutes, baseAuthRoutes, accessRoutes };
