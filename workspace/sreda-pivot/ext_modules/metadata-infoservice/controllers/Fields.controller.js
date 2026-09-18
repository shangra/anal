const FieldsServiceClass = require('../services/Fields.service');
const FieldsService = new FieldsServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Fields
 *     description: Управление полями
 */
class FieldsController {
  /**
     * @swagger
     * /fields/metadata:
     *   get:
     *     summary: Получить метаданные всех полей
     *     tags: [Fields]
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
     *     parameters:
     *       - name: id
     *         description: ID поля
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
     *     summary: Создать новое метаданное поля
     *     tags: [Fields]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Данные нового метаданного поля
     *     responses:
     *       200:
     *         description: Новое метаданное поля
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
     *     summary: Обновить метаданные поля
     *     tags: [Fields]
     *     parameters:
     *       - name: id
     *         description: ID поля
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       description: Новые данные метаданных
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Данные для обновления метаданных
     *     responses:
     *       200:
     *         description: Обновленные метаданные поля
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
     *     summary: Удалить метаданные поля
     *     tags: [Fields]
     *     parameters:
     *       - name: id
     *         description: ID поля
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
     *             type: object
     *             description: Данные нового поля
     *     responses:
     *       200:
     *         description: Новое созданное поле
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
     *     summary: Получить информацию о поле по ID
     *     tags: [Fields]
     *     parameters:
     *       - name: id
     *         description: ID поля
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Информация о поле
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
     *     summary: Обновить информацию о поле
     *     tags: [Fields]
     *     parameters:
     *       - name: id
     *         description: ID поля
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       description: Новые данные поля
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Данные для обновления поля
     *     responses:
     *       200:
     *         description: Обновленная информация о поле
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
     *     summary: Удалить поле
     *     tags: [Fields]
     *     parameters:
     *       - name: id
     *         description: ID поля
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