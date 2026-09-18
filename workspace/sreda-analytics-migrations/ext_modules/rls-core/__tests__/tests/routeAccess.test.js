const {
    freeRoutes,
    accessRoutes,
    authRoutes,
    baseAuthRoutes,
} = require('../fixtures/routeAccess.fixtures');
const runRouteAccessTests = require('../../../test-cms/__tests__/runRouteAcessTests');

describe('Проверка доступа к маршрутам расширения rls-core', () => {
    runRouteAccessTests({ freeRoutes, accessRoutes, authRoutes, baseAuthRoutes });
});
