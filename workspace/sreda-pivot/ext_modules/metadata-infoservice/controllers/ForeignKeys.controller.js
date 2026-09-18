const ForeignKeysServiceClass = require('../services/ForeignKeys.service');
const ForeignKeysService = new ForeignKeysServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Foreign Keys
 *     description: Управление метаданными внешних ключей
 */
class ForeignKeysController {
  /**
       * @swagger
       * /foreignkeys/metadata:
       *   get:
       *     summary: Получить метаданные всех внешних ключей
       *     tags: [Foreign Keys]
       *     security:
       *       - Adminpanel: []
       *       - MetadataAdmin: []
       *     responses:
       *       200:
       *         description: Метаданные внешних ключей
       */
  static async metadata(req, res, next) {
    try {
      const form = await ForeignKeysService.metadata();
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
       * @swagger
       * /foreignkeys/metadata/{id}:
       *   get:
       *     summary: Получить метаданные внешнего ключа по ID
       *     tags: [Foreign Keys]
       *     security:
       *       - Adminpanel: []
       *       - MetadataAdmin: []
       *     parameters:
       *       - name: id
       *         description: ID внешнего ключа
       *         in: path
       *         required: true
       *         type: string
       *     responses:
       *       200:
       *         description: Метаданные внешнего ключа
       */
  static async metadataItem(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await ForeignKeysService.metadataItem(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
       * @swagger
       * /foreignkeys/metadata:
       *   post:
       *     summary: Создать метаданные нового внешнего ключа
       *     tags: [Foreign Keys]
       *     security:
       *       - Adminpanel: []
       *       - MetadataAdmin: []
       *     requestBody:
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             $ref: '#/components/schemas/ForeignKey'
       *     responses:
       *       200:
       *         description: Созданные метаданные внешнего ключа
       */
  static async createMetadata(req, res, next) {
    try {
      const {
        body
      } = req;
      const form = await ForeignKeysService.createMetadata(body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
       * @swagger
       * /foreignkeys/metadata/{id}:
       *   put:
       *     summary: Обновить метаданные внешнего ключа
       *     tags: [Foreign Keys]
       *     security:
       *       - Adminpanel: []
       *       - MetadataAdmin: []
       *     parameters:
       *       - name: id
       *         description: ID внешнего ключа
       *         in: path
       *         required: true
       *         type: string
       *     requestBody:
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             $ref: '#/components/schemas/ForeignKey'
       *     responses:
       *       200:
       *         description: Обновленные метаданные внешнего ключа
       */
  static async updateMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const form = await ForeignKeysService.updateMetadata(id, body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
       * @swagger
       * /foreignkeys/metadata/{id}:
       *   delete:
       *     summary: Удалить метаданные внешнего ключа
       *     tags: [Foreign Keys]
       *     security:
       *       - Adminpanel: []
       *       - MetadataAdmin: []
       *     parameters:
       *       - name: id
       *         description: ID внешнего ключа
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
      const form = await ForeignKeysService.deleteMetadata(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = ForeignKeysController;