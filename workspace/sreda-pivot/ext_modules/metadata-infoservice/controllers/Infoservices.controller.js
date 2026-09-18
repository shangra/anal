const InfoservicesServiceClass = require('../services/Infoservice.service');
const InfoservicesService = new InfoservicesServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Infoservices
 *     description: Сервис управления метаданными информационных сервисов
 */
class InfoservicesController {
  /**
     * @swagger
     * /infoservices/metadata:
     *   get:
     *     summary: Получение всех метаданных информационных сервисов
     *     tags: [Infoservices]
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Список метаданных информационных сервисов
     */
  static async metadata(req, res, next) {
    try {
      const form = await InfoservicesService.metadata();
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/metadata/{id}:
     *   get:
     *     summary: Получение метаданных информационного сервиса по ID
     *     tags: [Infoservices]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные информационного сервиса
     */
  static async metadataItem(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await InfoservicesService.metadataItem(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/metadata:
     *   post:
     *     summary: Создание новых метаданных информационного сервиса
     *     tags: [Infoservices]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Metadata'
     *     responses:
     *       200:
     *         description: Созданные метаданные информационного сервиса
     */
  static async createMetadata(req, res, next) {
    try {
      const {
        body
      } = req;
      const form = await InfoservicesService.createMetadata(body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/metadata/{id}:
     *   put:
     *     summary: Обновление метаданных информационного сервиса
     *     tags: [Infoservices]
     *     security:
     *       - BearerAuth: []
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
     *         description: Обновленные метаданные информационного сервиса
     */
  static async updateMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const form = await InfoservicesService.updateMetadata(id, body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/metadata/{id}:
     *   delete:
     *     summary: Удаление метаданных информационного сервиса
     *     tags: [Infoservices]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления метаданных
     */
  static async deleteMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await InfoservicesService.deleteMetadata(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices:
     *   post:
     *     summary: Создание нового информационного сервиса
     *     tags: [Infoservices]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/InfoService'
     *     responses:
     *       200:
     *         description: Созданный информационный сервис
     */
  static async create(req, res, next) {
    try {
      const body = req.body;
      const metadata = await InfoservicesService.create(body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/{id}:
     *   get:
     *     summary: Получение информационного сервиса по ID
     *     tags: [Infoservices]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор информационного сервиса
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Информационный сервис
     */
  static async read(req, res, next) {
    try {
      const id = req.params.id;
      let options = req.query.options ?? '{}';
      options = JSON.parse(options);
      const metadata = await InfoservicesService.read(id, options);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/{id}:
     *   put:
     *     summary: Обновление информационного сервиса
     *     tags: [Infoservices]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор информационного сервиса
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/InfoService'
     *     responses:
     *       200:
     *         description: Обновленный информационный сервис
     */
  static async update(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      const metadata = await InfoservicesService.update(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/{id}:
     *   delete:
     *     summary: Удаление информационного сервиса
     *     tags: [Infoservices]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор информационного сервиса
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления информационного сервиса
     */
  static async delete(req, res, next) {
    try {
      const id = req.params.id;
      const metadata = await InfoservicesService.delete(id);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = InfoservicesController;