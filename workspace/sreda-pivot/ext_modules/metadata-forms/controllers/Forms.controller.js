const FormsServiceClass = require('../services/Forms.service');
const FormsService = new FormsServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Forms
 *     description: Управление формами
 */
class FormsController {
  /**
     * @swagger
     * /forms/metadata:
     *   get:
     *     summary: Получить метаданные всех форм
     *     tags: [Forms]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Метаданные всех форм
     */
  static async metadata(req, res, next) {
    try {
      const form = await FormsService.metadata();
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /forms/metadata/{id}:
     *   get:
     *     summary: Получить метаданные формы по ID
     *     tags: [Forms]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID формы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные формы
     */
  static async metadataItem(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await FormsService.metadataItem(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /forms/metadata:
     *   post:
     *     summary: Создать новую форму
     *     tags: [Forms]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Form'
     *     responses:
     *       200:
     *         description: Новая форма создана успешно
     */
  static async createMetadata(req, res, next) {
    try {
      const {
        body
      } = req;
      const form = await FormsService.createMetadata(body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /forms/metadata/{id}:
     *   put:
     *     summary: Обновить форму по ID
     *     tags: [Forms]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID формы
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Form'
     *     responses:
     *       200:
     *         description: Форма обновлена успешно
     */
  static async updateMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const form = await FormsService.updateMetadata(id, body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /forms/metadata/{id}:
     *   delete:
     *     summary: Удалить форму по ID
     *     tags: [Forms]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID формы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Форма удалена успешно
     */
  static async deleteMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await FormsService.deleteMetadata(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /forms:
     *   post:
     *     summary: Создать новую запись формы
     *     tags: [Forms]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/FormData'
     *     responses:
     *       200:
     *         description: Запись формы создана успешно
     */
  static async create(req, res, next) {
    try {
      const {
        body
      } = req;
      const metadata = await FormsService.create(body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /forms/{id}:
     *   get:
     *     summary: Получить запись формы по ID
     *     tags: [Forms]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID записи формы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Запись формы получена успешно
     */
  static async read(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const options = req.query.options && JSON.parse(req.query.options);
      const metadata = await FormsService.read(id, options);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /forms/{id}:
     *   put:
     *     summary: Обновить запись формы по ID
     *     tags: [Forms]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID записи формы
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/FormData'
     *     responses:
     *       200:
     *         description: Запись формы обновлена успешно
     */
  static async update(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const metadata = await FormsService.update(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /forms/{id}:
     *   delete:
     *     summary: Удалить запись формы по ID
     *     tags: [Forms]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID записи формы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Запись формы удалена успешно
     */
  static async delete(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const metadata = await FormsService.delete(id);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = FormsController;