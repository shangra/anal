const KeysServiceClass = require('../services/Keys.service');
const KeysService = new KeysServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Keys
 *     description: Управление метаданными ключей
 */
class KeysController {
  /**
     * @swagger
     * /keys/metadata:
     *   get:
     *     summary: Получить метаданные всех ключей
     *     tags: [Keys]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     responses:
     *       200:
     *         description: Метаданные всех ключей
     */
  static async metadata(req, res, next) {
    try {
      const form = await KeysService.metadata();
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /keys/metadata/{id}:
     *   get:
     *     summary: Получить метаданные ключа по ID
     *     tags: [Keys]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: ID ключа
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные ключа
     */
  static async metadataItem(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await KeysService.metadataItem(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /keys/metadata:
     *   post:
     *     summary: Создать метаданные нового ключа
     *     tags: [Keys]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/KeyMetadata'
     *     responses:
     *       200:
     *         description: Созданные метаданные ключа
     */
  static async createMetadata(req, res, next) {
    try {
      const {
        body
      } = req;
      const form = await KeysService.createMetadata(body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /keys/metadata/{id}:
     *   put:
     *     summary: Обновить метаданные ключа
     *     tags: [Keys]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: ID ключа
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/KeyMetadata'
     *     responses:
     *       200:
     *         description: Обновленные метаданные ключа
     */
  static async updateMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const form = await KeysService.updateMetadata(id, body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /keys/metadata/{id}:
     *   delete:
     *     summary: Удалить метаданные ключа
     *     tags: [Keys]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: ID ключа
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления метаданных ключа
     */
  static async deleteMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await KeysService.deleteMetadata(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = KeysController;