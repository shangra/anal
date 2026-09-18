const {
    freeRoutes,
    accessRoutes,
    authRoutes,
    baseAuthRoutes,
} = require('../../fixtures/adminpanel/routeAccess.fixtures');
const runRouteAccessTests = require('../../../../test-cms/__tests__/runRouteAcessTests');

describe('Проверка доступа к маршрутам расширения store', () => {
    runRouteAccessTests({ freeRoutes, accessRoutes, authRoutes, baseAuthRoutes });
});
