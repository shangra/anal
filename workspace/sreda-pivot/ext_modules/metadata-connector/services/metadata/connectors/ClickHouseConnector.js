// const { ClickHouse } = require('./lite-clickhouse-orm');
const ClickHouse = require('./click/index');
const Queue = require('./lite-pg-native/QueuePool');
const AbstractConnector = require('./AbstractConnector');
const knex = require('knex');

const constants = require('../../../constants');

/**
 * @typedef {import('../Connector.class').Ifrom} Ifrom
 * @typedef {import('./AbstractConnector').CastTypeI} CastTypeI
 */

class ClickHouseConnector extends AbstractConnector {

    name = 'ClickHouse';

    async connect(settings) {
        if (!this.connector) {
            /** @type {ClickHouse} */
            this.connector = new ClickHouse(
                {
                    // typeConnector: 'https',
                    url: settings.host,
                    port: settings.port,
                    debug: false,
                    basicAuth: {
                        username: settings.user,
                        password: settings.password,
                    },
                    pool: {
                        max: settings?.pool?.max,
                        min: settings?.pool?.min,
                    },
                    isUseGzip: true,
                    trimQuery: false,
                    usePost: true,
                    format: 'json',
                    raw: false,
                    config: {
                        session_timeout: sreda.env.CH_SQL_REQUEST_TIMEOUT || 180,
                        output_format_json_quote_64bit_integers: 0,
                        enable_http_compression: 1,
                        database: settings.database,
                    },
                },
                // ClickHouse
            );
        }
    }

    isNullAvaliable = false;

    /**
     * @public
     * 
     * @param {string} query 
     * @param {string} prefix 
     * 
     * @returns {{ sql: string, name: string }}
     */
    volatile(query, prefix) {
        return null;
    }

    /**
     * @param {string} field 
     * @param {CastTypeI} [type]
     * @returns {string}
     */
    createArray = (field, type = 'TEXT') => `array(${this.cast(field, type)})`;

    // TODO!!! DANGER
    /**
     * @param {string} arrayFeild 
     * @param {string} field 
     * @param {CastTypeI} [type]
     * @returns {string}
     */
    appendArray = (arrayFeild, field, type = 'TEXT') => {
        return `arrayPushBack(${arrayFeild}, ${this.cast(field, type)})`
    };

    // appendArray = (arrayFeild, field) => `arrayPushBack(${arrayFeild}, toString(_dict.${field}))`;
    /**
     * @param {*} gqb 
     * @param {string} field 
     * @param {string} value 
     */
    findInArray = (gqb, field, value) => {
        const val = typeof value === 'number' ? value : `'${value}'`;
        return gqb.raw(`has(${field}, '${val}')`);
    }

    /**
     * @public
     * 
     * @param {string} arrayField 
     * @returns {string}
     */
    getFieldLength = (arrayField) => `length("${arrayField}")`;

    /**
     * @public
     * 
     * @param {string} arrayField 
     * @returns {string}
     */
    getLastElemntOfArray = (arrayField) => `arraySlice(${arrayField}, length(${arrayField}), 1)`;

    /**
     * @public
     * @param {string} arrayField 
     * @param {string} [type] 
     * @returns {string}
     */
    filterArray = (arrayField, type) => `arrayFilter(x -> NOT ${this.getDefaultValue(type)}, "${arrayField}")`;

    /**
     * @public
     * @param {string} type 
     * @returns {any}
     */
    getDefaultValue = (type) => {
        /** @type {string | number} */
        let defaultValue = 'isNull(x)';

        if (['INTEGER'].includes(type)) {
            defaultValue = 0;
        }

        if (['FLOAT'].includes(type)) {
            defaultValue = 0;
        }

        return defaultValue;
    }

    /**
     * @public
     * @param {string} arrayField 
     * @param {string} [type] 
     * @returns {string}
     */
    getLastNonEmptyElemntOfArray = (arrayField, type) => {
        return `${this.filterArray(arrayField, type)}[-1]`;
    }

    /**
     * @public
     * 
     * @param {string} arrayField 
     * @param {number} index 
     * @returns {string}
     */
    getElementOfArray = (arrayField, index) => `${arrayField}[${index}]`;

    /**
     * @param {string} field 
     * @param {string} [type='TEXT'] 
     * @returns {string}
     */
    cast(field, type = 'TEXT') {
        let func = `toString`;

        if (constants.DATE_TYPES.includes(type)) {
            func = `toDateOrNull`;
        }

        if ('INTEGER' === type) {
            func = `toInt8OrNull`;
        }

        if ('FLOAT' === type) {
            func = `toFloat32OrNull`;
        }

        if (constants.REF_TYPES.includes(type)) {
            func = `toUUID`;
        }

        if ('BOOLEAN' === type) {
            func = 'toBool';
        }

        return `${func}(${field})`;
    }

    /**
     * @param {{ sqls: Ifrom[], withOptions: object, volatileOptions: object }} param0
     * 
     * @returns {Promise<AsyncIterable<object[]>>}
     */
    async findGen({ withOptions, volatileOptions, sqls }) {
        await this.connect(this.Model);

        const sql = this.union({ sqls });

        const preReq = this.union({ withOptions, volatileOptions, sqls: [] });

        const SQL = `${preReq} ${sql}`.replaceAll(';', '');
        const SQLWithTag = await this.setQueryTags(SQL, { preReq });

        console.log(SQLWithTag);

        return this.getCursorData(SQLWithTag, {});
    }

    /**
     * @private
     * 
     * @param {string} SQL 
     * @param {{ preReq?: string, transaction?: object, batchSize?: number }} options 
     */
    async * getCursorData(SQL, options = {}) {
        const batchSize = options?.batchSize || 1_000;

        const { stream } = await this.connector.stream(SQL);

        let data = [];

        for await (const rows of stream) {
            for (let i = 0; i < rows.length; i++) data.push(rows[i].json());

            if (data.length > batchSize) {
                yield data;

                data = [];
            }
        }

        yield data;
    }

    async findAll(table, options) {
        await this.connect(this.Model);

        const SQL = await this.findSQL(table, options);

        let { data: result } = await this.query(SQL, { ...(options || {}) });

        if (options.withChildren) {
            const newResult = [];
            const { pkName, parentName, where, guideAttrs } = options.withChildren;
            for (const row of result) {
                const { children, parents } = await this.findAllChildren(table, { pkName, parentName, where, guideAttrs }, row[pkName], options);
                row.children = children;
                row.parents = parents;
                newResult.push(row);
            }
            result = newResult;
        }

        return result;
    }

    async findAllChildren(table, fields, parent, options) {
        const { data: rows } = await super.findAllChildren(table, fields, parent, options);

        let children = new Set();
        let itemParent = new Set();
        for (let i = 0; i < rows.length; i++) {
            children.add(rows[i].__child__);
            itemParent.add(rows[i].__parent__);
        }

        return { children: [...children], parents: [...itemParent] };
    }

    async count(table, options) {
        const { data: [{ count }] } = await super.count(table, options);

        return parseInt(count);
    }

    async update(table, values, options) {
        await this.connect(this.Model);

        if (options?.rls && options?.where) {
            ({ where: options.where } = this.getRlsOptions({ type: 'write', where: options?.where, options }));
        }

        const SQL = await this.queryGenerator.updateQuery(
            { tableName: table },
            values,
            options.where
        );

        const res = await this.query(SQL, { ...(options || {}) });

        return res[1].rowCount > 0;
    }

    async create(table, values, options) {
        await this.connect(this.Model);
        const SQL = await this.queryGenerator.insertQuery({ tableName: table }, values);

        const res = await this.query(SQL, { ...(options || {}) });
        return { result: res[1] === 1, data: null };
    }

    async bulkCreate() {
        throw new Error('NOT IMPLEMENTED');
    }

    async delete(table, options) {
        await this.connect(this.Model);

        if (options?.rls && options?.where) {
            ({ where: options.where } = this.getRlsOptions({ type: 'delete', where: options?.where, options }));
        }

        const SQL = await this.queryGenerator.deleteQuery({ tableName: table }, options.where);

        const res = await this.query(SQL, { ...(options || {}) });
        return res[1].rowCount > 0; //[1].rowCount > 0;
    }

    /**
     * 
     * @param {string} table 
     * @param {*} options 
     * @returns 
     */
    async synch(table, options) {
        await this.connect(this.Model);

        options.typeMapping = {
            DATETIME: 'DATE',
            STRING: 'VARCHAR',
        };

        let result;

        /** @type {any} */
        const SQL = await super.synch(table, options);
        if (SQL) {
            result = await this.query(SQL, { ...(options || {}) });
        }

        return result;
    }

    async drop(table, options) {
        await this.connect(this.Model);

        let result;

        const SQL = await super.drop(table);
        if (SQL) {
            result = await this.query(SQL, { ...(options || {}) });
        }

        return result;
    }

    /**
     * @param {string} table 
     * @param {*} options 
     * @returns {Promise<Record<string, string>>}
     */
    async model(table, options) {
        await this.connect(this.Model);

        const gqb = knex({ dialect: 'postgres' });

        const q = gqb
            .withSchema('system')
            .select(['name', 'type'])
            .from('columns')
            .andWhere({ database: this.Model.database, table })

        const temp = q.toQuery();

        const { data: columns } = await this.query(temp + ';', { ...(options || {}) });

        const res = columns.reduce((acc, { name }) => {
            acc[name] = name;

            return acc;
        }, {});

        return res;
    }

    /**
     * @potected
     * 
     * @param {*} SQL 
     * @param {*} inputOptions 
     * @returns 
     */
    setQueryTags(SQL, inputOptions) {
        let requestSql = typeof SQL !== 'string' ? SQL.query : SQL;

        if (inputOptions && inputOptions.tags) {
            let str = '';
            for (const key in inputOptions.tags) {
                const value = inputOptions.tags[key];

                if (value) {
                    str += `${key}=${value};`;
                }
            }

            if (str) {
                requestSql = requestSql.replace(/;+$/, '');
                requestSql = `${requestSql} SETTINGS log_comment = '${str.trim()}'`;
            }
        }

        return requestSql;
    }

    /**
     * @public
     * 
     * @param {string} SQL 
     * @param {*} options 
     * @returns 
     */
    async querySql(SQL, options = {}) {
        console.log(SQL);

        const data = await super.querySql(SQL, options);

        const rows = data?.data;

        if (options.type === 'SELECT') {
            return data?.data || [];
        }

        return [rows];
    }

    /**
     * Получение активных запросов по traceId
     * @public
     * @param {string} traceName - название поля трассировки
     * @param {string} traceValue - значение идентификатора трассировки
     * @returns {Promise<Array>}
     */
    async getActiveQueriesByTrace(traceName, traceValue) {
        const sql = `
        SELECT
            query_id as pid,
            query
        FROM system.processes
        WHERE query_id != queryID() AND 
        query LIKE '%${traceName}=${traceValue}%'`;

        try {
            const { stream } = await this.connector.stream(sql);
            const result = [];

            for await (const rows of stream) {
                for (let i = 0; i < rows.length; i++) {
                    result.push(rows[i].json());
                }
            }

            return result || [];
        } catch (error) {
            console.error('Error getting active queries:', error);
            return [];
        }
    }

    /**
     * Отмена запроса по query_id
     * @public
     * @param {string} queryId - ID запроса для отмены
     * @param {string} [message='CancelByUser'] - сообщение для отмены
     * @returns {Promise<any>}
     */
    async cancelActiveQuery(queryId, message = 'CancelByUser') {
        const sql = `KILL QUERY WHERE query_id='${queryId}'`;

        try {
            const { stream } = await this.connector.stream(sql);
            const result = [];

            for await (const rows of stream) {
                for (let i = 0; i < rows.length; i++) {
                    result.push(rows[i].json());
                }
            }

            console.log(`Query ${queryId} cancelled with message: ${message}`);
            return result;
        } catch (error) {
            console.error(`Error canceling query with query_id ${queryId}:`, error);
            throw error;
        }
    }
}

module.exports = ClickHouseConnector;
