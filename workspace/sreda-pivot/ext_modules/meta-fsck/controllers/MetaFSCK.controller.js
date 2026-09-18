const MetaFSCKServiceClass = require('../services/MetaFSCK.service');
const MetaFSCKService = new MetaFSCKServiceClass();
/**
 * @swagger
 * tags:
 *   - name: MetaFSCK
 *     description: Методы для работы с метаданными FSCK
 */
class MetaFSCKController {
    /**
     * @swagger
     * /MetaFSCK/{id}:
     *   post:
     *     summary: Выполнение запроса к метаданным FSCK
     *     tags: [MetaFSCK]
     *     security:
     *       - bearerAuth: []
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Идентификатор ресурса
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/QueryRequest'
     *     responses:
     *       200:
     *         description: Результат выполнения запроса
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/QueryResponse'
     */
    static async postQuery(req, res, next) {
        try {
            const { id } = req.params;
            const body = req.body;
            let result = await MetaFSCKService.postQuery(id, body);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = MetaFSCKController;
