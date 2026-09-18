require('../../../test-cms/src/loadModuleDependencies')(__dirname);
const {
    freeRoutes,
    accessRoutes,
    authRoutes,
    baseAuthRoutes,
} = require('../fixtures/routeAccess.fixtures');
const runRouteAccessTests = require('../../../test-cms/__tests__/runRouteAcessTests');

describe('Проверка доступа к маршрутам расширения page-cms', () => {
    runRouteAccessTests({
        freeRoutes,
        accessRoutes,
        authRoutes,
        baseAuthRoutes,
    });
});
