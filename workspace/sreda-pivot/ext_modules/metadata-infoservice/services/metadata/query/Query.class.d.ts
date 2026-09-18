export = QueryBuilderClass;
declare class QueryBuilderClass {
    constructor({
        connector,
        meta,
        select,
        account,
        logger,
    }: {
        connector: any;
        meta: any;
        select: any;
        account: any;
        logger: any;
    });
    connector: any;
    meta: any;
    select: any;
    account: any;
    logger: any;
    query({
        id,
        options,
        treeObject,
        from,
    }: {
        id: any;
        options: any;
        treeObject: any;
        from: any;
    }): Promise<{
        rows: any[];
        count: any;
        refsToParse: {};
        additionalRefs: any;
        additionalRefsFields: any;
    }>;
    getRefData({
        options,
        from,
        refsToParse,
        id,
    }: {
        options: any;
        from: any;
        refsToParse: any;
        id: any;
    }): Promise<{
        rows: any[];
        count: number;
    }>;
    /**
     * Метод для перегрузки выборки из бд
     *
     * @param {Object} from - Запрос для orm
     *
     * @private
     */
    private getData;
    /**
     * метод для перегрузки выборки из бд
     * @private
     */
    private countData;
    generateSql({ options, from }: { options: any; from: any }): Promise<{
        limit: any;
        offset: any;
        order: any;
        sql: any;
        refsToParse: any;
    }>;
}
//# sourceMappingURL=Query.class.d.ts.map
