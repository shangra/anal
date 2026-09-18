const metaMatrixServiceClass = require('../services/metaMatrix.service');
const metaMatrixService = new metaMatrixServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Meta Matrix
 *     description: Методы работы с матрицей метаданных
 */
class metaMatrixController {
  /**
     * @swagger
     * /metaMatrix/matrix/{id}:
     *   get:
     *     summary: Получение матрицы метаданных по идентификатору
     *     tags: [Meta Matrix]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Идентификатор матрицы метаданных
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Матрица метаданных
     */
  static async matrix(req, res, next) {
    try {
      const {
        id
      } = req.params;
      let result = await metaMatrixService.matrix(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = metaMatrixController;