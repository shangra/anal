export = SelectClass;
/**
 * @typedef {import("./Factory.class")} Factory
 * @typedef {import("../../../../../db/rls/types/WhereOptions.d.ts").WhereOptions} WhereOptions
 * @typedef {import("./behaviour/types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("./behaviour/types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../../../../../db/rls/types/WhereOptions").Where} Where
 * @typedef {import("./behaviour/types/index").ILevel} ILevel
 * @typedef {import("../../../../metadata-connector/services/metadata/Connector.class").IConnector} IConnector
 */
/**
 * класс обертка на фабрикой поведений
 * используется для формирования массива опций для orm для дальнейщей генерации запроса
 * его основная функция собрать IBehaviourOptions структуры и привести их к виду который может переворить orm
 * + выставить дополнительные обработки для агрегирующий функций
 * (скорее всего этот функционал нужно вынести в отдельный класс по примеру поведений)
 */
declare class SelectClass {
    /**
     * @param {{ behaviourBuilder: Factory, treeObject: object, table: string, connector: IConnector }} param0
     */
    constructor({
        behaviourBuilder,
        treeObject,
        table,
        connector,
    }: {
        behaviourBuilder: Factory;
        treeObject: object;
        table: string;
        connector: IConnector;
    });
    /** фабрика поведений */
    /** @type {Factory} */
    behaviourBuilder: Factory;
    /** метаданные по которым строится срез */
    /** @type {object} */
    treeObject: object;
    /** название таблицы над которой будет строиться срез */
    /** @type {string} */
    table: string;
    /** зарделитель системных атрибутов по типу scode_2023/name - такое поле является внутренней абстракцией по которой срез будет строиться особым образом */
    /** @type{string} */
    delimeter: string;
    /** коннект к истоычнику данных */
    /** @type {IConnector} */
    connector: IConnector;
    /**
     * @private
     *
     * @param {{ func: string }[]} arr
     * @returns {boolean}
     */
    private isSemiAddtitive;
    /**
     * @public
     * Основной метод формирования запроса (Формирует массив объектов опций для ORM с которого формируется запрос)
     *
     * TODO: добавить типы к options
     * @param {object} options - Опции
     *
     * @returns {Promise<Object>}
     */
    public query(options: object): Promise<any>;
    dateDimension: any;
    /**
     * @private
     *
     * @param {WhereOptions[]} levels
     * @returns {WhereOptions[]}
     */
    private compressLevels;
    /**
     * Формирование агрегирующих функций
     *
     * @private
     *
     * @param {object} options - Опции
     *
     * @returns {object}
     */
    private formatAttributes;
    /**
     * TODO: переписать - получается какой-то неподдерживаемый блоб
     *
     * @private
     *
     * @param {string | { field: string, func: string, alias: string, aggrFunc: string, aggrFields: string[], order: [string, string][], bounds: string }} finallAttribute
     * @param {*} settings
     * @param {string[]} attributesForDel
     * @returns {IBehaviourOptions}
     */
    private parseFunc;
    /**
     * Формирование финального объекта для ORM
     *
     * @private
     *
     * @param {ILevel[]} arr
     * @param {(string | { field: string })[]} optionsAttributes
     * @returns
     */
    private generateWhere;
}
declare namespace SelectClass {
    export {
        Factory,
        WhereOptions,
        IQueryBuilerBehavior,
        IBehaviourOptions,
        Where,
        ILevel,
        IConnector,
    };
}
type Factory = import('./Factory.class');
type WhereOptions = import('../../../../../db/rls/types/WhereOptions.d.ts').WhereOptions;
type IQueryBuilerBehavior = import('./behaviour/types/index').IQueryBuilerBehavior;
type IBehaviourOptions = import('./behaviour/types/index').IBehaviourOptions;
type Where = import('../../../../../db/rls/types/WhereOptions').Where;
type ILevel = import('./behaviour/types/index').ILevel;
type IConnector =
    import('../../../../metadata-connector/services/metadata/Connector.class').IConnector;
//# sourceMappingURL=Select.class.d.ts.map
