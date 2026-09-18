export = RlsUIController;
/**
 * @swagger
 * tags:
 *   - name: RlsUI
 *     description: расширение
 */
declare class RlsUIController {
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
    static getAllPermissions(req: any, res: any, next: any): Promise<void>;
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
    static getPermissionsMeta(req: any, res: any, next: any): Promise<void>;
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
    static getEntityAllTypePermissions(
        req: any,
        res: any,
        next: any
    ): Promise<void>;
}
//# sourceMappingURL=RlsUI.controller.d.ts.map
