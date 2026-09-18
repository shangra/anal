const parseDbmodelMetaServiceClass = require('../services/metaSynhDbmodel.service');
const parseDbmodelMetaService = new parseDbmodelMetaServiceClass();
/**
 * @swagger
 * tags:
 *   - name: MetaSyncDbmodel
 *     description: Методы синхронизации метаданных моделей базы данных
 */
class metaSynhDbmodelController {
  /**
     * @swagger
     * /metaSyncDbmodel/synch/{id}:
     *   post:
     *     summary: Синхронизация модели базы данных
     *     tags: [MetaSyncDbmodel]
     *     security:
     *       - AccessToken: []
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Идентификатор модели
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Параметры синхронизации
     *     responses:
     *       200:
     *         description: Результат синхронизации
     */
  static async synch(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      let result = await parseDbmodelMetaService.synch(id, body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /metaSyncDbmodel/synch/{id}:
     *   delete:
     *     summary: Удаление модели базы данных
     *     tags: [MetaSyncDbmodel]
     *     security:
     *       - AccessToken: []
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Идентификатор модели
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления
     */
  static async drop(req, res, next) {
    try {
      const id = req.params.id;
      let result = await parseDbmodelMetaService.drop(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /metaSyncDbmodel/synch/{id}:
     *   get:
     *     summary: Получение модели базы данных
     *     tags: [MetaSyncDbmodel]
     *     security:
     *       - AccessToken: []
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Идентификатор модели
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Модель базы данных
     */
  static async model(req, res, next) {
    try {
      const id = req.params.id;
      let result = await parseDbmodelMetaService.model(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = metaSynhDbmodelController;