const MetaQueryExplainServiceClass = require('../services/MetaQueryExplain.service');
const MetaQueryExplainService = new MetaQueryExplainServiceClass();
/**
 * @swagger
 * tags:
 *   - name: MetaQueryExplain
 *     description: Методы для объяснения метаданных запросов
 */
class MetaQueryExplainController {
  /**
   * @swagger
   * /metadata/query-explain/:id:
   *   get:
   *     summary: Получить историю формирования запроса
   *     tags: [QueryExplain]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: id записи
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         - name: id
   *           description: id записи
   *         - name: answerId
   *           description: id запроса
   *         - name: plan
   *           description: план выполнения запроса
   */
  static async get(req, res, next) {
    res.locals.description = 'Получить историю формирования запроса';
    try {
      const {
        id
      } = req.params;
      let result = await MetaQueryExplainService.get(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /metadata/query-explain/meta/:id:
   *   get:
   *     summary: Получить мету по id
   *     tags: [QueryExplain]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: id записи
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         - name: id
   *           description: id записи
   *         - name: meta
   *           description: данные по запросу
   */
  static async getMeta(req, res, next) {
    res.locals.description = 'Получить мету шага запроса';
    try {
      const {
        id
      } = req.params;
      let result = await MetaQueryExplainService.getMeta(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /metadata/query-explain/:id:
   *   delete:
   *     summary: удалить мету по id
   *     tags: [QueryExplain]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: id записи
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         - name: result
   *           description: результат выполнения запроса
   */
  static async del(req, res, next) {
    res.locals.description = 'Очистить историю по id';
    try {
      const {
        id
      } = req.params;
      let result = await MetaQueryExplainService.del(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = MetaQueryExplainController;