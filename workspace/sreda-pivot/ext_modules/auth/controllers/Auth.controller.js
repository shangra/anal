const AuthServiceClass = require('../services/Auth.service');
const httpContext = require('../../../core/services/http-context');
const AuthService = new AuthServiceClass();

/**
 * @swagger
 * tags:
 *   - name: authCMP
 *     description: расширение
 */

class AuthController {
    /**
     * @swagger
     * /auth/registration:
     *   post:
     *     summary: Создание нового пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               login:
     *                 type: string
     *                 description: логин пользователя
     *               password:
     *                 type: string
     *                 description: пароль
     *     responses:
     *       200:
     *         description: Все данные по созданному пользователю и его права
     */
    static async register(req, res, next) {
        res.locals.description = 'Регистрация нового пользователя';
        try {
            const data = {
                ...req.body,
                session: req.sessionID,
            };
            const user = await AuthService.createUser(data);
            const userInfo = await AuthService.addUserInfo(user.id, data);
            const [rules, ruleNameList] = await AuthService.getAllUserRules(
                user.id
            );
            user.rules = rules;
            user.rulesName = ruleNameList;
            // req.session.user = user;

            const sessionStorage = httpContext.get('sessionStorage');
            sessionStorage.user = user;
            httpContext.set('sessionStorage', sessionStorage);
            res.json({
                ...user,
                ...userInfo,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /auth/login:
     *   post:
     *     summary: Аутентификация пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               login:
     *                 type: string
     *                 description: логин пользователя
     *               password:
     *                 type: string
     *                 description: пароль
     *     responses:
     *       200:
     *         description: Все данные по созданному пользователю и его права, группы, роли
     */
    static async login(req, res, next) {
        res.locals.description = 'Аутентификация пользователя';
        try {
            let user = await AuthService.login(req.body);
            user = await AuthService.setUserInSession(user);
            await AuthService.setUserInStore(req.sessionCache, user);
            // try-catch для защиты от дурака
            try {
                // Хук для обогащения сессии другими модулями/сервисами. Не самое элегантное решение, но все же
                user = await AuthService.afterLogin(user);
                await AuthService.setUserInStore(req.sessionCache, user);
            } catch (e) {
                console.error(e);
            }
            res.json(user);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /auth/logout:
     *   get:
     *     summary: Выход из учетной записи пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: json с результатом
     */
    static async logout(req, res, next) {
        res.locals.description = 'Выход из учетной записи пользователя';
        try {
            const sessionStorage = httpContext.get('sessionStorage');
            httpContext.set('sessionStorage', {
                ...sessionStorage,
                user: {},
            });
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }
}
module.exports = AuthController;
