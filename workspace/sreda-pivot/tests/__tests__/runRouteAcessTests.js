function runRouteAccessTests({ freeRoutes, authRoutes, baseAuthRoutes, accessRoutes }) {
    describe('Пользователь не авторизован', () => {
        describe('Свободные маршруты', () => {
            if (freeRoutes.length > 0) {
                test.each(freeRoutes)('$method $route', async ({ route, method }) => {
                    const response = await agent[method.toLowerCase()](route);
                    expect(response.status).not.toBe(423);
                });
            }
        });
        describe('Маршруты, требующие авторизации', () => {
            if (authRoutes.length > 0) {
                test.skip.each(authRoutes)('$method $route', async ({ route, method }) => {
                    await agent[method.toLowerCase()](route).expect(403, {
                        message: 'Пользователь не авторизован',
                        errors: [],
                        stack: '',
                        original: {},
                    });
                });
            }
        });
        describe('Маршруты, требующие базовой авторизации', () => {
            if (baseAuthRoutes.length > 0) {
                test.skip.each(baseAuthRoutes)('$method $route', async ({ route, method }) => {
                    await agent[method.toLowerCase()](route).expect(403, {
                        message: 'Пользователь не авторизован Basic Auth',
                        errors: [],
                        stack: '',
                        original: {},
                    });
                });
            }
        });
        describe('Маршруты, требующие наличия определенных прав', () => {
            if (accessRoutes.length > 0) {
                test.skip.each(accessRoutes)('$method $route', async ({ route, method }) => {
                    await agent[method.toLowerCase()](route).expect(423, {
                        message: 'Доступ отсутствует',
                        errors: [],
                        stack: '',
                        original: {},
                    });
                });
            }
        });
    });
}
module.exports = runRouteAccessTests;
