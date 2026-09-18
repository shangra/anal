const parseDbmodelMetaServiceClass = require('../services/parseDbmodelMeta.service');
const parseDbmodelMetaService = new parseDbmodelMetaServiceClass();
/**
 * @swagger
 * tags:
 *   - name: ParseDbmodelMeta
 *     description: Методы для автозаполнения метаданных модели из базы данных
 */
class parseDbmodelMetaController {
  /**
       * @swagger
       * /parseDbmodelMeta/autofill/{id}/fromDB:
       *   post:
       *     summary: Автозаполнение метаданных модели из базы данных
       *     tags: [ParseDbmodelMeta]
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
       *         description: Результат автозаполнения
       */
  static async autofillFromDB(req, res, next) {
    try {
      const {
        id
      } = req.params;
      let result = await parseDbmodelMetaService.autofillFromDB(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
       * @swagger
       * /parseDbmodelMeta/autofill/{id}:
       *   post:
       *     summary: Автозаполнение метаданных модели с дополнительными параметрами
       *     tags: [ParseDbmodelMeta]
       *     produces:
       *       - application/json
       *     parameters:
       *       - name: id
       *         description: Идентификатор модели
       *         in: path
       *         required: true
       *         type: string
       *     requestBody:
       *       description: Дополнительные параметры для автозаполнения
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *     responses:
       *       200:
       *         description: Результат автозаполнения
       */
  static async autofill(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const body = req.body;
      let result = await parseDbmodelMetaService.autofill(id, body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = parseDbmodelMetaController;