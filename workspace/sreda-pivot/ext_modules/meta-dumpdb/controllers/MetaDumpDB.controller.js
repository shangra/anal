const metaDumpDBServiceClass = require('../services/metaDumpDB.service');
const metaDumpDBService = new metaDumpDBServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Meta Dump DB
 *     description: Методы для дампа базы данных
 */
class metaDumpDBController {
  /**
     * @swagger
     * /metaDumpDB/dumpdb/{id}:
     *   get:
     *     summary: Выполнить дамп базы данных
     *     tags: [Meta Dump DB]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: ID элемента для дампа
     *         in: path
     *         required: true
     *         type: string
     *       - name: ref
     *         description: Включить ссылки (true/false)
     *         in: query
     *         required: false
     *         type: boolean
     *     responses:
     *       200:
     *         description: Результат дампа базы данных
     */
  static async dumpdb(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        ref
      } = req.query;
      const result = ref === 'true' ? await metaDumpDBService.dumpWithRefs(id) : await metaDumpDBService.dumpdb(id);
      res.send(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = metaDumpDBController;