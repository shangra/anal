const SchemaServiceClass = require('../services/SchemasManager.service');
const schemaService = new SchemaServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Schemas Manager
 *     description: Управление схемами
 */
class PivotTableController {
  /**
     * @swagger
     * /schemas-manager/{ownerId}/available:
     *   get:
     *     summary: Получить все схемы владельца
     *     tags: [Schemas Manager]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: ownerId
     *         description: ID владельца схем
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Список всех схем владельца
     */
  static async getAllSchemas(req, res, next) {
    try {
      const {
        ownerId
      } = req.params;
      const {
        ver
      } = req.params;
      const result = await schemaService.getAllSchemas(ownerId);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /schemas-manager/{ownerId}/{schemaId}:
     *   get:
     *     summary: Получить схему по ID
     *     tags: [Schemas Manager]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: ownerId
     *         description: ID владельца схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - name: schemaId
     *         description: ID схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Схема по указанному ID
     */
  static async getSchema(req, res, next) {
    try {
      const {
        ownerId,
        schemaId
      } = req.params;
      const {
        ver
      } = req.params;
      const result = await schemaService.getSchema(ownerId, schemaId);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /schemas-manager/{ownerId}:
     *   post:
     *     summary: Создать новую схему
     *     tags: [Schemas Manager]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: ownerId
     *         description: ID владельца новой схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               shemaInfo:
     *                 type: object
     *               schema:
     *                 type: object
     *               snapshot:
     *                 type: object
     *     responses:
     *       200:
     *         description: Новая схема создана успешно
     */
  static async createSchema(req, res, next) {
    try {
      const {
        ownerId
      } = req.params;
      const {
        shemaInfo,
        schema,
        snapshot
      } = req.body;
      const {
        ver
      } = req.params;
      const result = await schemaService.createSchema(ownerId, shemaInfo, schema, snapshot);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /schemas-manager/{ownerId}/{schemaId}:
     *   put:
     *     summary: Обновить существующую схему
     *     tags: [Schemas Manager]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: ownerId
     *         description: ID владельца схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - name: schemaId
     *         description: ID схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               shemaInfo:
     *                 type: object
     *               schema:
     *                 type: object
     *               snapshot:
     *                 type: object
     *     responses:
     *       200:
     *         description: Схема обновлена успешно
     */
  static async editSchema(req, res, next) {
    try {
      const {
        ownerId,
        schemaId
      } = req.params;
      const {
        shemaInfo,
        schema,
        snapshot
      } = req.body;
      const {
        ver
      } = req.params;
      const result = await schemaService.editSchema(ownerId, schemaId, shemaInfo, schema, snapshot);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /schemas-manager/{ownerId}/{schemaId}:
     *   delete:
     *     summary: Удалить схему
     *     tags: [Schemas Manager]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: ownerId
     *         description: ID владельца схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - name: schemaId
     *         description: ID схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Схема удалена успешно
     */
  static async delSchema(req, res, next) {
    try {
      const {
        ownerId,
        schemaId
      } = req.params;
      const {
        ver
      } = req.params;
      const result = await schemaService.delSchema(ownerId, schemaId);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /schemas-manager/permissions/{ownerId}/{schemaId}:
     *   post:
     *     summary: Установить разрешения на схему
     *     tags: [Schemas Manager]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: ownerId
     *         description: ID владельца схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - name: schemaId
     *         description: ID схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               user_id:
     *                 type: string
     *                 format: uuid
     *     responses:
     *       200:
     *         description: Разрешения установлены успешно
     */
  static async setPermissions(req, res, next) {
    try {
      const {
        ownerId,
        schemaId
      } = req.params;
      const {
        ver
      } = req.params;
      const ownerName = `user_id`;
      const user_id = req.body[ownerName];
      const result = await schemaService.setPermissions(ownerId, schemaId, user_id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /schemas-manager/permissions/{ownerId}/{schemaId}:
     *   put:
     *     summary: Обновить разрешения на запись для схемы
     *     tags: [Schemas Manager]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: ownerId
     *         description: ID владельца схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - name: schemaId
     *         description: ID схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               user_id:
     *                 type: string
     *                 format: uuid
     *     responses:
     *       200:
     *         description: Разрешения на запись обновлены успешно
     */
  static async putPermissions(req, res, next) {
    try {
      const {
        ownerId,
        schemaId
      } = req.params;
      const {
        ver
      } = req.params;
      const ownerName = `user_id`;
      const user_id = req.body[ownerName];
      const result = await schemaService.setPermissions(ownerId, schemaId, user_id, 'write');
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /schemas-manager/permissions/{ownerId}/{schemaId}:
     *   delete:
     *     summary: Удалить разрешения для схемы
     *     tags: [Schemas Manager]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: ownerId
     *         description: ID владельца схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *       - name: schemaId
     *         description: ID схемы
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               user_id:
     *                 type: string
     *                 format: uuid
     *     responses:
     *       200:
     *         description: Разрешения удалены успешно
     */
  static async delPermissions(req, res, next) {
    try {
      const {
        ownerId,
        schemaId
      } = req.params;
      const {
        ver
      } = req.params;
      const ownerName = `user_id`;
      const user_id = req.body[ownerName];
      console.log('delPermissions', ownerId, schemaId);
      const result = await schemaService.delPermissions(ownerId, schemaId, user_id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = PivotTableController;