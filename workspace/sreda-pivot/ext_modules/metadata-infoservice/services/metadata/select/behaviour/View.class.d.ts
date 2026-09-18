export = ViewClass;
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
 * TODO: подчистить класс - очень много лишней логики и дублирующегося кода
 * + проблемы с логикой - принят максимально простой подход из за которого в выборки попадает большое количество лишних данных
 * + усложняется парс для финального конверта в формат орм
 */
/**
 * Поведение реализованое через представление
 */
declare class ViewClass extends CaseClass {
    constructor({
        refItem,
        meta,
        connector,
        table,
        field,
        delimeter,
    }: {
        refItem: any;
        meta: any;
        connector: any;
        table: any;
        field: any;
        delimeter: any;
    });
    /** @type {IConnector} */
    connector: IConnector;
    /** @type {number} */
    maxLevel: number;
    /**
     * Формирование рекурсивных опций
     *
     * @public
     * @param {IBehaviourQueryOptions} options - Данные для SQL
     * @param {string} key - Атрибут
     * @param {string} viewName - Имя представления
     *
     * @returns {Promise<object>}
     */
    public getSubQuery(
        options: IBehaviourQueryOptions,
        key: string,
        viewName: string
    ): Promise<object>;
    /** @type {ILevel[]} */
    values: ILevel[];
    /**
     * Формирование опций представления
     *
     * @param {{ dictionaryWhere, systemWhere, where, settings }} options - Данные для SQL
     * @param { string } attribute - Атрибут
     * @param { string } viewName - Имя представления
     *
     * @returns { Promise<Object> }
     */
    query(
        options: {
            dictionaryWhere: any;
            systemWhere: any;
            where: any;
            settings: any;
        },
        attribute: string,
        viewName: string
    ): Promise<any>;
    /**
     * @private
     *
     * @param {*} param0
     * @param {*} attribute
     * @returns {Promise<IBehaviourOptions>}
     */
    private generate;
    getLvl(where: any, systemWhere: any, attribute: any): number;
    /**
     *
     * @param {object} option
     * @param {string} attribute
     * @param {number} level
     * @param {object} where
     * @param {string} [type]
     */
    addConditionToLevel(
        option: object,
        attribute: string,
        level: number,
        where: object,
        type?: string
    ): void;
    /**
     * получить максимальное количество уровней
     *
     * @param {string} table
     * @param {string} attribute
     * @returns {Promise<number>}
     */
    getLevelsForAttribute(table: string, attribute: string): Promise<number>;
}
declare namespace ViewClass {
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
import CaseClass = require('./Case.class');
type IConnector =
    import('../../../../../metadata-connector/services/metadata/Connector.class').IConnector;
type WhereOptions = import('../../../../../../db/rls/types/WhereOptions.d.ts').WhereOptions;
type IQueryBuilerBehavior = import('../behaviour/types/index').IQueryBuilerBehavior;
type IBehaviourQueryOptions = import('../behaviour/types/index').IBehaviourQueryOptions;
type IBehaviourOptions = import('../behaviour/types/index').IBehaviourOptions;
type ILevel = import('../behaviour/types/index').ILevel;
type Where = import('../../../../../../db/rls/types/WhereOptions').Where;
//# sourceMappingURL=View.class.d.ts.map
