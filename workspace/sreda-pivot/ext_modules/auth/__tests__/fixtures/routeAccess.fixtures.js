const id = 'cc33f534-5c0e-4da6-afdc-23846bf75eb0';

const freeRoutes = [];

const authRoutes = [];

const baseAuthRoutes = [];

const accessRoutes = [
    { route: `/usersui/users/${id}/meta`, method: 'GET' },
    { route: `/usersui/users/${id}`, method: 'GET' },
    { route: `/usersui/users/${id}`, method: 'DELETE' },
    { route: `/usersui/users/${id}`, method: 'PUT' },
    { route: '/usersui/users', method: 'GET' },
    { route: '/usersui/users', method: 'POST' },
    { route: `/usersui/users/${id}/rule`, method: 'DELETE' },
    { route: `/usersui/users/${id}/rule`, method: 'PUT' },
    { route: `/usersui/users/${id}/role`, method: 'DELETE' },
    { route: `/usersui/users/${id}/role`, method: 'PUT' },
    { route: `/usersui/users/${id}/rules`, method: 'GET' },
    { route: '/usersui/rules', method: 'GET' },
    { route: `/usersui/roles/${id}`, method: 'PUT' },
    { route: `/usersui/roles/${id}`, method: 'DELETE' },
    { route: `/usersui/roles/${id}`, method: 'GET' },
    { route: `/usersui/roles/${id}/rule`, method: 'PUT' },
    { route: `/usersui/roles/${id}/rule`, method: 'DELETE' },
    { route: `/usersui/roles/${id}/user`, method: 'PUT' },
    { route: `/usersui/roles/${id}/user`, method: 'DELETE' },
    { route: `/usersui/roles/${id}/rules`, method: 'GET' },
    { route: `/usersui/roles/${id}/users`, method: 'GET' },
    { route: '/usersui/roles', method: 'GET' },
    { route: `/usersui/roles/${id}/meta`, method: 'GET' },
    { route: '/usersui/roles', method: 'POST' },
];

module.exports = { freeRoutes, authRoutes, baseAuthRoutes, accessRoutes };
