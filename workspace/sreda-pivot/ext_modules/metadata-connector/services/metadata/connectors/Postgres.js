const knex = require('knex');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const crypto = require('crypto');

dayjs.extend(utc);

const pg = require('pg');
// Crutch for postgresql-server@9.4.26
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (stringValue) => dayjs(stringValue).format('YYYY-MM-DDTHH:mm:ss.SSS'));
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (stringValue) =>
    dayjs(stringValue).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
);
pg.types.setTypeParser(pg.types.builtins.TIME, (stringValue) => dayjs(stringValue).format('HH:mm:ss'));
pg.types.setTypeParser(pg.types.builtins.TIMETZ, (stringValue) => dayjs(stringValue).utc().format('HH:mm:ss[Z]'));
pg.types.setTypeParser(pg.types.builtins.DATE, (stringValue) => dayjs(stringValue).format('YYYY-MM-DD'));

const { isNil } = require('../../../../utils/services');

const { Sequelize, QueryTypes } = require('sequelize');
const AbstractConnector = require('./AbstractConnector');
const ApiError = require('../../../../../core/exceptions/ApiError');
const constants = require('../../../constants');

/**
 * @typedef {import('../Connector.class').Ifrom} Ifrom
 * @typedef {import('../types').IFieldRecursive} IFieldRecursive
 * @typedef {import('../types').IFindAllChildren} IFindAllChildren
 */

class Postgres extends AbstractConnector {
    connector = null;

    name = 'Postgres';

    /**
     * @public
     * @param {string} arrayField 
     * @returns {string}
     */
    getFieldLength = (arrayField) => `cardinality(${this.ecran(arrayField)})`;

    /**
     * @public
     * @param {string} arrayField 
     * @returns {string}
     */
    getLastElemntOfArray = (arrayField) => `${this.ecran(arrayField)}[(cardinality(${this.ecran(arrayField)}))]`;

    /**
     * @public
     * 
     * @param {string} arrayField 
     * @param {string} [type]
     * @returns 
     */
    filterArray = (arrayField, type) => `array_remove(${this.ecran(arrayField)}, ${this.getDefaultValue(type)})`;

    /**
     * @public
     * @param {string} arrayField 
     * @param {string} [type] 
     * @returns {string}
     */
    getLastNonEmptyElemntOfArray = (arrayField, type) => {
        return `(${this.filterArray(arrayField, type)}) [cardinality(array_remove(${this.ecran(arrayField)}, ${this.getDefaultValue(type)}))]`;
    }

    /**
     * @param {string} type 
     * @returns {any}
     */
    getDefaultValue = (type) => {
        /** @type {string | number} */
        let defaultValue = 'NULL';

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
     * 
     * @param {string} arrayField 
     * @param {number} index 
     * @returns {string}
     */
    getElementOfArray = (arrayField, index) => `${arrayField}[${index}]`;

    async connect(connectionSettings) {
        if (!this.connector) {
            const settings = { ...connectionSettings };
            settings.dialect = settings.dialect || 'postgres';
            settings.dialectModule = pg;

            if (settings.ca || settings.cert || settings.key) {
                const creds = await this.getSslCredentials(settings);

                settings.dialectOptions = {
                    ssl: {
                        ...creds,
                        require: true,
                    },
                };
            } else if (settings.ssl) {
                settings.dialectOptions = {
                    ssl: {
                        require: true,
                        rejectUnauthorized: settings.rejectUnauthorized,
                    },
                };
            }

            if (settings.gss) {
                settings.native = settings.gss;
            }

            const target = settings.connection_string
                ? 'connection_string'
                : `${settings.host || '127.0.0.1'}:${settings.port || 5432}/${settings.database || ''}`;
            console.info(`Cube Postgres connect ${target}`);

            this.connector = settings.connection_string
                ? new Sequelize(settings.connection_string, settings)
                : new Sequelize(settings.database, settings.user, settings.password, settings);

            this._connectTarget = target;
        }
    }

    /**
     * @public
     * 
     * @param {string} query 
     * @param {string} prefix 
     * 
     * @returns {{ sql: string, name: string }}
     */
    volatile(query, prefix) {
        const lq = query.replaceAll(';', '');
        const md5 = crypto.createHash('md5').update(lq).digest('hex');
        const id = `${prefix}${md5}`;

        return {
            sql: `DROP TABLE IF EXISTS ${id}; 
              CREATE TEMP TABLE ${id} ON COMMIT DROP AS (${lq});`,
            name: id
        };
    }

    async transaction() {
        return this.connector.transaction();
    }

    /**
     * @public
     * 
     * @param {Ifrom} table 
     * @param {object} options 
     * @returns
     */
    async findAll(table, options) {
        await this.connect(this.Model);

        const SQL = await this.findSQL(table, options);

        let hache = '';
        if (global.TASK_CACHE?.on) {
            hache = crypto.createHash('md5').update(SQL).digest('hex')
            // hache = AbstractConnector.getHash(SQL);
            const result = global.TASK_CACHE.data?.[hache];
            if (result) {
                return structuredClone(result);
            }
        }

        /** @type {object[]} */
        let result = await this.query(SQL, { ...(options || {}), type: QueryTypes.SELECT });

        if (options.withChildren) {
            /** @type {{ pk: IFieldRecursive, parent: IFieldRecursive, where: object, guideAttrs: string[] }} */
            const { pk, parent, where, guideAttrs } = options.withChildren;

            const queries = result.map(async (row) => {
                const { children, parents, childrenFields } = await this.findAllChildren(table, { pk, parent, where, guideAttrs }, row[pk.field]);

                row.children = children;
                row.parents = parents;
                row.childrenFields = childrenFields;

                return row;
            });

            result = await Promise.all(queries);
        }

        if (global.TASK_CACHE?.on) {
            global.TASK_CACHE.data[hache] = structuredClone(result);
        }

        return result;
    }

    /**
     * @param {{ sqls: Ifrom[], withOptions: object, volatileOptions: object }} param0
     * 
     * @returns {Promise<AsyncIterable<object[]>>}
     */
    async findGen({ withOptions, volatileOptions, sqls }) {
        const sql = this.union({ sqls });

        const preReq = this.union({ withOptions, volatileOptions, sqls: [] });

        return this.getCursorData(sql, { preReq });
    }

    /**
     * TODO сделать поддержку внешних транзакций
     * 
     * @private
     * 
     * @param {string} SQL 
     * @param {{ preReq?: string, transaction?: object, batchSize?: number }} options 
     */
    async * getCursorData(SQL, options = {}) {
        const transaction = await this.connector.transaction();
        const preReq = options?.preReq || '';

        const batchSize = options?.batchSize || sreda.env.CHUNCK_READ_SIZE || 1_000;
        const maxPages = sreda.env.MAX_SLICE_ROW_SIZE || 200;

        let page = 0;

        try {
            const declareSql = `${preReq} DECLARE my_cursor CURSOR FOR (${SQL.replaceAll(';', '')})`;

            let _ = null;

            _ = await this.querySql(declareSql, { transaction, type: QueryTypes.SELECT });

            for (; ;) {
                const rows = await this.querySql(`FETCH FORWARD ${batchSize} FROM my_cursor; `, { transaction, type: QueryTypes.SELECT });

                ++page;

                if (page * batchSize > maxPages * batchSize) {
                    throw ApiError.BadRequest(`Превышен максимальный размер среза в ${page * batchSize} для такого объема данных используйте функционал отчетов`);
                }

                if (rows.length) {
                    yield rows;
                } else {
                    break;
                }
            }

            _ = await this.querySql(`CLOSE my_cursor;`, { transaction, type: QueryTypes.SELECT });

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();

            throw err;
        }
    }

    /**
     * @protected
     * 
     * @param {Ifrom} table 
     * @param {IFindAllChildren} fields 
     * @param {string} parent 
     * @returns 
     */
    async findAllChildren(table, fields, parent) {
        const { guideAttrs } = fields;

        const [rows] = await super.findAllChildren(table, fields, parent);

        const childrenFields = [];
        const children = new Set();
        const parents = new Set();
        for (let i = 0; i < rows.length; i++) {
            !isNil(rows[i].__child__) && children.add(rows[i].__child__);
            !isNil(rows[i].__parent__) && parents.add(rows[i].__parent__);

            if (!guideAttrs.length) continue;

            const child = guideAttrs.reduce((acc, key) => {
                acc[key] = rows[i][key];

                return acc;
            }, {});

            childrenFields.push(child);
        }

        return { children: Array.from(children), childrenFields, parents: Array.from(parents) };
    }

    async count(table, options) {
        const res = await super.count(table, options);

        let count = 0;
        if (Array.isArray(res[0]) && res[0].length > 0) {
            count = parseInt(res[0][0].count) || 0;
        } else {
            count = parseInt(res[0]?.count) || 0;
        }
        return count;
    }

    async update(table, values, options) {
        await this.connect(this.Model);

        // options = structuredClone(options);

        if (options?.rls && options?.where) {
            ({ where: options.where } = this.getRlsOptions({ type: 'write', where: options?.where, options }));
        }

        const SQL = await this.connector.dialect.queryGenerator.updateQuery(
            { schema: this.Model.schema, tableName: table },
            values,
            options.where,
        );

        const res = await this.query(SQL, { ...options, type: QueryTypes.UPDATE });
        return res[1] > 0;
    }

    /**
     * @param {object[]} values 
     * @param {Ifrom} table 
     * @param {{ returning: boolean, transaction: object, conflict: { fields: string[], action: 'ignore' }, queue: any }} options 
     * @returns 
     */
    async #create(table, values, options) {
        let result = false;
        let data;

        const { conflict, returning, queue } = options;

        await this.connect(this.Model);

        /** @type {{ bind: any[], query: string }} */
        const SQL = await this.queryGenerator.insertQuery({ schema: this.Model.schema, tableName: table }, values, {});

        if (!queue) {
            if (conflict) {
                const { fields, action } = conflict;
                const type = action === 'ignore' ? `NOTHING` : '';

                SQL.query = `${SQL.query.replace(/;+$/g, '')} ON CONFLICT ("${fields.join('", "')}") DO ${type} `;
            }

            // RETURNING col_a, col_b, col_c
            const res = await this.query(SQL, { ...(options || {}), type: QueryTypes.INSERT });
            result = res[1] === 1;
            if (result && returning) {
                data = values;
            }
            return { result: res[1] === 1, data };
        } else {
            return SQL;
        }
    }

    /**
     * @override
     * @param {*} tableName 
     * @param {*} values 
     * @param {*} options 
     * @returns 
     */
    async create(tableName, values, options) {
        return super.create(tableName, values, options, this.#create.bind(this));
    }


    async #bulkCreate(table, values, options) {
        await this.connect(this.Model);

        let SQL = await this.queryGenerator.bulkInsertQuery({ schema: this.Model.schema, tableName: table }, values);
        if (options.conflict) {
            const { fields, action } = options.conflict;
            const type = action === 'ignore' ? `NOTHING` : '';

            SQL = `${SQL.replace(/;+$/g, '')} ON CONFLICT ("${fields.join('", "')}") DO ${type} `;
        }

        // RETURNING col_a, col_b, col_c
        const res = await this.query(SQL, { ...(options || {}), type: QueryTypes.INSERT });

        return { result: res[1] === 1 };
    }

    /**
     * @override
     * @param {*} tableName 
     * @param {*} values 
     * @param {*} options 
     * @returns 
     */
    async bulkCreate(tableName, values, options = {}) {
        if (options.returning === undefined) delete options['returning'];
        return super.bulkCreate(tableName, values, options, this.#bulkCreate.bind(this));
    }

    /**
     * Метод вставки/обновления записи.
     * @param {string} tableName Наименование таблицы
     * @param {object[]} values Строки для вставки
     * @param {object} options Дополнительные опции
     * @param {boolean} [options.returning] Возвращать ли вставленные строки
     * @param {string[]} [options.upsertKeys] Ключи из-за которых появляется конфликт
     * @param {string[]} [options.updateOnDuplicate] Ключи для обновления при конфликте
     * @param {string[]} [options.incrementOnDuplicate] Ключи для обновления при конфликте
     * @param {object} [options.transaction] Транзакция
     * @param {object} [options.queue] Очередь
     * @returns {Promise<object[]>} Добавленные строки
     */
    async #upsert(tableName, values, options) {

        //TODO убрать в Postgres коннектор
        if (!tableName || !values?.length) {
            throw ApiError.BadRequest('Переданы некорректные параметры');
        }

        await this.connect(this.Model);
        const table = { schema: this.Model.schema, tableName };
        const {
            upsertKeys = [],
            updateOnDuplicate = [],
            incrementOnDuplicate = [],
            returning = false,
            transaction,
            queue
        } = options;
        let SQL = await this.queryGenerator.bulkInsertQuery(table, values).slice(0, -1);

        if (
            upsertKeys.length > 0 &&
            (updateOnDuplicate.length > 0 || incrementOnDuplicate.length > 0)
        ) {
            const updates = [];
            const keys = upsertKeys.map(key => `"${key}"`).join(',');

            for (let key of updateOnDuplicate) {
                updates.push(`${key} = EXCLUDED.${key}`);
            }

            for (let key of incrementOnDuplicate) {
                updates.push(`${key} = ${tableName}.${key} + EXCLUDED.${key}`);
            }

            SQL += ` ON CONFLICT (${keys}) DO UPDATE SET ${updates.join(', ')}`;
        }

        if (!queue) {
            if (returning) SQL += ' RETURNING *';
            return await this.query(`${SQL};`, { returning, transaction });
        } else {
            return SQL;
        }
    }

    /**
     * @override
     * @param {*} tableName 
     * @param {*} values 
     * @param {*} options 
     * @returns 
     */
    async upsert(tableName, values, options) {
        // @ts-ignore
        return super.upsert(tableName, values, options, this.#upsert.bind(this));
    }

    async delete(table, options, serviceOptions) {
        await this.connect(this.Model);

        options = structuredClone(options);

        if (options?.rls && options?.where) {
            ({ where: options.where } = this.getRlsOptions({ type: 'delete', where: options?.where, options }));
        }

        const SQL = await this.queryGenerator.deleteQuery({ schema: this.Model.schema, tableName: table }, options.where);

        const res = await this.query(SQL, { ...serviceOptions, type: QueryTypes.BULKDELETE }); // Type DELETE returns VOID

        return res > 0;
    }

    async synch(table, options) {
        await this.connect(this.Model);

        options.typeMapping = {
            DATE: 'DATE',
            DATETIME: 'TIMESTAMP',
            BLOB: 'UUID',
            STRING: 'VARCHAR',
        };

        let result;

        const SQL = await super.synch(table, options);
        if (SQL) {
            let INDEXSQL = "";
            // TODO: если такой ключ уже есть нужно его пересоздать
            if (options.SysKeys) {
                const indexList = [];
                for (let key in options.SysKeys) {
                    const keys = options.SysKeys[key];

                    if (!keys.length) {
                        continue;
                    }

                    const columns = `"${keys.join('", "')}"`;
                    indexList.push(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_${table}_${key}" ON "${this.Model.schema}"."${table}" (${columns});`);
                }

                INDEXSQL = indexList.join("\n");
            }

            const TSQL = `BEGIN;
                    ${SQL}    
                    ${INDEXSQL}
                    COMMIT;`

            result = await this.query(TSQL);
        }

        return result;
    }

    /**
     * @param {string} table 
     * @returns {Promise<Record<string, string>>}
     */
    async model(table, options = {}) {
        await this.connect(this.Model);

        const gqb = knex({ dialect: 'postgres' });

        const q = gqb
            .withSchema('pg_catalog')
            .select([
                gqb.raw('attname AS name'),
                gqb.raw('FORMAT_TYPE(atttypid, atttypmod)')
            ])
            .from('pg_attribute')
            .where('attstattarget', -1)
            .andWhereRaw(`attrelid = '\"${this.Model.schema}\".\"${table}\"'::REGCLASS`)

        const temp = q.toQuery();

        let columns = [];
        try {
            [columns] = await this.query(temp + ';', { ...(options || {}) });
        } catch (err) {
            console.error(err?.message)
        }

        const res = columns.reduce((acc, { name }) => {
            acc[name] = name;

            return acc;
        }, {});

        return res;
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
     * @protected
     * 
     * @param {*} SQL 
     * @param {*} inputOptions 
     * @returns 
     */
    async setQueryTags(SQL, inputOptions) {
        return super.setQueryTags(SQL, inputOptions)
    }
    /**
     * @protected
     * @override
     *
     * @param {string | { query: string, bind: any[] }} SQL 
     * @param {*} options
     */
    async query(SQL, options) {
        options = options ?? {};

        let requestSql = SQL;
        if (options.type === QueryTypes.SELECT) requestSql = await this.setQueryTags(SQL, options);

        return this.connector.query(requestSql, options).catch((e) => {
            console.error(e);

            switch (e.name) {
                case 'SequelizeConnectionAcquireTimeoutError':
                    e.message = 'Нет доступных соединений с базой данных.';
                    break;
                case 'SequelizeConnectionRefusedError':
                    e.message = `В соединении с базой данных отказано (${this._connectTarget || [this.Model?.host, this.Model?.port].filter(Boolean).join(':') || 'неизвестный хост'}). Это коннектор куба, не метаданные: проверьте хост/порт в карточке коннектора и VPN.`;
                    break;
                case 'SequelizeConnectionTimedOutError':
                    e.message = 'Истекло время попытки соединения с базой данных.';
                    break;
                case 'SequelizeTimeoutError':
                    e.message = 'Истекло время выполнения запроса к базе данных.';
                    break;
            }

            if (e.original) {
                switch (e.original.code) {
                    case '57014':
                        e.message = 'Превышено предельное допустимое время выполнения запроса.';
                        break;
                    case '53300':
                        e.message = 'Превышено количество допустимых соединений с базой данных.';
                        break;
                }
            }

            throw e;
        });
    }

    /**
     * Получение активных запросов по traceId
     * @public
     * @param {string} traceName - название поля трассировки
     * @param {string} traceValue - значение идентификатора трассировки
     * @returns {Promise<Array>}
     */
    async getActiveQueriesByTrace(traceName, traceValue) {
        const sql = `SELECT 
                    pid,
                    usename,
                    state,
                    NOW() - query_start AS duration,
                    LEFT(query, 200) AS query_preview
                FROM pg_stat_activity
                WHERE state = 'active'
                    AND pid <> pg_backend_pid()
                    AND query LIKE '%${traceName}=${traceValue}%'
                ORDER BY query_start DESC;`;

        try {
            const result = await this.querySql(sql, { type: QueryTypes.SELECT });
            return result;
        } catch (error) {
            console.error('Error getting active queries:', error);
            return [];
        }
    }

    /**
     * Отмена запроса по PID
     * @public
     * @param {number} pid - ID процесса для отмены
     * @param {string} [message='CancelByUser'] - сообщение для отмены
     * @returns {Promise<any>}
     */
    async cancelActiveQuery(pid, message = 'CancelByUser') {
        const sql = `SELECT pg_cancel_backend(${pid}, '${message}');`;

        try {
            const result = await this.querySql(sql, {});
            return result;
        } catch (error) {
            console.error(`Error canceling query with PID ${pid}:`, error);
            throw error;
        }
    }
}

module.exports = Postgres;
