const RlsUIServiceClass = require('../services/RlsUI.service');
const RlsUIService = new RlsUIServiceClass();

/**
 * @swagger
 * tags:
 *   - name: RlsUI
 *     description: расширение
 */
class RlsUIController {
    /**
     * @swagger
     * /rls/{table_name}/{table_id}/permissions:
     *   get:
     *     summary: Получение всех владельцев, имеющих доступ к указанной сущности
     *     tags: [RlsUI]
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
     *         description: Объект {groups, users, roles, rules}
     */
    static async getAllPermissions(req, res, next) {
        res.locals.description =
            'Просмотр всех элементов ролевой модели, имеющих доступ к указанной сущности';
        try {
            const { table_name, table_id } = req.params;
            const { type } = req.query;
            const permissions = await RlsUIService.getAllPermissions(
                table_name,
                table_id,
                type
            );
            res.json(permissions);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /rls/meta/{table_name}/{table_id}/{owner}:
     *   get:
     *     summary: Получение владельцев одного типа, имеющих доступ к указанной сущности
     *     tags: [RlsUI]
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
     *         description: Массив объектов с данными владельца
     */
    static async getPermissionsMeta(req, res, next) {
        res.locals.description =
            'Просмотр всех элементов ролевой модели одного типа, имеющих доступ к указанной сущности';
        try {
            const { table_name, table_id, owner } = req.params;
            const { type } = req.query;
            const permissions = await RlsUIService.getPermissionsMeta(
                table_name,
                table_id,
                owner,
                type
            );
            res.json(permissions);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /rls/meta/{table_name}/{table_id}/{owner}:
     *   get:
     *     summary: Получение владельцев одного типа, имеющих доступ к указанной сущности
     *     tags: [RlsUI]
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
     *         description: Массив объектов с данными владельца
     */
    static async getEntityAllTypePermissions(req, res, next) {
        res.locals.description =
            'Просмотр всех элементов ролевой модели одного типа, имеющих доступ к указанной сущности';
        try {
            const { table_name, table_id, owner } = req.params;
            const permissions = await RlsUIService.getEntityAllTypePermissions(
                table_name,
                table_id,
                owner
            );
            res.json(permissions);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = RlsUIController;
