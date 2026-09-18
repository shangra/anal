const RlsCoreServiceClass = require('../services/RlsCore.service');
const RlsCoreService = new RlsCoreServiceClass();

/**
 * @swagger
 * tags:
 *   - name: RlsCore
 *     description: расширение
 */
class RlsCoreController {
  /**
   * @swagger
   * /rls/{table_name}/{table_id}/{owner}:
   *   get:
   *     summary: Информация о всех доступах к сущности определенных владельцев
   *     tags: [RlsCore]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: table_name
   *         description: Имя таблицы сущности в базе данных
   *         in: path
   *         required: true
   *         type: string
   *       - name: table_id
   *         description: UUID сущности
   *         in: path
   *         required: true
   *         type: string
   *       - name: owner
   *         description: Имя владельца доступа
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Массив объектов с сущностями Rls
   */
  static async getPermissions(req, res, next) {
    res.locals.description = 'Просмотр доступов к содержимому портала';
    try {
      const {
        table_name,
        table_id,
        owner
      } = req.params;
      const {
        type
      } = req.query;
      const permissions = await RlsCoreService.getPermissions(table_name, table_id, owner, type);
      res.json(permissions);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /rls/{table_name}/{table_id}/{owner}:
   *   post:
   *     summary: Выдача доступа к сущности определенному владельцу
   *     tags: [RlsCore]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: table_name
   *         description: Имя таблицы сущности в базе данных
   *         in: path
   *         required: true
   *         type: string
   *       - name: table_id
   *         description: UUID сущности
   *         in: path
   *         required: true
   *         type: string
   *       - name: owner
   *         description: Имя владельца доступа
   *         in: path
   *         required: true
   *         type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *               type: object
   *               properties:
   *                 role_id:
   *                   type: string
   *                   description: UUID роли
   *                 rule_id:
   *                   type: string
   *                   description: UUID права
   *                 group_id:
   *                   type: string
   *                   description: UUID группы
   *                 user_id:
   *                   type: string
   *                   description: UUID пользователя
   *     responses:
   *       200:
   *         description: Объект с result = true
   */
  static async addPermission(req, res, next) {
    res.locals.description = 'Добавление доступа к содержимому портала';
    try {
      const {
        table_name,
        table_id,
        owner
      } = req.params;
      const {
        type
      } = req.query;
      const ownerName = `${owner.slice(0, -1)}_id`;
      const owner_id = req.body[ownerName];
      await RlsCoreService.addPermissionNested(table_name, table_id, type, owner, owner_id);
      res.json({
        result: true
      });
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /rls/{table_name}/{table_id}/{owner}:
   *   delete:
   *     summary: Удаление доступа к сущности определенному владельцу
   *     tags: [RlsCore]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: table_name
   *         description: Имя таблицы сущности в базе данных
   *         in: path
   *         required: true
   *         type: string
   *       - name: table_id
   *         description: UUID сущности
   *         in: path
   *         required: true
   *         type: string
   *       - name: owner
   *         description: Имя владельца доступа
   *         in: path
   *         required: true
   *         type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *               type: object
   *               description: Имя свойства в теле запроса и имя владельца из параметров должны соответствовать друг другу
   *               properties:
   *                 role_id:
   *                   type: string
   *                   description: UUID роли
   *                 rule_id:
   *                   type: string
   *                   description: UUID права
   *                 group_id:
   *                   type: string
   *                   description: UUID группы
   *                 user_id:
   *                   type: string
   *                   description: UUID пользователя
   *     responses:
   *       200:
   *         description: Объект с result = true
   */
  static async delPermission(req, res, next) {
    res.locals.description = 'Удаление доступа к содержимому портала';
    try {
      const {
        table_name,
        table_id,
        owner
      } = req.params;
      const {
        type
      } = req.query;
      const ownerName = `${owner.slice(0, -1)}_id`;
      const owner_id = req.body[ownerName];
      await RlsCoreService.delPermissionNested(table_name, table_id, type, owner, owner_id);
      res.json({
        result: true
      });
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /rls/status/{table_name}/{table_id}:
   *   get:
   *     summary: Информация о доступе текущего пользователя к сущности
   *     tags: [RlsCore]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: table_name
   *         description: Имя таблицы сущности в базе данных
   *         in: path
   *         required: true
   *         type: string
   *       - name: table_id
   *         description: UUID сущности
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Объект с флагами isRead, isWrite, isDelete
   */
  static async getAccessStatus(req, res, next) {
    res.locals.description = 'Просмотр статусов доступа пользователя к контенту';
    try {
      const {
        table_name,
        table_id
      } = req.params;
      const status = await RlsCoreService.getAccessStatus(table_name, table_id);
      res.json(status);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /rls/status/multi/{table_name}:
   *   get:
   *     summary: Информация о доступе текущего пользователя к массиву сущностей
   *     tags: [RlsCore]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: table_name
   *         description: Имя таблицы сущностей в базе данных
   *         in: path
   *         required: true
   *         type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *               type: object
   *               properties:
   *                 ids:
   *                   type: array
   *                   items:
   *                     type: string
   *                     description: UUID сущности
   *     responses:
   *       200:
   *         description: Массив объектов с флагами isRead, isWrite, isDelete
   */
  static async getAccessStatusMulti(req, res, next) {
    try {
      const {
        ids
      } = req.body;
      const {
        table_name
      } = req.params;
      const status = await RlsCoreService.getAccessStatusMulti(table_name, ids);
      res.json(status);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = RlsCoreController;