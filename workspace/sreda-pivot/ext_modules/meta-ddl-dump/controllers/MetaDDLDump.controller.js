const MetaDDLDumpServiceClass = require('../services/MetaDDLDump.service');
const MetaDDLDumpService = new MetaDDLDumpServiceClass();
/**
 * @swagger
 * tags:
 *   - name: MetaDDLDump
 *     description: Метаданные DUMP
 */
class MetaDDLDumpController {
  /**
     * @swagger
     * /MetaDDLDump/{id}:
     *   post:
     *     summary: Выполнение запроса метаданных
     *     tags: [MetaDDLDump]
     *     security:
     *       - BearerAuth: []
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Идентификатор объекта
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Произвольный JSON объект
     *     responses:
     *       200:
     *         description: Результат выполнения запроса
     */
  static async postQuery(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const body = req.body;
      let result = await MetaDDLDumpService.postQuery(id, body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = MetaDDLDumpController;