export = CaseClass;
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
 *
 *
 * @typedef {object} IGenerateCase
 * @property {object[]} rows
 * @property {Set<string>} aval
 * @property {boolean} needFiltering
 * @returns
 */
/**
 * TODO Нужно почистить класс - слишком сильно разрастается
 */
/**
 * Поведение с иерархиями через кейсы
 *
 * @class CaseClass
 * @implements {IQueryBuilerBehavior}
 */
declare class CaseClass extends BaseClass implements IQueryBuilerBehavior {
    constructor({
        refItem,
        meta,
        table,
        field,
        delimeter,
    }: {
        refItem: any;
        meta: any;
        table: any;
        field: any;
        delimeter: any;
    });
    /**
     * Формирование иерархичных опций
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
    attribute: string;
    /**
     * флаг который говорит что нужно фильтровать по подполям измерения
     */
    isDictionaryWhere: boolean;
    /**
     * флаг который говорит что нужно просчитывать листовые елементы
     */
    isLeafHeararchy: any;
    /**
     * id рефа метеданных
     */
    id: any;
    /**
     * флаг сообщающий что текущий расчет идет относительно измерения которое будет отображаться в UI
     */
    isVisible: boolean;
    /**
     * плохое решение перекладывать все данные в this
     * нужно будет переделать
     */
    pkName: string;
    parentName: string;
    parentFilter: import('sequelize').WhereAttributeHash<any>;
    viewName: string;
    where: object;
    systemWhere: object;
    dictionaryWhere: object;
    /**
     * формируем подполе как измерение
     *
     * @protected
     * @returns {Promise<IBehaviourOptions>}
     */
    protected pkData(): Promise<IBehaviourOptions>;
    /**
     * @protected
     * @returns {Promise<IBehaviourOptions>}
     */
    protected generate(): Promise<IBehaviourOptions>;
    /**
     * @private
     *
     * @param {{ dictionaryWhere?: object, where: object }} param0
     * @returns {Promise<{ rows: string[], unique: Set<string>, where: string[] }>}
     */
    private getRefData;
    /**
     * @param {IGenerateCase} param0
     * @returns {{ field: string, hasValues: boolean }}
     */
    generateCase({ rows, aval, needFiltering }: IGenerateCase): {
        field: string;
        hasValues: boolean;
    };
    /**
     * @private
     *
     * @param {{ rows: object[] }} param0
     * @returns {ILevel}
     */
    private generateField;
}
declare namespace CaseClass {
    export {
        IConnector,
        WhereOptions,
        IQueryBuilerBehavior,
        IBehaviourQueryOptions,
        IBehaviourOptions,
        ILevel,
        Where,
        IGenerateCase,
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
type IGenerateCase = {
    rows: object[];
    aval: Set<string>;
    needFiltering: boolean;
};
//# sourceMappingURL=Case.class.d.ts.map
