export = DefaultClass;
/**
 * @typedef {import("../../../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../../../../../../db/rls/types/WhereOptions.d.ts").WhereOptions} WhereOptions
 * @typedef {import("../behaviour/types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../behaviour/types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../behaviour/types/index").IBehaviourOptions} IBehaviourOptions
 */
/**
 * класс доп функций
 *
 * @class DefaultClass
 * @implements {IQueryBuilerBehavior}
 */
declare class DefaultClass implements IQueryBuilerBehavior {
    /**
     * @param {{
     *    refItem: object,
     *    meta: LeveClassI,
     *    table: string,
     *    field: string | object,
     *    delimeter: string
     * }} param0
     */
    constructor({
        refItem,
        meta,
        table,
        field,
        delimeter,
    }: {
        refItem: object;
        meta: LeveClassI;
        table: string;
        field: string | object;
        delimeter: string;
    });
    /**
     * @public
     *
     * @param {IBehaviourQueryOptions} options
     * @param {string} attribute
     * @param {string} [viewName]
     * @returns {Promise<IBehaviourOptions>}
     */
    public query(
        options: IBehaviourQueryOptions,
        attribute: string,
        viewName?: string
    ): Promise<IBehaviourOptions>;
    /**
     * Формирование первичных атрибутов
     *
     * @public
     *
     * @param {object} options
     * @param {string | object} key
     * @param {string} [viewName]
     * @returns {Promise<IBehaviourOptions>}
     */
    public getSubQuery(
        options: object,
        key: string | object,
        viewName?: string
    ): Promise<IBehaviourOptions>;
    refItem: any;
    meta: import('../../../../../metadata-cmp/services/metadata/source/type/index').default;
    table: string;
    field: any;
    delimeter: string;
    id: any;
    /**
     * флаг который говорит что нужно расчитывать как иерархию
     */
    isHierarchy: boolean;
    NOT: string;
    EQUAL: string;
    NOT_EQUAL: string;
    /**
     * @protected
     *
     * @param {*} where
     * @param {string} attribute
     * @returns
     */
    protected getNeWhere(where: any, attribute: string): {};
    /**
     * очистить where от $eq услоавий заменив их просто на значения
     *
     * @protected
     *
     * @param {*} where
     * @returns
     */
    protected sanitizeWhere(where: any): any;
    /**
     * @protected
     *
     * флаг сообщающий что текущий расчет идет относительно измерения которое будет отображаться в UI
     *
     * @param {{ index: string[], columns: string[] }} settings
     * @param {string} attribute
     * @param {string} viewAlias
     * @returns
     */
    protected isVisible(
        settings: {
            index: string[];
            columns: string[];
        },
        attribute: string,
        viewAlias: string
    ): boolean;
    /**
     * @protected
     *
     * @param {*} where
     * @param {*} attribute
     * @returns
     */
    protected getFilter(where: any, attribute: any): any;
    /**
     * @protected
     *
     * @param {{ where: object, systemWhere: object, attribute: string, isVisible?: boolean }} param
     * @returns {number}
     */
    protected getLvl({
        where,
        systemWhere,
        attribute,
        isVisible,
    }: {
        where: object;
        systemWhere: object;
        attribute: string;
        isVisible?: boolean;
    }): number;
    /**
     * @param {{ level: number, treeObject: object, attribute: string }} param0
     *
     * @returns {Promise<IBehaviourOptions>}
     */
    isValidForQuery({
        level,
        treeObject,
        attribute,
    }: {
        level: number;
        treeObject: object;
        attribute: string;
    }): Promise<IBehaviourOptions>;
}
declare namespace DefaultClass {
    export {
        LeveClassI,
        WhereOptions,
        IQueryBuilerBehavior,
        IBehaviourQueryOptions,
        IBehaviourOptions,
    };
}
type LeveClassI = import('../../../../../metadata-cmp/services/metadata/source/type/index').default;
type WhereOptions = import('../../../../../../db/rls/types/WhereOptions.d.ts').WhereOptions;
type IQueryBuilerBehavior = import('../behaviour/types/index').IQueryBuilerBehavior;
type IBehaviourQueryOptions = import('../behaviour/types/index').IBehaviourQueryOptions;
type IBehaviourOptions = import('../behaviour/types/index').IBehaviourOptions;
//# sourceMappingURL=Default.class.d.ts.map
