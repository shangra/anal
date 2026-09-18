const {
    freeRoutes,
    accessRoutes,
    authRoutes,
    baseAuthRoutes,
} = require('../fixtures/routeAccess.fixtures');
const runRouteAccessTests = require('../../../test-cms/__tests__/runRouteAcessTests');

describe('Проверка доступа к маршрутам расширения rls-ui', () => {
    runRouteAccessTests({
        freeRoutes,
        accessRoutes,
        authRoutes,
        baseAuthRoutes,
    });
});
