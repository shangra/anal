const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

const pg = require('pg');
// Crutch for postgresql-server@9.4.26
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (stringValue) =>
    dayjs(stringValue).format('YYYY-MM-DDTHH:mm:ss.SSS')
);
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (stringValue) =>
    dayjs(stringValue).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
);
pg.types.setTypeParser(pg.types.builtins.TIME, (stringValue) =>
    dayjs(stringValue).format('HH:mm:ss')
);
pg.types.setTypeParser(pg.types.builtins.TIMETZ, (stringValue) =>
    dayjs(stringValue).utc().format('HH:mm:ss[Z]')
);
pg.types.setTypeParser(pg.types.builtins.DATE, (stringValue) =>
    dayjs(stringValue).format('YYYY-MM-DD')
);

const { Sequelize, QueryTypes } = require('sequelize');

const { b } = require('../../../query-builder');
const { PostgresDialect } = require('../../../postgres-ext-query-builder');

const AbstractConnector = require('../../../metadata-connector/services/connectors/AbstractConnector');
const ApiError = require('../../../../core/exceptions/ApiError');

class PostgresConnector extends AbstractConnector {
    name = 'Postgres';

    connector = null;

    createDialect(settings) {
        return new PostgresDialect({ schema: settings.schema });
    }

    async connect() {
        if (this.connector) return;
        const s = this.settings;
        if (s.ssl) {
            const ssl = await this.getSslCredentials(s);
            s.dialectOptions = {
                ssl: {
                    ...ssl,
                    rejectUnauthorized: s.rejectUnauthorized,
                    require: true,
                },
            };
        }
        if (s.gss) s.native = true;
        s.logging = console.log;
        this.connector = s.connection_string
            ? new Sequelize(s.connection_string, s)
            : new Sequelize(s.database, s.user, s.password, s);
    }

    /**
     * {@inheritdoc}
     * @param {import('../../../query-builder/ast/Node').INode | string} ast (string deprecated!!!)
     * @param {{ timeOut?: number, tags?: object, transaction?: any }} [options]
     * @returns {Promise<object[]>}
     */
    async query(ast, options = {}) {
        if (typeof ast === 'string') return this.querySql(ast);

        await this.connect();
        const { sql, bindings } = this.compile(ast);
        return this.connector
            .query(sql, {
                ...options,
                replacements: bindings,
                type: QueryTypes.SELECT,
            })
            .catch(this._mapError);
    }

    async querySql(sql, options = {}) {
        await this.connect();
        const result = await this.connector
            .query(sql, { ...options, type: QueryTypes.SELECT })
            .catch(this._mapError);
        //query
        return [result];
    }

    async *stream(ast, options = {}, e = ApiError.BadRequest) {
        await this.connect();
        const { tags, temps, ctes, body, bindings } = this.compile(ast, {
            split: true,
        });
        const batchSize =
            options.batchSize || sreda.env.CHUNCK_READ_SIZE || 1_000;
        const maxPage = options.pages || sreda.env.MAX_SLICE_ROW_SIZE || 200;
        const tx = await this.connector.transaction();
        try {
            await this.connector.query(
                `${tags.sql || ''} ${
                    temps.sql || ''
                } DECLARE mqb_cursor CURSOR FOR (${ctes.sql || ''} ${
                    body.sql
                })`,
                {
                    transaction: tx,
                    replacements: bindings,
                    type: QueryTypes.SELECT,
                }
            );
            for (let page = 0; ; page++) {
                const rows = await this.connector.query(
                    `${
                        tags.sql || ''
                    } FETCH FORWARD ${batchSize} FROM mqb_cursor`,
                    { transaction: tx, type: QueryTypes.SELECT }
                );
                if (page >= maxPage)
                    throw e(`Превышен лимит строк ${page * batchSize}`);
                if (!rows.length) break;
                yield rows;
            }
            await this.connector.query(`${tags.sql || ''} CLOSE mqb_cursor`, {
                transaction: tx,
            });
            await tx.commit();
        } catch (e) {
            await tx.rollback();
            throw e;
        }
    }

    async exec(ast, options = {}) {
        await this.connect();
        const { sql, bindings } = this.compile(ast);
        return this.connector
            .query(sql, { ...options, replacements: bindings })
            .catch(this._mapError);
    }

    _mapError = (e) => {
        const map = {
            SequelizeConnectionAcquireTimeoutError:
                'Нет доступных соединений с БД.',
            SequelizeConnectionRefusedError: 'В соединении с БД отказано.',
            SequelizeConnectionTimedOutError:
                'Истекло время попытки соединения с БД.',
            SequelizeTimeoutError: 'Истекло время выполнения запроса к БД.',
        };
        if (map[e.name]) e.message = map[e.name];
        if (e.original?.code === '57014')
            e.message = 'Превышено время выполнения запроса.';
        if (e.original?.code === '53300')
            e.message = 'Превышено число допустимых соединений с БД.';
        throw e;
    };

    async introspectColumns(table, schema = this.settings.schema) {
        const ast = b.select({
            projections: [
                b.proj(b.col('column_name'), 'name'),
                b.proj(b.col('data_type'), 'type'),
            ],
            from: b.from(b.table('columns', { schema: 'information_schema' })),
            where: b.and(
                b.eq(b.col('table_schema'), b.param(schema)),
                b.eq(b.col('table_name'), b.param(table))
            ),
        });
        const rows = await this.query(ast);
        return Object.fromEntries(
            rows.map((r) => [r.name, { name: r.name, type: r.type }])
        );
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
            const result = await this.querySql(sql, {
                type: QueryTypes.SELECT,
            });
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

    /**
     * @param {*} table
     * @param {*} rows
     * @param {*} options
     * @returns
     */
    async bulkInsert(table, rows, options) {
        await this.connect();

        const { returning, queue } = options;

        const ast = await this._bulkInsert(table, rows, options);
        const { split, hoist } = options;
        const { sql, bindings } = this.compile(ast, { split, hoist });

        if (!queue) {
            let data;
            // RETURNING col_a, col_b, col_c
            const res = await this.connector
                .query(sql, {
                    ...options,
                    replacements: bindings,
                    type: QueryTypes.INSERT,
                })
                .catch(this._mapError);
            const result = rows.length > 0 && res[1] === rows.length;
            if (result && returning) data = rows;
            return { result, data };
        }

        return sql;
    }

    /**
     * @param {*} table
     * @param {*} row
     * @param {*} options
     * @returns
     */
    async insert(table, row, options) {
        return this._queuedBulkInsert(
            table,
            [row],
            options,
            this.bulkInsert.bind(this)
        );
    }

    async update(table, values, options) {
        const ast = await this._update(table, values, options);
        const res = await this.exec(ast, {
            ...options,
            type: QueryTypes.UPDATE,
        });
        return res[1] > 0;
    }

    async delete(table, options) {
        const ast = await this._delete(table, options);
        const res = await this.exec(ast, {
            ...options,
            type: QueryTypes.BULKDELETE,
        });
        return res > 0;
    }

    /**
     * Получить список активных индексов таблицы.
     * Возвращает массив объектов { index_name: string }.
     * @param {string} table
     * @param {string} [schema]
     * @returns {Promise<Array<{ index_name: string }>>}
     */
    async getAllActiveIndexes(table, schema = this.settings.schema) {
        const ast = b.select({
            projections: [b.proj(b.col('indexname'), 'index_name')],
            from: b.from(b.table('pg_indexes')),
            where: b.and(
                b.eq(b.col('schemaname'), b.param(schema)),
                b.eq(b.col('tablename'), b.param(table))
            ),
        });
        const rows = await this.query(ast);
        return rows
            .filter((r) => r.index_name !== `${table}_pkey`)
            .map((r) => ({ index_name: r.index_name }));
    }

    /**
     * Получить список ограничений таблицы.
     * Возвращает массив имён ограничений.
     * Использует JOIN с pg_namespace и pg_class вместо raw подзапросов.
     * @param {string} table
     * @param {string} [schema]
     * @returns {Promise<string[]>}
     */
    async getAllConstrains(table, schema = this.settings.schema) {
        const ast = b.select({
            projections: [b.proj(b.col('conname'))],
            from: b.from(b.table('pg_constraint'), [
                b.join(
                    'inner',
                    b.table('pg_namespace', { alias: 'ns' }),
                    b.eq(b.col('nspname', 'ns'), b.param(schema)),
                    null,
                    false,
                    'ns'
                ),
                b.join(
                    'inner',
                    b.table('pg_class', { alias: 'cls' }),
                    b.and(
                        b.eq(b.col('relname', 'cls'), b.param(table)),
                        b.eq(b.col('relnamespace', 'cls'), b.col('oid', 'ns'))
                    ),
                    null,
                    false,
                    'cls'
                ),
            ]),
        });
        const rows = await this.query(ast);
        return rows.map((r) => r.conname);
    }

    /**
     * Синхронизация таблицы с поддержкой транзакции и SysKeys.
     * Использует Sequelize transaction API и AST DDL узлы.
     * @param {string} table
     * @param {object} options
     * @returns {Promise<any>}
     */
    async synch(table, options = {}) {
        options.typeMapping = {
            DATE: 'DATE',
            DATETIME: 'TIMESTAMP',
            BLOB: 'UUID',
            STRING: 'VARCHAR',
        };

        const schema = this.settings.schema;

        await this.connect();
        const tx = await this.connector.transaction();
        try {
            // Execute DDL from parent
            const astNodes = await this._synch(table, options); // returns INode | INode[]
            if (astNodes) {
                const nodes = Array.isArray(astNodes) ? astNodes : [astNodes];
                for (const node of nodes) {
                    await this.exec(node, { transaction: tx });
                }
            }

            // SysKeys indexes
            if (options.SysKeys) {
                for (const key in options.SysKeys) {
                    const fields = options.SysKeys[key];
                    if (!fields.length) continue;
                    const indexName = `idx_${table}_${key}`;
                    const idxNode = b.createIndex({
                        unique: true,
                        ifNotExists: true,
                        name: indexName,
                        schema,
                        table: b.table(table, { schema }),
                        fields,
                    });
                    await this.exec(idxNode, { transaction: tx });
                }
            }

            await tx.commit();
            return undefined;
        } catch (e) {
            await tx.rollback();
            throw e;
        }
    }

    async drop(table, options) {
        await this.connect();

        const tx = await this.connector.transaction();

        try {
            let result;

            const astNodes = await this._drop(table, options);
            if (astNodes) {
                const nodes = Array.isArray(astNodes) ? astNodes : [astNodes];
                for (const node of nodes) {
                    await this.exec(node, { transaction: tx });
                }
            }

            await tx.commit();
            return result;
        } catch (e) {
            await tx.rollback();
            throw e;
        }
    }

    // ================== DEPRECATED ==================

    /**
     * @deprecated use `insert`
     * @override
     * @param {*} tableName
     * @param {*} value
     * @param {*} options
     * @returns
     */
    async create(tableName, value, options) {
        return this._queuedBulkInsert(
            tableName,
            [value],
            options,
            (table, values, options) =>
                this.bulkInsert(table, values, options).then((res) =>
                    !options.queue
                        ? { result: res.result, data: res.data[0] }
                        : res
                )
        );
    }

    /**
     * @deprecated use `bulkInsert`
     * @override
     * @param {*} tableName
     * @param {*} values
     * @param {*} options
     * @returns
     */
    async bulkCreate(tableName, values, options = {}) {
        if (options.returning === undefined) delete options['returning'];
        return this._queuedBulkInsert(
            tableName,
            values,
            options,
            this.bulkInsert.bind(this)
        );
    }

    /**
     * Метод вставки/обновления записи.
     *
     * @deprecated use `bulkInsert`
     * @param {string} tableName Наименование таблицы
     * @param {object[]} values Строки для вставки
     * @param {object} options Дополнительные опции
     * @param {boolean} [options.returning] Возвращать ли вставленные строки
     * @param {string[]} [options.upsertKeys] Ключи из-за которых появляется конфликт
     * @param {string[]} [options.updateOnDuplicate] Ключи для обновления при конфликте
     * @param {string[]} [options.incrementOnDuplicate] Ключи для инкремента при конфликте
     * @param {object} [options.transaction] Транзакция
     * @param {object} [options.queue] Очередь
     * @returns Добавленные строки / SQL строка (если queue)
     */
    async upsert(tableName, values, options) {
        if (!tableName || !values?.length)
            throw ApiError.BadRequest('Переданы некорректные параметры');

        const {
            upsertKeys = [],
            updateOnDuplicate = [],
            incrementOnDuplicate = [],
            returning,
            transaction,
            queue,
        } = options;

        const set = updateOnDuplicate.map((c) =>
            b.assign(b.col(c), b.raw(`EXCLUDED.${c}`))
        );
        for (const col of incrementOnDuplicate) {
            // TODO: частный случай. Непонятно зачем оно тут
            set.push(
                b.assign(
                    b.col(col),
                    b.raw(`EXCLUDED.${col} + "EXCLUDED".${col}`)
                )
            );
        }

        return this._queuedBulkInsert(
            tableName,
            values,
            {
                onConflict: b.onConflict('update', {
                    target: { columns: upsertKeys },
                    set,
                }),
                schema: this.settings?.schema,
                returning,
                transaction,
                queue,
            },
            this.bulkInsert.bind(this)
        );
    }
}

module.exports = PostgresConnector;
