const MetaSearchServiceClass = require('../services/MetaSearch.service');
const MetaSearchService = new MetaSearchServiceClass();
/**
 * @swagger
 * tags:
 *   - name: MetaSearch
 *     description: Методы для метапоиска
 */
class MetaSearchController {
  /**
     * @swagger
     * /MetaSearch/query:
     *   get:
     *     summary: Выполнение метапоискового запроса
     *     tags: [MetaSearch]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: target
     *         description: Целевой параметр для метапоиска
     *         in: query
     *         required: false
     *         type: string
     *     responses:
     *       200:
     *         description: Результат метапоискового запроса
     */
  static async query(req, res, next) {
    try {
      //const { id } = req.params;
      //const { id } = req.query;
      const params = {
        target: '',
        ...req.query
      };
      let result = await MetaSearchService.query(params);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = MetaSearchController;