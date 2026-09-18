const FieldsServiceClass = require('../services/Fields.service');
const FieldsService = new FieldsServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Fields
 *     description: Управление полями метаданных
 */
class FieldsController {
  /**
     * @swagger
     * /fields/metadata:
     *   get:
     *     summary: Получить метаданные полей
     *     tags: [Fields]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     responses:
     *       200:
     *         description: Метаданные полей
     */
  static async metadata(req, res, next) {
    try {
      const form = await FieldsService.metadata();
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fields/metadata/{id}:
     *   get:
     *     summary: Получить метаданные поля по ID
     *     tags: [Fields]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор поля
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные поля
     */
  static async metadataItem(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await FieldsService.metadataItem(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fields/metadata:
     *   post:
     *     summary: Создать новое метаполе
     *     tags: [Fields]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Field'
     *     responses:
     *       200:
     *         description: Созданное метаполе
     */
  static async createMetadata(req, res, next) {
    try {
      const {
        body
      } = req;
      const form = await FieldsService.createMetadata(body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fields/metadata/{id}:
     *   put:
     *     summary: Обновить метаполе по ID
     *     tags: [Fields]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор поля
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Field'
     *     responses:
     *       200:
     *         description: Обновлённое метаполе
     */
  static async updateMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const form = await FieldsService.updateMetadata(id, body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fields/metadata/{id}:
     *   delete:
     *     summary: Удалить метаполе по ID
     *     tags: [Fields]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор поля
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления
     */
  static async deleteMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await FieldsService.deleteMetadata(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fields:
     *   post:
     *     summary: Создать новое поле
     *     tags: [Fields]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Field'
     *     responses:
     *       200:
     *         description: Созданное поле
     */
  static async create(req, res, next) {
    try {
      const body = req.body;
      const metadata = await FieldsService.create(body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fields/{id}:
     *   get:
     *     summary: Получить поле по ID
     *     tags: [Fields]
     *     parameters:
     *       - name: id
     *         description: Идентификатор поля
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Поле
     */
  static async read(req, res, next) {
    try {
      const id = req.params.id;
      const metadata = await FieldsService.read(id);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fields/{id}:
     *   put:
     *     summary: Обновить поле по ID
     *     tags: [Fields]
     *     parameters:
     *       - name: id
     *         description: Идентификатор поля
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Field'
     *     responses:
     *       200:
     *         description: Обновлённое поле
     */
  static async update(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      const metadata = await FieldsService.update(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /fields/{id}:
     *   delete:
     *     summary: Удалить поле по ID
     *     tags: [Fields]
     *     parameters:
     *       - name: id
     *         description: Идентификатор поля
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления
     */
  static async delete(req, res, next) {
    try {
      const id = req.params.id;
      const metadata = await FieldsService.delete(id);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = FieldsController;