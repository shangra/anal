const metaSQLQueryServiceClass = require('../services/metaSQLQuery.service');
const metaSQLQueryService = new metaSQLQueryServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Meta SQL Query
 *     description: Методы для выполнения SQL-запросов
 */
class metaNewCubePageController {
  /**
     * @swagger
     * /metaSQLQuery/{id}:
     *   post:
     *     summary: Выполнение SQL-запроса
     *     tags: [Meta SQL Query]
     *     security:
     *       - BearerAuth: []
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Идентификатор куба
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 description: SQL-запрос для выполнения
     *             example:
     *               query: SELECT * FROM table_name WHERE condition
     *     responses:
     *       200:
     *         description: Результат выполнения SQL-запроса
     */
  static async postQuery(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const body = req.body;
      let result = await metaSQLQueryService.postQuery(id, body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = metaNewCubePageController;