export = WithClass;
/**
 * @typedef {import('../../../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../../../../db/rls/types/WhereOptions.d.ts").WhereOptions} WhereOptions
 * @typedef {import("../behaviour/types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../behaviour/types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../behaviour/types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../behaviour/types/index").ILevel} ILevel
 * @typedef {import("../../../../../../db/rls/types/WhereOptions").Where} Where
 */
/**
 * Нужно почистить класс - слишком сильно разрастается
 */
/**
 * Поведение с иерархиями для рекурсивных джойнов
 *
 * @class WithClass
 * @exptends {BaseClass}
 * @implements {IQueryBuilerBehavior}
 */
declare class WithClass extends BaseClass implements IQueryBuilerBehavior {
    constructor({
        refItem,
        meta,
        connector,
        field,
        table,
        delimeter,
    }: {
        refItem: any;
        meta: any;
        connector: any;
        field: any;
        table: any;
        delimeter: any;
    });
    /** @type {IConnector} */
    connector: IConnector;
    /**
     * @param {string} viewName
     * @returns {string}
     */
    generateViewName(viewName: string): string;
    /**
     * Формирование рекурсивных опций
     *
     * @public
     * @param {IBehaviourQueryOptions} param0 - Данные для SQL
     * @param {string} attribute - Атрибут
     * @param {string} viewName - Имя представления
     *
     * @returns {Promise<object>}
     */
    public query(
        { dictionaryWhere, systemWhere, where, settings }: IBehaviourQueryOptions,
        attribute: string,
        viewName: string
    ): Promise<object>;
    subFields: any;
    attribute: string;
    index: string[];
    columns: string[];
    id: any;
    /**
     * @private
     *
     * формирование подполей как измерений
     *
     * @param {{ systemWhere: object, where: object, pkName: string, viewName: string, isVisible: boolean }} param0
     * @returns {Promise<IBehaviourOptions>}
     */
    private pkData;
    /**
     *
     * @param {*} param0
     * @param {*} attribute
     * @returns
     */
    generate(
        {
            dictionaryWhere,
            parentFilter,
            systemWhere,
            parentName,
            isVisible,
            pkName,
            where,
            view,
        }: any,
        attribute: any
    ): Promise<import('../behaviour/types/index').IBehaviourOptions>;
    /**
     * COMMENTS: перегруженная дичь прилепленная без понимания и смысла
     * нужно убрать но так как теперь это часть функционала то теперь нам с этим жить
     * данная релиазация это копипаст поэтому это делает ее еще более ужасной
     *
     * @param {*} treeObject
     * @returns
     */
    getPkField(treeObject: any): Promise<{
        view: any;
        viewAlias: any;
    }>;
    /**
     * @private
     *
     * @param {{ hierarchy: boolean, dictionaryWhere: object, where: object, pkName: string, parentName: string, view: string }} param0
     * @returns {Promise<{ viewAlias?: string, query: string, viewNames?: string[], connectionField?: string, attributeFields?: string[], mergeName: string, additionalAttributes?: string[] }>}
     */
    private getRefData;
}
declare namespace WithClass {
    export {
        IConnector,
        WhereOptions,
        IQueryBuilerBehavior,
        IBehaviourQueryOptions,
        IBehaviourOptions,
        ILevel,
        Where,
    };
}
import BaseClass = require('./Base.class');
type IConnector =
    import('../../../../../metadata-connector/services/metadata/Connector.class').IConnector;
type WhereOptions = import('../../../../../../db/rls/types/WhereOptions.d.ts').WhereOptions;
type IQueryBuilerBehavior = import('../behaviour/types/index').IQueryBuilerBehavior;
type IBehaviourQueryOptions = import('../behaviour/types/index').IBehaviourQueryOptions;
type IBehaviourOptions = import('../behaviour/types/index').IBehaviourOptions;
type ILevel = import('../behaviour/types/index').ILevel;
type Where = import('../../../../../../db/rls/types/WhereOptions').Where;
//# sourceMappingURL=With.class.d.ts.map
