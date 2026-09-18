const InfoserviceGuideServiceClass = require('../services/InfoserviceGuide.service');
const InfoserviceGuideService = new InfoserviceGuideServiceClass();
/**
 * @swagger
 * tags:
 *   - name: InfoservicesGuide
 *     description: Контроллер управления метаданными информационных сервисов
 */
class InfoservicesGuideController {
  /**
     * @swagger
     * /infoservices/metadata:
     *   get:
     *     summary: Получить метаданные всех информационных сервисов
     *     tags: [InfoservicesGuide]
     *     security:
     *       - AccessToken: []
     *     responses:
     *       200:
     *         description: Метаданные информационных сервисов
     */
  static async metadata(req, res, next) {
    try {
      const form = await InfoserviceGuideService.metadata();
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/metadata/{id}:
     *   get:
     *     summary: Получить метаданные информационного сервиса по ID
     *     tags: [InfoservicesGuide]
     *     security:
     *       - AccessToken: []
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
      const form = await InfoserviceGuideService.metadataItem(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/metadata:
     *   post:
     *     summary: Создать новые метаданные информационного сервиса
     *     tags: [InfoservicesGuide]
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
     *         description: Новые метаданные созданы успешно
     */
  static async createMetadata(req, res, next) {
    try {
      const {
        body
      } = req;
      const form = await InfoserviceGuideService.createMetadata(body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/metadata/{id}:
     *   put:
     *     summary: Обновить метаданные информационного сервиса
     *     tags: [InfoservicesGuide]
     *     security:
     *       - AccessToken: []
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
     *         description: Метаданные обновлены успешно
     */
  static async updateMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const form = await InfoserviceGuideService.updateMetadata(id, body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/metadata/{id}:
     *   delete:
     *     summary: Удалить метаданные информационного сервиса
     *     tags: [InfoservicesGuide]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные удалены успешно
     */
  static async deleteMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await InfoserviceGuideService.deleteMetadata(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/{id}:
     *   post:
     *     summary: Создать информационный сервис
     *     tags: [InfoservicesGuide]
     *     security:
     *       - AccessToken: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/InfoService'
     *     responses:
     *       200:
     *         description: Информационный сервис создан успешно
     */
  static async create(req, res, next) {
    try {
      const body = req.body;
      const metadata = await InfoserviceGuideService.create(body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/{id}:
     *   get:
     *     summary: Получить информацию об информационном сервисе
     *     tags: [InfoservicesGuide]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор информационного сервиса
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Информация об информационном сервисе
     */
  static async read(req, res, next) {
    try {
      const id = req.params.id;
      let options = req.query.options ?? '{}';
      options = JSON.parse(options);
      const metadata = await InfoserviceGuideService.read(id, options);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/{id}:
     *   put:
     *     summary: Обновить информацию об информационном сервисе
     *     tags: [InfoservicesGuide]
     *     security:
     *       - AccessToken: []
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
     *         description: Информационный сервис обновлен успешно
     */
  static async update(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      const metadata = await InfoserviceGuideService.update(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /infoservices/{id}:
     *   delete:
     *     summary: Удалить информационный сервис
     *     tags: [InfoservicesGuide]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор информационного сервиса
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Информационный сервис удален успешно
     */
  static async delete(req, res, next) {
    try {
      const id = req.params.id;
      const metadata = await InfoserviceGuideService.delete(id);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = InfoservicesGuideController;