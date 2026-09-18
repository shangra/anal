const IndexesServiceClass = require('../services/Indexes.service');
const IndexesService = new IndexesServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Indexes
 *     description: Метаданные индексов
 */
class IndexesController {
  /**
     * @swagger
     * /indexes/metadata:
     *   get:
     *     summary: Получение метаданных всех индексов
     *     tags: [Indexes]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     responses:
     *       200:
     *         description: Метаданные индексов
     */
  static async metadata(req, res, next) {
    try {
      const form = await IndexesService.metadata();
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /indexes/metadata/{id}:
     *   get:
     *     summary: Получение метаданных индекса по ID
     *     tags: [Indexes]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: ID индекса
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные индекса
     */
  static async metadataItem(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await IndexesService.metadataItem(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /indexes/metadata:
     *   post:
     *     summary: Создание новых метаданных индекса
     *     tags: [Indexes]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/IndexMetadata'
     *     responses:
     *       200:
     *         description: Созданные метаданные индекса
     */
  static async createMetadata(req, res, next) {
    try {
      const {
        body
      } = req;
      const form = await IndexesService.createMetadata(body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /indexes/metadata/{id}:
     *   put:
     *     summary: Обновление метаданных индекса
     *     tags: [Indexes]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: ID индекса
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/IndexMetadata'
     *     responses:
     *       200:
     *         description: Обновленные метаданные индекса
     */
  static async updateMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const form = await IndexesService.updateMetadata(id, body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /indexes/metadata/{id}:
     *   delete:
     *     summary: Удаление метаданных индекса
     *     tags: [Indexes]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: ID индекса
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления метаданных индекса
     */
  static async deleteMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await IndexesService.deleteMetadata(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = IndexesController;