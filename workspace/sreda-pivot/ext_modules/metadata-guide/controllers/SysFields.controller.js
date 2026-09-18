const ServiceClass = require('../services/SysFields.service');
const Service = new ServiceClass();
/**
 * @swagger
 * tags:
 *   - name: SysFields
 *     description: Управление метаданными полей
 */
class FieldsController {
  /**
     * @swagger
     * /SysFields/metadata:
     *   get:
     *     summary: Получить метаданные всех полей
     *     tags: [SysFields]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     responses:
     *       200:
     *         description: Метаданные всех полей
     */
  static async metadata(req, res, next) {
    try {
      const form = await Service.metadata();
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SysFields/metadata/{id}:
     *   get:
     *     summary: Получить метаданные поля по ID
     *     tags: [SysFields]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
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
      const form = await Service.metadataItem(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SysFields/metadata:
     *   post:
     *     summary: Создать новое метаданных поля
     *     tags: [SysFields]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/FieldMetadata'
     *     responses:
     *       200:
     *         description: Созданные метаданные поля
     */
  static async createMetadata(req, res, next) {
    try {
      const {
        body
      } = req;
      const form = await Service.createMetadata(body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SysFields/metadata/{id}:
     *   put:
     *     summary: Обновить метаданные поля
     *     tags: [SysFields]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: ID поля
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/FieldMetadata'
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
      const form = await Service.updateMetadata(id, body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SysFields/metadata/{id}:
     *   delete:
     *     summary: Удалить метаданные поля
     *     tags: [SysFields]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
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
      const form = await Service.deleteMetadata(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SysFields:
     *   post:
     *     summary: Создать новое поле
     *     tags: [SysFields]
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
      const metadata = await Service.create(body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SysFields/{id}:
     *   get:
     *     summary: Получить информацию о поле по ID
     *     tags: [SysFields]
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
      const metadata = await Service.read(id);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SysFields/{id}:
     *   put:
     *     summary: Обновить информацию о поле
     *     tags: [SysFields]
     *     parameters:
     *       - name: id
     *         description: ID поля
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
     *         description: Обновленная информация о поле
     */
  static async update(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      const metadata = await Service.update(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /SysFields/{id}:
     *   delete:
     *     summary: Удалить поле
     *     tags: [SysFields]
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
      const metadata = await Service.delete(id);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = FieldsController;