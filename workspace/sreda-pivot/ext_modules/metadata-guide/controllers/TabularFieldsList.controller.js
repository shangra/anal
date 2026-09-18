const ServiceClass = require('../services/TabularFieldsList.service');
const Service = new ServiceClass();
class TabularFieldsListController {
  /**
     * @swagger
     * /TabularFieldsList/metadata:
     *   get:
     *     summary: Получение списка метаданных табличных полей
     *     tags: [TabularFieldsList]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Список метаданных
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
     * /TabularFieldsList/metadata/{id}:
     *   get:
     *     summary: Получение метаданных табличного поля по ID
     *     tags: [TabularFieldsList]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные табличного поля
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
     * /TabularFieldsList/metadata:
     *   post:
     *     summary: Создание новых метаданных табличного поля
     *     tags: [TabularFieldsList]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Metadata'
     *     responses:
     *       200:
     *         description: Созданные метаданные
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
     * /TabularFieldsList/metadata/{id}:
     *   put:
     *     summary: Обновление метаданных табличного поля
     *     tags: [TabularFieldsList]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных
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
     *         description: Обновленные метаданные
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
     * /TabularFieldsList/metadata/{id}:
     *   delete:
     *     summary: Удаление метаданных табличного поля
     *     tags: [TabularFieldsList]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных
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
}
module.exports = TabularFieldsListController;