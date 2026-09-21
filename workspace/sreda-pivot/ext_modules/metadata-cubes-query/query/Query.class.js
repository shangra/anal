/**
 * @typedef {import('../select/Select.class')} SelectClass
 * @typedef {import("../select/types").ISettings} ISettings
 * @typedef {import('./types').QueryOptions} QueryOptions
 * @typedef {import('../matrix/account/Account.matrix.class')} AccountClass
 * @typedef {import('../matrix/access/Access.matrix.class')} AccessClass
 * @typedef {import("../../metadata-cmp/services/metadata/source/type").default} LevelClassI
 * @typedef {import("../../metadata-connector/services/metadata/Connector.class").Ifrom} Ifrom
 * @typedef {import("../../metadata-connector/services/metadata/Connector.class").IConnector} IConnector
 * @typedef {import("../../metadata-connector/services/metadata/connectors/AbstractConnector").IWithOption} IWithOption
 */

const { isEmptyObject } = require('../../utils/services');

/**
 * @typedef {object} Itotal
 * @property {boolean} main
 * @property {boolean} indexes
 * @property {boolean} columns
 * @property {boolean} totals
 */

/**
 * @typedef {object} ItotalArr
 * @property {object[]} main
 * @property {object[]} indexes
 * @property {object[]} columns
 * @property {object[]} totals
 */

const PREFIX = 'v_fix_layer_';

class QueryClass {
    /**
     * @param {{ connector: IConnector, entity: LevelClassI }} param0 
     */
    constructor({ connector, entity }) {
        this.connector = connector;
        this.entity = entity;
    }

    /**
     * @public
     * 
     * @returns {Promise<QueryOptions[]>} 
     */
    async query({ id, meta, requestedTotal, options, isProcessing }) {
        const { refsToParse, fizLayer, logicalLayer, totals } = meta;

        const { sql: fizLayerSql } = await this.parseFizLayer(id, fizLayer);

        let gVolatileSql = null;
        let gVolatileName = null;

        let gWitheSql = null;
        let gWithName = null;

        let subFrom = fizLayerSql;

        if (!options?.settings?.isReport && !isEmptyObject(requestedTotal)) {
            const { with: fWith, volatile: fVolatile } = await this.connector.cte(fizLayerSql.table, PREFIX, true);

            let name = fVolatile?.name || fWith?.name

            if (fVolatile) {
                const { sql, name } = fVolatile;

                gVolatileSql = sql;
                gVolatileName = name;
            } else {
                const { sql, name } = fWith;

                gWitheSql = sql;
                gWithName = name;
            }

            subFrom = { table: `SELECT * FROM "${name}"`, alias: fizLayerSql.alias };
        }

        if (!isEmptyObject(options.maskWhere || {})) {
            subFrom.table = await this.connector.findSQL(subFrom, { attributes: ['*'], where: options.maskWhere });
        }

        const { sql: logicalSql, withs, volatile } = await this.parseLogicalLayer({ from: subFrom, layers: logicalLayer });

        //получим sql по которому будет расчет основной матрицы данных
        const from = await this.selectFrom(logicalSql, totals.main);

        // формирования sql для расчетов итогов
        const { index, column, total } = await this.genTotals(logicalSql, requestedTotal, totals);

        /** @type {{ sql: string, name: string }[]} */
        let volatileOptions = [];
        /** @type {{ sql: string, name: string }[]} */
        let withOptions = [];
        if (!isEmptyObject(volatile)) {
            volatileOptions = Object.entries(volatile || {}).map(([name, sql]) => ({ sql, name }));
        } else {
            withOptions = Object.entries(withs || {}).map(([name, sql]) => ({ sql, name }));
        }

        if (gVolatileSql) {
            volatileOptions.push({ sql: gVolatileSql, name: gVolatileName });
        }

        if (gWitheSql) {
            withOptions.push({ sql: gWitheSql, name: gWithName });
        }

        from.table = this.connector.union({ sqls: [from, index, column, total] });

        const isReport = options?.isReport || options.settings?.isReport;

        // ад
        /** @type {ISettings} */
        const option = {
            explain: options.explain,
            tags: options.tags,

            limit: options.limit,
            offset: options.offset,

            timeOut: options.timeOut,
            batchSize: options.batchSize,

            settings: structuredClone(options.settings),

            processing: isProcessing,

            isReport: isReport,

            withOutCount: options.withOutCount,
            withOutOrder: !isReport,

            attributes: options.attributes,
            attributesForDel: options.attributesForDel,

            where: options.where,
            maskWhere: options.maskWhere,
            systemWhere: options.systemWhere,
            dictionaryWhere: options.dictionaryWhere,
            metaAccessWhere: options.metaAccessWhere,
        };

        if (option.isReport && !option.withOutOrder) {
            option.order = options.order;
        }

        /**
         * если у нас нет запроса на агрегацию данных то мы можем использовать переданную из вне группировку
         */
        if (options.group && !options.attributes.some((/** @type {Object} */i) => i?.func)) {
            option.group = options.group;
        }

        return [{
            sql: from,
            withOptions,
            volatileOptions,
            refsToParse,
            options: option
        }];
    }

    /**
     * @private
     * 
     * @param {string} id 
     * @param {object[]} layers 
     */
    async parseFizLayer(id, layers) {
        const [mainLvl, ...subLayers] = layers;

        let layerSql;
        if (typeof this.entity?.query === 'function') {
            try {
                const out = await this.entity.query(id, mainLvl);
                layerSql = out?.query ?? out;
            } catch {
                layerSql = null;
            }
        }
        if (typeof layerSql === 'string') {
            layerSql = { table: layerSql, alias: 't' };
        }
        if (!layerSql || typeof layerSql !== 'object' || !(layerSql.table || layerSql.raw)) {
            if (typeof this.connector?.findSQL !== 'function') {
                throw new Error('Коннектор не реализует findSQL');
            }
            const SQL = await this.connector.findSQL(mainLvl?.from || mainLvl?.table || 't', mainLvl || {});
            layerSql = typeof SQL === 'object' ? SQL : { table: SQL, alias: 't' };
        }

        const { sql, withs, volatile } = await this.connector.generateCte(layerSql, subLayers);

        return { sql, withs, volatile };
    }

    /**
     * @private
     * 
     * @param {Object} param0 
     * @param {Ifrom} param0.from 
     * @param {object[]} param0.layers 
     */
    async parseLogicalLayer({ from, layers }) {
        const { sql, withs, volatile } = await this.connector.generateCte(from, layers);

        return { sql, withs, volatile };
    }

    /**
     * @private
     * 
     * пройтись по массиву настроек и с его помощью сформировать объект запроса
     * 
     * @param {Ifrom} from 
     * @param {object[]} levels 
     * @returns 
     */
    async selectFrom(from, levels) {
        let result = structuredClone(from);

        for (const level of levels) {
            result = await this.connector.generateFrom(result, { options: level, withOptions: level.withOptions });
        }

        return result;
    }

    /**
     * @private
     * 
     * @param {Ifrom} from 
     * @param {Itotal} requestedTotal 
     * @param {ItotalArr} totals 
     */
    async genTotals(from, requestedTotal, totals) {
        const index = requestedTotal?.columns && totals.indexes ? await this.selectFrom(from, totals.indexes) : null;
        const total = requestedTotal?.totals && totals.totals ? await this.selectFrom(from, totals.totals) : null;
        const column = requestedTotal?.indexes && totals.columns ? await this.selectFrom(from, totals.columns) : null;


        return { index, column, total }
    }
}

module.exports = QueryClass;