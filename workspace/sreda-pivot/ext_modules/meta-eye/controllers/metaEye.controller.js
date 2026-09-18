const metaEyeServiceClass = require('../services/metaEye.service');
const metaEyeService = new metaEyeServiceClass();
/**
 * @swagger
 * tags:
 *   - name: MetaEye
 *     description: Методы для работы с метаданными глаз
 */
class metaEyeController {
    /**
     * @swagger
     * /metaEye/eye/{id}:
     *   get:
     *     summary: Получение информации о глазе по ID
     *     tags: [MetaEye]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Уникальный идентификатор глаза
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Информация о глазе
     */
    static async eye(req, res, next) {
        try {
            const { id } = req.params;
            let result = await metaEyeService.eye(id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = metaEyeController;
