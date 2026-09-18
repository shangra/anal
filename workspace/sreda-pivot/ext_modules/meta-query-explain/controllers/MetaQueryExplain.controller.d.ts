export = MetaQueryExplainController;
declare class MetaQueryExplainController {
    /**
     * @swagger
     * /metadata/query-explain/:id:
     *   get:
     *     summary: Получить историю формирования запроса
     *     tags: [QueryExplain]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: id записи
     *         in: query
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         - name: id
     *           description: id записи
     *         - name: answerId
     *           description: id запроса
     *         - name: plan
     *           description: план выполнения запроса
     */
    static get(req: any, res: any, next: any): Promise<void>;
    /**
     * @swagger
     * /metadata/query-explain/meta/:id:
     *   get:
     *     summary: Получить мету по id
     *     tags: [QueryExplain]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: id записи
     *         in: query
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         - name: id
     *           description: id записи
     *         - name: meta
     *           description: данные по запросу
     */
    static getMeta(req: any, res: any, next: any): Promise<void>;
    /**
     * @swagger
     * /metadata/query-explain/:id:
     *   delete:
     *     summary: удалить мету по id
     *     tags: [QueryExplain]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: id записи
     *         in: query
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         - name: result
     *           description: результат выполнения запроса
     */
    static del(req: any, res: any, next: any): Promise<void>;
}
//# sourceMappingURL=MetaQueryExplain.controller.d.ts.map
