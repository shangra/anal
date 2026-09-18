const metaCopyInfofieldsServiceClass = require('../services/metaCopyInfofields.service');
const metaCopyInfofieldsService = new metaCopyInfofieldsServiceClass();

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

/**
 * @class metaCopyInfofieldsController
 */
class metaCopyInfofieldsController {
  /**
     * @swagger
     * /metaCopyInfofields/copyfield/{id}:
     *   post:
     *     summary: Копирование поля инфоблоков
     *     tags: [MetaCopyInfofields]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: ID инфоблока
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       description: Параметры копирования полей
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               sourceFieldId:
     *                 type: integer
     *                 description: ID источника поля
     *               targetFieldIds:
     *                 type: array
     *                 items:
     *                   type: integer
     *                 description: Массив ID целевых полей
     *     responses:
     *       200:
     *         description: Результат операции копирования
     */
  /**
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  static async copyfield(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      let result = await metaCopyInfofieldsService.copyfield(id, body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = metaCopyInfofieldsController;