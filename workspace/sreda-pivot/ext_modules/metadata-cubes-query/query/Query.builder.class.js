const Extensions = require("../../../core/class/Extensions.class");

const { mergeDeep, isEmptyObject } = require("../../utils/services");

const MaskClassService = require("../read/Mask.class");
const ReadClass = require("../read/Read.class");
const QueryClass = require("./Query.class");

const MaskClass = new MaskClassService();

/**
 * @typedef {import("../totals/dialects/base/Total.class")} TotalParser
 * @typedef {import("../totals/dialects/grouping/Total.grouping.class")} TotalGroupingParser
 */

/**
 * @typedef {import("./types").QueryOptions} QueryOptions
 * @typedef {import('../select/Select.class')} SelectClass
 * @typedef {import("../select/types").ISettings} ISettings
 * @typedef {import('../matrix/access/Access.matrix.class')} AccessClass
 * @typedef {import('../matrix/account/Account.matrix.class')} AccountClass
 * @typedef {import("../../metadata-cmp/services/metadata/source/type").default} LevelClassI
 * @typedef {import("../../metadata-connector/services/metadata/Connector.class").Ifrom} Ifrom
 * @typedef {import("../../metadata-connector/services/metadata/Connector.class").IConnector} IConnector
 * @typedef {import("../../metadata-connector/services/metadata/connectors/AbstractConnector").IWithOption} IWithOption
 */

class QueryBuilderClass extends Extensions {
    /**
     * @param {object} param0 
     * @param {IConnector} param0.connector
     * @param {object} param0.meta
     * @param {object} param0.select
     * @param {TotalParser | TotalGroupingParser} param0.totalParser
     * @param {object} param0.account
     * @param {object} param0.access
     * @param {{ console: (msg: string, meta: any) => Promise<void> }} param0.logger
     */
    constructor({ connector, meta, select, totalParser, account, access, logger }) {
        super();
        /** @type {IConnector} */
        this.connector = connector;
        this.meta = meta;
        /** @type {SelectClass} */
        this.select = select;
        /** @type {AccountClass} */
        this.account = account;
        /** @type {AccessClass} */
        this.access = access;
        /** @type {{ console: (msg: string, meta: any) => Promise<void> }} */
        this.logger = logger

        this.totalParser = totalParser;
    }

    /**
     * @private
     * 
     * @param {{ id: string, options: ISettings, treeObject: object }} param
     * 
     * @returns {Promise<{ union: boolean; mappedOptions: object[]}>} 
     */
    async matrix({ id, options, treeObject }) {
        let { union: gUnion, mappedOptions: accountMappedOptions } = await this.account.matrix({ id, options, treeObject, metaClass: this.meta });

        const resultOptions = [];

        for (const options of accountMappedOptions) {
            const { union, mappedOptions } = await this.access.matrix({ id, options, metaClass: this.meta });

            resultOptions.push(...mappedOptions);
            gUnion ||= union;
        }

        return { union: gUnion, mappedOptions: resultOptions };
    }

    /**
     * @public
     * 
     * @param {{ options: ISettings, treeObject: object, entity: LevelClassI, id: string, isProcessing: boolean }} param0 
     * @returns {Promise<{ union: boolean, queries: QueryOptions[], refsToParse: Record<string, string> }>}
     */
    async query({ id, entity, options, treeObject, isProcessing }) {
        /** @type {Record<string, string>} */
        const refsToParse = {};

        const { union, mappedOptions } = await this.matrix({ id, options: structuredClone(options), treeObject });

        await this.logger.console(`Формируем матрицу`, { query: mappedOptions });

        const promise = mappedOptions.map(options => this.getSql({ total: options.totals, options, entity, id, isProcessing, union }));

        const queries = (await Promise.all(promise)).flat();

        return { union, queries, refsToParse };
    }

    // /**
    //  * @public
    //  * 
    //  * @param {{ isProcessing: boolean, id: string, options: object, treeObject: object, entity: LevelClassI }} param0 
    //  * 
    //  * @returns {Promise<{ generators: AsyncIterable<object[]>[]}>}>}
    //  */
    // async readGen({ isProcessing, options, treeObject, entity, id }) {
    //     const { union, queries } = await this.query({ options, treeObject, entity, id, isProcessing })

    //     const promise = queries.map(async ({ sql, options }) => this.genSlice({ sql, options }));

    //     const generators = (await Promise.all(promise)).flat();

    //     return { generators };
    // }

    /**
     * @public
     * 
     * @param {{ isProcessing: boolean, id: string, options: object, treeObject: object, entity: LevelClassI }} param0 
     * 
     * @returns {Promise<{ rows: object[], totals: object, count: number, refsToParse: Record<string, string> }>}
     */
    async read({ isProcessing, entity, id, options, treeObject }) {
        const { union, queries } = await this.query({ options, treeObject, entity, id, isProcessing });

        await this.logger.console(`Сформировали запрос`);

        /** @type {Record<string, string>} */
        const refsToParse = queries.reduce((acc, { refsToParse }) => mergeDeep(acc, refsToParse), {});

        const read = new ReadClass({ connector: this.connector, logger: this.logger });

        await this.logger.console(`Делаем запрос к данным`);

        const promise = [];
        /**
         * если выставлен union
         * то все мы объединяем весь запрос в один union и получаем результат
         * контроль полей и общие синхронизации должны происходить из вне
         */
        if (union) {
            let withOptions = [];
            let volatileOptions = [];
            let sqls = [];

            queries.forEach(({ sql, withOptions: wOptions, volatileOptions: vOptions }) => {
                wOptions?.length && withOptions.push(...wOptions);
                vOptions?.length && volatileOptions.push(...vOptions);

                sqls.push(sql);
            });

            const sql = this.connector.union({ sqls });

            promise.push(
                read.read({ id, sql: { table: sql, alias: 'cte' }, withOptions, volatileOptions, options }),
            );
        } else {
            promise.push(
                ...queries
                    .map(
                        async ({ sql, withOptions, volatileOptions, options }) => read.read({ id, sql, withOptions, volatileOptions, options })
                    )
            );
        }

        const result = await Promise.all(promise);

        await this.logger.console(`Получили данные`);

        const count = result.reduce((acc, { count }) => acc + count, 0) || -1;
        let rows = result?.length > 1 ? result.map(({ rows }) => rows).flat() : result[0].rows;

        let totals = {};
        if (!isEmptyObject(options.totals || {})) {
            await this.logger.console(`Формируем итоги`);
            ({ rows, totals } = await this.totalParser.parse(rows, options, treeObject));
            await this.logger.console(`Закончили формировать итоги`);
        }

        const optionsFields = [...(options.settings?.index || []), ...(options.settings?.columns || [])];
        const maskFields = options.maskFields ?? [];
        const isMaskField = optionsFields.some(i => (maskFields.includes(i)));

        if (options.isMask && isMaskField) {
            await this.logger.console(`Маскируем данные`);

            const { rows: lrows } = await MaskClass.parseRefs(rows, optionsFields);

            await this.logger.console(`Закончили маскировать данные`);

            rows = lrows;
        }

        return { rows, count, totals, refsToParse }
    }

    /**
     * @private
     * 
     * по заданным параметрам сгенерировать запрос на построение среза
     * 
     * @param {{ total: { indexes: boolean, columns: boolean, totals: boolean }, options: ISettings, entity: LevelClassI, id: string, isProcessing: boolean, union: boolean }} param0 
     * @returns {Promise<QueryOptions[]>} 
     */
    async getSql({ total, options, entity, id, isProcessing, union }) {
        const meta = await this.select.query(id, options, entity);

        const query = new QueryClass({ connector: this.connector, entity: entity });

        const requests = await query.query({ id, meta, requestedTotal: total, options, isProcessing });

        return requests;
    }
}

module.exports = QueryBuilderClass;