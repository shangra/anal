export = RlsCoreController;
/**
 * @swagger
 * tags:
 *   - name: RlsCore
 *     description: расширение
 */
declare class RlsCoreController {
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
    static getPermissions(req: any, res: any, next: any): Promise<void>;
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
    static addPermission(req: any, res: any, next: any): Promise<void>;
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
    static delPermission(req: any, res: any, next: any): Promise<void>;
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
    static getAccessStatus(req: any, res: any, next: any): Promise<void>;
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
    static getAccessStatusMulti(req: any, res: any, next: any): Promise<void>;
}
//# sourceMappingURL=RlsCore.controller.d.ts.map
