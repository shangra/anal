const ServiceClass = require('../services/TabularParts.service');
const Service = new ServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Табличные части
 *     description: Управление табличными частями
 */
class TabularPartsController {
  /**
     * @swagger
     * /TabularParts/metadata:
     *   get:
     *     summary: Получить метаданные всех табличных частей
     *     tags: [Табличные части]
     *     security:
     *       - AccessToken: []
     *     responses:
     *       200:
     *         description: Метаданные всех табличных частей
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
     * /TabularParts/metadata/{id}:
     *   get:
     *     summary: Получить метаданные конкретной табличной части
     *     tags: [Табличные части]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор табличной части
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные табличной части
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
     * /TabularParts/metadata:
     *   post:
     *     summary: Создать новую табличную часть
     *     tags: [Табличные части]
     *     security:
     *       - AccessToken: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/TabularPart'
     *     responses:
     *       200:
     *         description: Новая табличная часть создана успешно
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
     * /TabularParts/metadata/{id}:
     *   put:
     *     summary: Обновить существующую табличную часть
     *     tags: [Табличные части]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор табличной части
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/TabularPart'
     *     responses:
     *       200:
     *         description: Табличная часть обновлена успешно
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
     * /TabularParts/metadata/{id}:
     *   delete:
     *     summary: Удалить табличную часть
     *     tags: [Табличные части]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор табличной части
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Табличная часть удалена успешно
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
     * /TabularParts/{id}/{tabular}:
     *   post:
     *     summary: Создать запись в табличной части
     *     tags: [Табличные части]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор родительского элемента
     *         in: path
     *         required: true
     *         type: string
     *       - name: tabular
     *         description: Имя табличной части
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/TabularRecord'
     *     responses:
     *       200:
     *         description: Запись в табличной части создана успешно
     */
  static async create(req, res, next) {
    try {
      const id = req.params.id;
      const tabular = req.params.tabular;
      const body = req.body;
      const metadata = await Service.create(id, tabular, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /TabularParts/{id}/{tabular}:
     *   get:
     *     summary: Получить записи из табличной части
     *     tags: [Табличные части]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор родительского элемента
     *         in: path
     *         required: true
     *         type: string
     *       - name: tabular
     *         description: Имя табличной части
     *         in: path
     *         required: true
     *         type: string
     *       - name: options
     *         description: Дополнительные параметры фильтрации
     *         in: query
     *         required: false
     *         type: string
     *     responses:
     *       200:
     *         description: Список записей из табличной части
     */
  static async read(req, res, next) {
    try {
      const id = req.params.id;
      const tabular = req.params.tabular;
      let options = req.query.options ?? '{}';
      options = JSON.parse(options);
      const metadata = await Service.read(id, tabular, options);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /TabularParts/{id}/{tabular}:
     *   put:
     *     summary: Обновить запись в табличной части
     *     tags: [Табличные части]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор родительского элемента
     *         in: path
     *         required: true
     *         type: string
     *       - name: tabular
     *         description: Имя табличной части
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/TabularRecord'
     *     responses:
     *       200:
     *         description: Запись в табличной части обновлена успешно
     */
  static async update(req, res, next) {
    try {
      const id = req.params.id;
      const tabular = req.params.tabular;
      const body = req.body;
      const metadata = await Service.update(id, tabular, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /TabularParts/{id}/{tabular}:
     *   delete:
     *     summary: Удалить запись из табличной части
     *     tags: [Табличные части]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор родительского элемента
     *         in: path
     *         required: true
     *         type: string
     *       - name: tabular
     *         description: Имя табличной части
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/TabularRecord'
     *     responses:
     *       200:
     *         description: Запись удалена успешно
     */
  static async delete(req, res, next) {
    try {
      const id = req.params.id;
      const tabular = req.params.tabular;
      const body = req.body;
      const metadata = await Service.delete(id, tabular, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = TabularPartsController;