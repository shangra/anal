/**
 * @typedef {import('../select/Select.class')} SelectClass
 * @typedef {import("../select/types").ISettings} ISettings
 * @typedef {import('../query/types').QueryOptions} QueryOptions
 * @typedef {import('../matrix/access/Access.matrix.class')} AccessClass
 * @typedef {import('../matrix/account/Account.matrix.class')} AccountClass
 * @typedef {import("../../metadata-cmp/services/metadata/source/type").default} LevelClassI
 * @typedef {import("../../metadata-connector/services/metadata/Connector.class").Ifrom} Ifrom
 * @typedef {import("../../metadata-connector/services/metadata/Connector.class").IConnector} IConnector
 * @typedef {import("../../metadata-connector/services/metadata/connectors/AbstractConnector").IWithOption} IWithOption
 */

const constants = require('../constants');

const Extensions = require('../../../core/class/Extensions.class');

class ReadClass extends Extensions {
    constructor({ connector, logger }) {
        super();
        this.connector = connector;
        this.logger = logger;
    }

    /**
     * @public
     * 
     * получить данные среза
     * 
     * @param {{ sql: Ifrom, options: object }} param0 
     * 
     * @returns {Promise<AsyncIterable<object[]>>}
     */
    async generator({ sql, options }) {
        return this.connector.findGen({ table: sql, options })
    }

    /**
     * @public
     * 
     * получить данные среза и количество данных
     * 
     * @param {{ id: string } & QueryOptions} param0 
     * @returns {Promise<{ rows: object[], count: number }>}
     */
    async read({ id, sql, withOptions, volatileOptions, options }) {
        const body = { id, sql, withOptions, volatileOptions, options };

        const [rows, count] =
            await Promise.all([
                this.readRows(body),
                this.readCount(body),
            ]);

        return { rows, count };
    }

    /**
     * @private
     * 
     * получить данные среза
     * 
     * @param {{ id: string } & QueryOptions} param0 
     * @returns {Promise<object[]>}
     */
    async readRows({ id, sql, withOptions, volatileOptions, options }) {
        const { attributesForDel, limit, offset, order, withOutOrder } = options;

        const from = structuredClone(sql);

        from.table = await this.setSubQuery(from, { attributesForDel, limit, offset, order, withOutOrder });

        return this.getData(this.connector, { withOptions, volatileOptions, sqls: [from] }, id, options);
    }

    /**
     * @private
     * 
     * получить количество данных
     * 
     * @param {{ id: string } & QueryOptions} param0 
     * @returns {Promise<number>}
     */
    async readCount({ id, sql, withOptions, volatileOptions, options }) {
        const { withOutCount } = options;

        const countPreSql = await this.connector.findSQL(structuredClone(sql), { attributes: [{ func: 'COUNT', field: '*', alias: 'count' }] });

        const countSql = this.connector.union({ withOptions, volatileOptions, sqls: [{ table: countPreSql, alias: sql.alias }] });

        /** @type {Promise<number> | number} */
        const promiseCount = withOutCount
            ? -1
            : this.countData(this.connector, { table: countSql, alias: sql.alias }, id);

        return promiseCount;
    }

    /**
     * Метод для перегрузки выборки из бд
     * @private
     *
     * @param {IConnector} connector 
     * @param {{ sqls: Ifrom[], withOptions: object, volatileOptions: object }} from 
     * @param {string} id
     * @param {ISettings} options 
     *
     * @private {Promise<object[]>}
     */
    async getData(connector, from, id, options) {
        await this.logger.console(`Запрос к данным инфосервиса`, {
            query: connector.union({
                withOptions: from.withOptions || [],
                volatileOptions: from.volatileOptions || [],
                sqls: from.sqls
            }),
        });

        const gen = await connector.findGen(from);

        let rows = [];
        for await (const data of gen) {
            rows = rows.concat(data);
        }

        return rows;
    }

    /**
     * метод для перегрузки выборки из бд
     * @private
     * 
     * @param {IConnector} connector 
     * @param {Ifrom} from 
     * @param {string} id 
     * 
     * @returns {Promise<number>}
     */
    async countData(connector, from, id) {
        const data = await connector.querySql(from.table, { type: 'SELECT' });

        return +(data?.length ? data?.[0]?.count : data?.count) || 0;
    }

    /**
     * @private
     * 
     * проверим что в оригинальном запросе нет настроек которые нужно обернуть в подзапрос
     * если есть оборачиваем и отдаем новый sql
     * 
     * @param {Ifrom} sql 
     * @param {ISettings} options 
     * 
     * @returns {Promise<string>}
     */
    async setSubQuery(sql, options) {
        const isSubReq = options.limit || options.offset || (options.order?.length && !options.withOutOrder);

        if (isSubReq) {
            let order = (options.withOutOrder ? [] : options.order).filter(([field]) => !options.attributesForDel.includes(field));

            sql.table = await this
                .connector
                .findSQL(
                    sql, {
                    attributes: ['*'],
                    limit: options.limit,
                    offset: options.offset,
                    order
                });
        }

        return sql.table;
    }
}

module.exports = ReadClass;