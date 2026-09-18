const metaCopyPasteServiceClass = require('../services/metaCopyPaste.service');
const metaCopyPasteService = new metaCopyPasteServiceClass();
/**
 * @swagger
 * tags:
 *   - name: MetaCopyPaste
 *     description: Методы копирования и вставки метаданных
 */
class metaCopyPasteController {
  /**
   * @swagger
   * /metaCopyPaste/copy/{id}:
   *   get:
   *     summary: Копирование метаданных
   *     tags: [MetaCopyPaste]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: Идентификатор элемента для копирования
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Результат копирования
   */
  static async copy(req, res, next) {
    try {
      const {
        id
      } = req.params;
      let result = await metaCopyPasteService.copy(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
   * @swagger
   * /metaCopyPaste/paste/{id}:
   *   post:
   *     summary: Вставка скопированных метаданных
   *     tags: [MetaCopyPaste]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: Идентификатор целевого элемента
   *         in: path
   *         required: true
   *         type: string
   *     requestBody:
   *       description: Данные для вставки
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Произвольный JSON объект
   *     responses:
   *       200:
   *         description: Результат вставки
   */
  static async paste(req, res, next) {
    try {
      const body = req.body;
      const {
        id
      } = req.params;
      let result = await metaCopyPasteService.paste(id, body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = metaCopyPasteController;