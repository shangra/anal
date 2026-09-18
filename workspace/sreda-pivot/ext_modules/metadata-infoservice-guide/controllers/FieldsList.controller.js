const FieldsListServiceClass = require('../services/FieldsList.service');
const FieldsListService = new FieldsListServiceClass();
/**
 * @swagger
 * tags:
 *   - name: FieldsList
 *     description: Управление метаданными полей списка
 */
class FieldsListController {
  /**
     * @swagger
     * /fieldslist/metadata:
     *   get:
     *     summary: Получение всех метаданных полей списка
     *     tags: [FieldsList]
     *     security:
     *       - AccessToken: []
     *     responses:
     *       200:
     *         description: Метаданные полей списка
     */
  static async metadata(req, res, next) {
    try {
      const form = await FieldsListService.metadata();
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fieldslist/metadata/{id}:
     *   get:
     *     summary: Получение метаданных поля списка по ID
     *     tags: [FieldsList]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: ID метаданных поля списка
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные поля списка
     */
  static async metadataItem(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await FieldsListService.metadataItem(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fieldslist/metadata:
     *   post:
     *     summary: Создание новых метаданных поля списка
     *     tags: [FieldsList]
     *     security:
     *       - AccessToken: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Metadata'
     *     responses:
     *       200:
     *         description: Созданные метаданные поля списка
     */
  static async createMetadata(req, res, next) {
    try {
      const {
        body
      } = req;
      const form = await FieldsListService.createMetadata(body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fieldslist/metadata/{id}:
     *   put:
     *     summary: Обновление метаданных поля списка
     *     tags: [FieldsList]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: ID метаданных поля списка
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Metadata'
     *     responses:
     *       200:
     *         description: Обновленные метаданные поля списка
     */
  static async updateMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const form = await FieldsListService.updateMetadata(id, body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fieldslist/metadata/{id}:
     *   delete:
     *     summary: Удаление метаданных поля списка
     *     tags: [FieldsList]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: ID метаданных поля списка
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления метаданных поля списка
     */
  static async deleteMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await FieldsListService.deleteMetadata(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = FieldsListController;