const wrapperServiceClass = require('../services/wrapper.service');
const wrapperService = new wrapperServiceClass();

class wrapperController {
    /**
     * @swagger
     * /wrapper:
     *   get:
     *     summary: Получение списка версий сервисов
     *     tags: [Wrapper]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Список версий сервисов
     */
    static async get(req, res, next) {
        try {
            let result = Object.keys(sreda.versions);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /wrapper/{from}/{to}/{service}:
     *   post:
     *     summary: Отправка POST-запроса через обертку
     *     tags: [Wrapper]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: from
     *         description: Источник запроса
     *         in: path
     *         required: true
     *         type: string
     *       - name: to
     *         description: Назначение запроса
     *         in: path
     *         required: true
     *         type: string
     *       - name: service
     *         description: Имя сервиса
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Тело запроса
     *     responses:
     *       200:
     *         description: Результат обработки запроса
     */
    static async post(req, res, next) {
        try {
            const { from, service } = req.params;
            const body = req.body;
            let result = await wrapperService.post(from, service, body);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = wrapperController;