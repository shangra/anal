const SessionSetServiceClass = require('../services/SessionSet.service');
const SessionSetService = new SessionSetServiceClass();
/**
 * @swagger
 * tags:
 *   - name: SessionSet
 *     description: Управление сессиями
 */
class SessionsSetController {
    /**
     * @swagger
     * /sessionset:
     *   get:
     *     summary: Получение списка всех сессий
     *     tags: [SessionSet]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Список сессий
     */
    static async get(req, res, next) {
        try {
            const result = await SessionSetService.get();
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = SessionsSetController;
