const metaNewCubePageServiceClass = require('../services/metaNewCubePage.service');
const metaNewCubePageService = new metaNewCubePageServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Meta New Cube Page
 *     description: Методы для управления новой кубической страницей
 */
class metaNewCubePageController {
  /**
     * @swagger
     * /metaNewCubePage/{id}:
     *   get:
     *     summary: Получить информацию о странице
     *     tags: [Meta New Cube Page]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: ID запрашиваемой страницы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Информация о запрошенной странице
     */
  static async get(req, res, next) {
    try {
      const {
        id
      } = req.params;
      let result = await metaNewCubePageService.get(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /metaNewCubePage/{id}:
     *   post:
     *     summary: Создать куб на странице
     *     tags: [Meta New Cube Page]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: ID страницы
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Параметры создаваемого куба
     *     responses:
     *       200:
     *         description: Результат создания куба
     */
  static async postCube(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const body = req.body;
      let result = await metaNewCubePageService.postCube(id, body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /metaNewCubePage/{id}/report:
     *   post:
     *     summary: Создать отчет на странице
     *     tags: [Meta New Cube Page]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: ID страницы
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Параметры создаваемого отчета
     *     responses:
     *       200:
     *         description: Результат создания отчета
     */
  static async postReport(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const body = req.body;
      let result = await metaNewCubePageService.postReport(id, body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = metaNewCubePageController;