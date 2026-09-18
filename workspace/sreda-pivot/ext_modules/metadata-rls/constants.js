const routes = 'metadata/rls';

module.exports = {
    Rls: {
        id: '530cf1cf-1aa4-442b-b0f4-ba801f5c9599',
        component: 'Rls',
        routes: `${routes}`,
        name: 'Доступы',
        description: 'Доступы',
    },

    Condition: {
        id: '9300745e-9cd4-4a39-bab9-6a5fda2a1c38',
        component: 'Condition',
        routes: `${routes}/condition`,
        name: 'Условия',
        description: 'Условия',
    },
};
