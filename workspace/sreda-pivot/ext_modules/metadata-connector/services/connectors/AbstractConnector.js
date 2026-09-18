'use strict';

const crypto = require('crypto');
const { b, print, normalizeWhere } = require('../../../query-builder');

const httpContext = require('../../../../core/services/http-context');
const Extensions = require('../../../../core/class/Extensions.class');
const Credentials = require('../credentials/Credentials');

/** @typedef {import('../../../query-builder/types').INode} INode */
/** @typedef {import('../types').ISynch} ISynch */
/** @typedef {import('../types').IConnector} IConnector */

/**
 * Коннектор теперь делает только 3 вещи:
 *   1) держит физическое подключение к СУБД;
 *   2) печатает AST в SQL через свой Dialect;
 *   3) исполняет SQL и возвращает строки/поток/количество.
 *
 * Все методы поднимают AST-узлы как first-class аргументы.
 *
 * @abstract
 * @implements {IConnector}
 */
class AbstractConnector extends Extensions {
    /** @type {object} */
    settings;

    /** @deprecated use `settings` */
    Model;

    /** @type {import('../../../query-builder').Dialect} */
    dialect;

    /** Вычисление hash настроек подключения для пула. */
    static getHash(settings) {
        return crypto
            .createHash('md5')
            .update(JSON.stringify(settings))
            .digest('hex');
    }

    constructor(settings) {
        super();
        this.settings = settings;
        /** TODO: для обратной совместимости */
        this.Model = settings;
        this.dbhash = AbstractConnector.getHash(
            JSON.stringify(
                settings.connection_string
                    ? { url: settings.connection_string }
                    : {
                          host: settings.host,
                          port: settings.port,
                          database: settings.database,
                      }
            )
        );
        this.connector = null;
        this.dialect = this.createDialect(settings);
    }

    /**
     * Переопределяется в наследниках.
     *
     * @abstract
     * @returns {import('../../../query-builder').Dialect}
     */
    createDialect(settings) {
        throw new Error('createDialect(): not implemented');
    }

    // ================== SSL helpers ==================

    /** @protected */
    async getSslCredentials({ ca, cert, key }) {
        const creds = new Credentials();
        const [caD, certD, keyD] = await Promise.all([
            ca ? creds.readFile(ca) : undefined,
            cert ? creds.readFile(cert) : undefined,
            key ? creds.readFile(key) : undefined,
        ]);
        return { ca: caD, cert: certD, key: keyD };
    }

    // ================== Connection ==================

    /**
     * Физическое подключение. Переопределяется.
     *
     * @abstract
     */
    async connect() {
        throw new Error('connect(): not implemented');
    }

    async close() {
        await this.connector?.close?.();
        this.connector = null;
    }

    // ================== ПЕЧАТЬ AST ==================

    /**
     * Компилировать AST в {sql, bindings} для текущего диалекта.
     *
     * @param {INode} ast
     * @param {{ split?: boolean, hoist?: boolean }} [options]
     * @returns {{ tags: { sql: string, bindings: any[] }, temps:{ sql: string, bindings: any[] }, ctes: { sql: string, bindings: any[] }, body: { sql: string, bindings: any[] }, sql: string, bindings: any[]}}
     */
    compile(ast, options) {
        return print(ast, this.dialect, options);
    }

    // ================== ИСПОЛНЕНИЕ ==================

    /**
     * Для выборки (если используешь готовый SQL, то иди в `querySql`)
     *
     * @abstract Диалекты реализуют свою версию. Нет поведения по-умолчанию умышлено.
     * @param {INode | string} ast (string deprecated!!!)
     * @param {{ timeOut?: number, tags?: object, transaction?: any }} [options]
     * @returns {Promise<object[]>}
     */
    async query(ast, options = {}) {
        throw new Error('query(): not implemented');
    }

    /**
     * Потоковая выборка (для больших объёмов).
     *
     * @abstract Диалекты реализуют свою версию. Нет поведения по-умолчанию умышлено.
     * @param {INode} ast
     * @returns {AsyncGenerator<any[], void, unknown>}
     */
    async *stream(ast, options = {}) {
        throw new Error('stream(): not implemented');
    }

    // ================== DML ==================

    /**
     * @abstract
     * @param {INode} ast Узел AST для Insert/Update/Delete/CreateTempTable/DropTable.
     * @returns {Promise<any[]>}
     */
    async exec(ast, options = {}) {
        throw new Error('exec(): not implemented');
    }

    /**
     * Получить «схему» таблицы: Map<columnName, {name, type}>.
     * Переопределяется в диалектах - у каждого свой information_schema.
     *
     * @abstract
     * @param {string} table
     * @param {string} [schema]
     * @returns {Promise<Record<string, { name: string, type: string }>>}
     */
    async introspectColumns(table, schema) {
        throw new Error('introspectColumns(): not implemented');
    }

    /** Существует ли таблица. */
    async isTableExist(table, schema) {
        const cols = await this.introspectColumns(table, schema);
        return !!Object.keys(cols).length;
    }

    /**
     * @public
     *
     * @param {string} table
     * @param {*} [options]
     * @returns {Promise<Record<string, { name: string; type: string; }>>}
     */
    async model(table, options) {
        await this.connect();
        const schema = this.settings.schema;
        const cols = await this.introspectColumns(table, schema);
        return cols;
    }

    // ======= DML helpers: принимают объекты, строят AST, отдают exec =======

    /**
     * @protected
     * @param {string} table
     * @param {object[]} rows  [{col: value, ...}]
     * @param {{ schema?: string, onConflict?: object, returning?: string[] }} [options]
     */
    async _bulkInsert(table, rows, options = {}) {
        if (!rows?.length) return null;
        const cols = Object.keys(rows[0]);
        const returning = options.returning
            ? Array.isArray(options.returning)
                ? options.returning
                : cols
            : [];
        let onConflict = null;
        if (options.onConflict) {
            const {
                fields,
                action = 'update',
                updateOn = [],
            } = options.onConflict;
            const set = updateOn.map((c) =>
                b.assign(b.col(c), b.raw(`EXCLUDED.${c}`))
            );
            onConflict = b.onConflict(action, {
                target: { columns: fields },
                set,
            });
        }
        return b.insert({
            table: b.table(table, { schema: options.schema }),
            columns: cols,
            rows: rows.map((r) => cols.map((c) => b.param(r[c]))),
            onConflict,
            returning: b.returning(returning.map((c) => b.col(c))),
        });
    }

    /**
     * @abstract
     * @returns {Promise<string | { result: boolean; data: any; }>}
     */
    async bulkInsert(table, rows, options) {
        throw new Error('bulkInsert(): not implemented');
    }

    /**
     * @protected
     * @param {string} table
     * @param {object} row  {col: value, ...}
     * @param {{ schema?: string, onConflict?: object, returning?: string[] }} [options]
     */
    async _insert(table, row, options) {
        return this._bulkInsert(table, [row], options);
    }

    /**
     * @abstract
     * @returns {Promise<string | { result: boolean; data: any; }>}
     */
    async insert(table, row, options) {
        throw new Error('insert(): not implemented');
    }

    /**
     * @protected
     * @param {string} table
     * @param {object} values
     * @param {{ where: any, schema?: string, rls?: boolean, returning?: string[] }} options
     */
    async _update(table, values, options) {
        const returning = options.returning
            ? Array.isArray(options.returning)
                ? options.returning
                : []
            : [];
        let where = structuredClone(options?.where ?? {});
        if (options?.rls) {
            where.$and ??= [];
            where.$and.push(this._getRlsFilter(table, 'write'));
        }
        return b.update({
            table: b.table(table, { schema: options.schema }),
            assignments: Object.entries(values).map(([c, v]) =>
                b.assign(b.col(c), b.param(v))
            ),
            where: normalizeWhere(where),
            returning: b.returning(returning.map((c) => b.col(c))),
        });
    }

    /**
     * @abstract
     * @param {*} table
     * @param {*} values
     * @param {*} options
     * @returns {Promise<boolean>}
     */
    async update(table, values, options = {}) {
        throw new Error('update(): not implemented');
    }

    /**
     * @protected
     * @param {string} table
     * @param {{ where: any, schema?: string, rls?: boolean, returning?: string[] }} options
     * @returns
     */
    async _delete(table, options) {
        const returning = options.returning
            ? Array.isArray(options.returning)
                ? options.returning
                : []
            : [];
        let where = structuredClone(options?.where ?? {});
        if (options?.rls) {
            where.$and ??= [];
            where.$and.push(this._getRlsFilter(table, 'delete'));
        }
        return b.delete_({
            table: b.table(table, { schema: options.schema }),
            where: normalizeWhere(where),
            returning: b.returning(returning),
        });
    }

    /**
     * @abstract
     * @param {string} table
     * @param {{ where: any, schema?: string, rls?: boolean, returning?: string[] }} options
     * @returns {Promise<boolean>}
     */
    async delete(table, options) {
        throw new Error('delete(): not implemented');
    }

    // ================== SCHEMA SYNC (DDL) ==================

    /**
     * Извлечение ключей из структуры Keys.
     * Поддерживает два формата:
     *   1) Старый (плоский): { primaryKeys: string[], uniqueKeys: [{name, fields}], indexes: [...] }
     *   2) Новый (по типу ISynch): Record<string, {name, fields, settings: {primaryKey, unique}}>
     *
     * @public
     * @static
     * @param {object} [keys]
     * @returns {{ primaryKeys: string[], uniqueKeys: Array<{name?: string, fields: string[]}>, indexes: Array<{name?: string, fields: string[], unique?: boolean}> }}
     */
    static generateKeys(keys) {
        const primaryKeys = [];
        const uniqueKeys = [];
        const indexes = [];

        if (!keys) return { primaryKeys, uniqueKeys, indexes };

        // Pattern 1: Old flat format { primaryKeys: [...], uniqueKeys: [...], indexes: [...] }
        if (Array.isArray(keys.primaryKeys)) {
            primaryKeys.push(...keys.primaryKeys);
        }
        if (Array.isArray(keys.uniqueKeys)) {
            for (const key of keys.uniqueKeys) {
                uniqueKeys.push({ name: key.name, fields: key.fields });
            }
        }
        if (Array.isArray(keys.indexes)) {
            for (const key of keys.indexes) {
                indexes.push({
                    name: key.name,
                    fields: key.fields,
                    unique: key.unique ?? false,
                });
            }
        }

        // Pattern 2: New format (Record<string, IKey>) per ISynch type
        for (const keyName in keys) {
            const keyDef = keys[keyName];
            if (!keyDef || typeof keyDef !== 'object') continue;
            if (keyDef.name !== undefined && Array.isArray(keyDef.fields)) {
                continue;
            }
            if (keyDef.settings) {
                if (keyDef.settings.primaryKey && keyDef.name) {
                    if (!primaryKeys.includes(keyDef.name)) {
                        primaryKeys.push(keyDef.name);
                    }
                }
                if (keyDef.settings.unique && keyDef.name) {
                    const fields = this._extractFields(keyDef.fields);
                    uniqueKeys.push({ name: keyDef.name, fields });
                }
            }
        }

        return { primaryKeys, uniqueKeys, indexes };
    }

    /**
     * Извлечь имена полей из объекта Record<string, Record<string, string>>.
     * @param {object} fields
     * @returns {string[]}
     */
    static _extractFields(fields) {
        if (Array.isArray(fields)) return fields;
        if (fields && typeof fields === 'object') {
            return Object.keys(fields);
        }
        return [];
    }

    /**
     * Конвертировать имя типа (STRING, INTEGER, TIMESTAMP...) в AST DataType ноду.
     * Применяет typeMapping и handle special types (SERIAL, TIMESTAMP WITH TIME ZONE).
     * @param {string} rawType
     * @param {object} options
     * @returns {object} AST DataType node
     */
    _typeToDataType(rawType, options) {
        const typeMapping = options?.typeMapping ?? {};
        const optNoSupportSerial = options?.noSupportSerial ?? false;

        let type = (rawType || 'STRING').toUpperCase();

        // Apply type mapping
        if (typeMapping[type]) {
            type = typeMapping[type];
        }

        const typeUpper = type.toUpperCase();

        // Special handling for TIMESTAMP
        if (typeUpper === 'TIMESTAMP') {
            return b.dataType('TIMESTAMP'); // will print with timezone via dialect
        }

        // Serial / autoIncrement
        if (typeUpper === 'SERIAL' || typeUpper === 'BIGSERIAL') {
            // For serial types, the length is encoded in the type name
            return b.dataType(typeUpper);
        }

        // INTEGER with noSupportSerial -> INTEGER (not SERIAL)
        if (typeUpper === 'INTEGER') {
            return b.dataType('INTEGER');
        }

        // String types with length
        if (typeUpper === 'STRING' || typeUpper === 'VARCHAR') {
            // len is handled by the caller
            return b.dataType(type, [255]);
        }

        // UUID
        if (typeUpper === 'UUID') {
            return b.dataType('UUID');
        }

        // Default: map through
        return b.dataType(typeUpper);
    }

    /**
     * Получить список активных индексов таблицы.
     * Реализуется в диалектах.
     *
     * @abstract
     * @param {string} table
     * @param {string} [schema]
     * @returns {Promise<Array>}
     */
    async getAllActiveIndexes(table, schema) {
        throw new Error('getAllActiveIndexes(): not implemented');
    }

    /**
     * Получить список ограничений таблицы.
     * Реализуется в диалектах.
     *
     * @abstract
     * @param {string} table
     * @param {string} [schema]
     * @returns {Promise<Array>}
     */
    async getAllConstrains(table, schema) {
        throw new Error('getAllConstrains(): not implemented');
    }

    /**
     * @protected
     *
     * Создание/синхронизация таблицы по переданным параметрам.
     *
     * @param {string} table
     * @param {ISynch} [options]
     * @returns {Promise<INode | INode[]>} — AST-узел или массив узлов
     */
    async _synch(table, options = {}) {
        const optResultAsArray = options.resultAsArray ?? false;
        const optNoSupportSerial = options.noSupportSerial ?? false;
        const optNoSupportDefault = options.noSupportDefault ?? false;
        const optNoSupportUnique = options.noSupportUnique ?? false;
        const optNoSupportNotNull = options.noSupportNotNull ?? false;
        const optNoSupportPK = options.noSupportPK ?? false;

        const schema = this.settings.schema;
        const result = [];

        await this.connect();

        const isTableExist = await this.isTableExist(table, schema);

        if (!isTableExist) {
            // ========== CREATE TABLE =========
            const { primaryKeys, uniqueKeys } = AbstractConnector.generateKeys(
                options.Keys
            );
            const columns = [];

            for (const fieldName in options.Fields) {
                const field = options.Fields[fieldName];
                const rawType = field.type ?? 'UUID';
                const typeMapping = options.typeMapping ?? {};

                // Build data type
                let dataTypeName = (rawType || 'STRING').toUpperCase();
                if (typeMapping[dataTypeName])
                    dataTypeName = typeMapping[dataTypeName];

                // Handle TIMESTAMP
                if (dataTypeName === 'TIMESTAMP') {
                    // TIMESTAMP -> will be rendered as TIMESTAMP WITH TIME ZONE
                }

                // Handle STRING -> VARCHAR(len)
                let dataTypeArgs = [];
                if (dataTypeName === 'STRING' || dataTypeName === 'VARCHAR') {
                    const len = field.len || 255;
                    dataTypeArgs = [len];
                    dataTypeName = 'VARCHAR';
                }

                // Handle SERIAL / autoIncrement
                if (field.increment && dataTypeName === 'INTEGER') {
                    dataTypeName = optNoSupportSerial ? 'INTEGER' : 'SERIAL';
                }

                const dataType = b.dataType(dataTypeName, dataTypeArgs);

                // Handle default value
                let defaultValue = null;
                if (field.default === 'UUID' && dataTypeName === 'UUID') {
                    defaultValue = null;
                } else if (
                    field.default !== undefined &&
                    field.default !== 'NOW' &&
                    field.default !== 'UUID'
                ) {
                    let val = String(field.default);
                    if (dataTypeName === 'STRING' || dataTypeName === 'UUID') {
                        val = `'${val}'`;
                    }
                    defaultValue = b.lit(field.default);
                } else if (
                    field.default === 'NOW' ||
                    (dataTypeName === 'TIMESTAMP' && field.default === 'NOW')
                ) {
                    defaultValue = b.fn('NOW');
                }

                columns.push(
                    b.columnDef({
                        name: fieldName,
                        dataType,
                        nullable: !(field.notnull ?? false),
                        defaultValue,
                        primaryKey: primaryKeys.includes(fieldName),
                        autoIncrement: !!field.increment,
                        unique: !!field.unique,
                    })
                );
            }

            // Unique constraints
            const uniqueConstraints = uniqueKeys.map((key) =>
                b.tableConstraint({
                    name: key.name || `uk_${table}_${key.fields.join('_')}`,
                    type: 'unique',
                    fields: key.fields,
                })
            );

            const createTable = b.createTable({
                table: b.table(table, { schema }),
                columns,
                uniqueConstraints,
            });
            result.push(createTable);
        } else {
            // ========== ALTER TABLE =========

            // Drop columns
            if (options.fieldsSettings?.delete) {
                for (const columnName of Object.keys(
                    options.fieldsSettings.delete
                )) {
                    result.push(
                        b.alterTable({
                            table: b.table(table, { schema }),
                            alterType: 'dropColumn',
                            columnName,
                            ifExists: true,
                        })
                    );
                }
            }

            // Add columns
            if (options.fieldsSettings?.insert) {
                for (const columnName of Object.keys(
                    options.fieldsSettings.insert
                )) {
                    const field = options.Fields[columnName];
                    const type = (field?.type || 'UUID').toUpperCase();
                    let sqlType = options?.typeMapping?.[type] ?? type;
                    const columnLen =
                        type === 'STRING' && field.len ? `(${field.len})` : '';
                    if (field.len) sqlType = `${sqlType}${columnLen}`;

                    result.push(
                        b.alterTable({
                            table: b.table(table, { schema }),
                            alterType: 'addColumn',
                            columnName,
                            dataType: b.dataType(
                                sqlType,
                                field.len ? [field.len] : []
                            ),
                            nullable: !(field.notnull ?? false),
                            ifNotExists: true,
                        })
                    );
                }
            }

            // Update columns (rename + type change)
            if (options.fieldsSettings?.update) {
                for (const columnName of Object.keys(
                    options.fieldsSettings.update
                )) {
                    const newColumn = options.fieldsSettings.update[columnName];
                    const type = (newColumn?.type || 'UUID').toUpperCase();
                    const columnType = (
                        options?.typeMapping?.[type] ??
                        type ??
                        'UUID'
                    ).toUpperCase();
                    const fieldName = newColumn.field ?? columnName;

                    if (newColumn.field && newColumn.field !== columnName) {
                        result.push(
                            b.alterTable({
                                table: b.table(table, { schema }),
                                alterType: 'renameColumn',
                                from: columnName,
                                to: newColumn.field,
                            })
                        );
                    }
                    result.push(
                        b.alterTable({
                            table: b.table(table, { schema }),
                            alterType: 'alterColumnType',
                            columnName: fieldName,
                            dataType: b.dataType(
                                columnType,
                                newColumn.len ? [newColumn.len] : []
                            ),
                        })
                    );
                }
            }
        }

        // Recreate unique keys
        if (isTableExist && options.recreateKeys) {
            const tableKeys = await this.getAllActiveIndexes(table, schema);
            const tableConstrains = await this.getAllConstrains(table, schema);
            const { uniqueKeys } = AbstractConnector.generateKeys(options.Keys);

            for (const key of tableKeys) {
                const indexName = key.index_name || key.name || key;
                result.push(
                    b.dropIndex({
                        ifExists: true,
                        schema,
                        name: indexName,
                    })
                );
            }
            for (const key of tableConstrains) {
                result.push(
                    b.alterTable({
                        table: b.table(table, { schema }),
                        alterType: 'dropConstraint',
                        constraintName: key,
                        ifExists: true,
                    })
                );
            }
            for (const key of uniqueKeys) {
                const indexName = `idx_${table}_${key.fields.join('_')}`;
                result.push(
                    b.createIndex({
                        unique: true,
                        ifNotExists: true,
                        name: indexName,
                        schema,
                        table: b.table(table, { schema }),
                        fields: key.fields,
                    })
                );
            }
        }

        return optResultAsArray ? result : result;
    }

    /**
     * Создание/синхронизация таблицы по переданным параметрам.
     *
     * @abstract
     * @param {string} table
     * @param {ISynch} [options]
     * @returns {Promise<any>}
     */
    async synch(table, options = {}) {
        throw new Error('synch(): not implemented');
    }

    /**
     * @protected
     * @param {string} table
     * @param {{ ifExists?: boolean, cascade?: boolean, temp?: boolean }} [options]
     * @returns
     */
    async _drop(
        table,
        { ifExists = true, cascade = false, temp = false } = {}
    ) {
        return b.drop({
            table: b.table(table, { schema: this.settings.schema }),
            ifExists,
            cascade,
            temp,
        });
    }

    /**
     * @abstract
     * @param {*} table
     * @param {*} options
     */
    async drop(table, options) {
        throw new Error('delete(): not implemented');
    }

    /**
     * Build DROP INDEX AST node.
     * @param {string} schema
     * @param {string} table
     * @param {object} key
     * @returns {object} AST DropIndex node
     */
    buildDropIndexSQL(schema, table, key) {
        const indexName = key.index_name || key.name || key;
        return b.dropIndex({ ifExists: true, schema, name: indexName });
    }

    /**
     * Build CREATE INDEX AST node.
     * @param {string} schema
     * @param {string} table
     * @param {string[]} fields
     * @returns {object} AST CreateIndex node
     */
    buildAddIndexSQL(schema, table, fields) {
        const indexName = `idx_${table}_${fields.join('_')}`;
        return b.createIndex({
            unique: true,
            ifNotExists: true,
            name: indexName,
            schema,
            table: b.table(table, { schema }),
            fields,
        });
    }

    transaction(transaction) {
        return this.connector?.transaction
            ? this.connector.transaction({ transaction })
            : {
                  commit: () => {},
                  rollback: () => {},
              };
    }

    // ================== DEPRECATED ==================

    /**
     * TODO: Вынести в отдельный модуль для обогащения rls
     *
     * @private
     * @deprecated
     * @param {string} table
     * @param {string} [type='read']
     */
    _getRlsFilter(table, type = 'read') {
        let user = {
            id: '00000000-0000-0000-0000-000000000000',
            rules: {
                '90499885-ae60-440b-a59f-cfd3958110cd': {
                    name: 'AllRead',
                    details: 'AllRead',
                },
            },
        };

        const sessionStorage = httpContext.get('sessionStorage');
        if (sessionStorage?.user) {
            user = Object.assign(
                {},
                user,
                JSON.parse(JSON.stringify(sessionStorage.user))
            );
        }

        const userAccessIds = (user.id ? [user.id] : []).concat(
            Object.keys(user.rules ?? {}),
            Object.keys(user.roles ?? {}),
            Object.keys(user.groups ?? {})
        );

        return b.exists(
            b.select({
                projections: [b.proj(b.col('owner_id'))],
                from: b.from(
                    b.table('Rls', {
                        schema: sreda.env.DB_SCHEMA,
                        alias: 'rls',
                    })
                ),
                where: b.and(
                    b.eq(b.col('type', 'rls'), b.param(type)),
                    b.eq(b.col('table_id', 'rls'), b.col('id', table)),
                    b.in(
                        b.col('owner_id', 'rls'),
                        userAccessIds.map((v) => b.param(v))
                    )
                ),
                limit: b.limit(1),
            })
        );
    }

    /**
     * @deprecated use `query` instead. Хватит использовать сырой SQL, переходи на AST.
     *
     * @abstract Диалекты реализуют свою версию. Нет поведения по-умолчанию умышлено.
     * @param {string} sql
     * @param {{ timeOut?: number, tags?: object, transaction?: any }} [options]
     * @returns {Promise<object[]>}
     */
    async querySql(sql, options = {}) {
        throw new Error('querySql(): not implemented');
    }

    /**
     * @deprecated use `query`
     *
     * @param {{ table: string; alias: string } | string} from
     * @param {object} options
     * @returns {Promise<object[]>}
     */
    async findAll(from, options) {
        const ast = await this.#queryAst(from, options);
        return this.query(ast);
    }

    /**
     * Принимает from (таблицу) и формирует AST для запроса к нему
     *
     * @deprecated Подобие query-builder. Переходим на AST.
     *
     * @param {{ table: string; alias: string } | string} from
     * @param {object} [options]
     * @param {({ func: string; field: string; alias: string; } | string | [string, string])[]} [options.attributes]
     * @param {object} [options.where]
     * @param {string[]} [options.group]
     * @param {object} [options.having]
     * @param {[string, string][]} [options.order]
     * @param {boolean} [options.rls]
     * @returns {Promise<INode>}
     */
    async #queryAst(from, options = {}) {
        const projections =
            options?.attributes?.map((attr) => {
                if (Array.isArray(attr)) return b.proj(b.col(attr[0]), attr[1]);
                if (attr && typeof attr === 'object')
                    return b.proj(
                        b.fn(attr.func, [b.col(attr.field)]),
                        attr.alias
                    );
                return b.proj(b.col(attr), attr);
            }) ?? b.star();
        let where = structuredClone(options?.where ?? {});
        if (options?.rls) {
            where.$and ??= [];
            where.$and.push(
                this._getRlsFilter(
                    typeof from == 'object' ? from.alias : from,
                    'read'
                )
            );
        }
        const group = options?.group
            ? b.group(options.group.map((i) => b.col(i)))
            : null;
        const having = options?.having
            ? normalizeWhere(options.having ?? {})
            : null;
        const order = options?.order
            ? options.order.map(([expr, dir]) => b.orderItem(b.col(expr), dir))
            : null;
        const lFrom =
            typeof from == 'object'
                ? b.subsrc(from.table, from.alias)
                : b.table(from);
        return b.select({
            from: b.from(lFrom),
            projections,
            where: normalizeWhere(where),
            having,
            groupBy: group,
            orderBy: order,
        });
    }

    /**
     * Подсчёт. Обёртка над ast в SELECT COUNT(*).
     *
     * @deprecated Самостоятельно делаем такое
     *
     * @param {{ table: string; alias: string } | string} table
     * @returns {Promise<number>}
     */
    async count(table, options = {}) {
        const ast = await this.#queryAst(table, options);
        const countAst = b.select({
            projections: [b.proj(b.fn('COUNT', [b.raw('*')]), 'count')],
            from: b.from(b.subsrc(ast, '__count_src__')),
        });
        const res = await this.query(countAst, options);
        let count = 0;
        if (Array.isArray(res[0]) && res[0].length > 0) {
            count = parseInt(res[0][0].count) || 0;
        } else {
            count = parseInt(res[0]?.count) || 0;
        }
        return count;
        // return parseInt(rows?.[0]?.count, 10) || 0;
    }

    /**
     * TODO: непонятно зачем это в коннекторе. Если уж делать, то отдельный Unit of work
     * @deprecated необходима реализация UoW
     * @protected
     * @param {*} table
     * @param {*} values
     * @param {*} options
     * @param {*} callback
     */
    async _queuedBulkInsert(table, values, options, callback) {
        const { queue } = options;
        if (queue) {
            if (!queue.connector) queue.connector = this.connector;
            if (!queue.options)
                queue.options = { transaction: options.transaction };

            const SQL = await callback(table, values, options);
            queue.add(SQL);

            if (queue.SQLs.length > (queue.maxlen ?? 100)) {
                const SQL = queue.get();
                await queue.connector.query(SQL, queue.options);
                queue.SQLs.length = 0;
            }
        } else {
            return callback(table, values, options);
        }
    }

    /**
     * @deprecated use `insert` or `bulkInsert`
     * @abstract
     * @param {*} table
     * @param {*} values
     * @param {*} options
     */
    async upsert(table, values, options) {
        throw new Error('upsert(): not implemented');
    }

    /**
     * @deprecated use `insert` or `bulkInsert`
     * @abstract
     * @param {*} table
     * @param {*} values
     * @param {*} options
     */
    async create(table, values, options = {}) {
        throw new Error('create(): not implemented');
    }

    /**
     * @deprecated use `insert` or `bulkInsert`
     * @abstract
     * @param {*} table
     * @param {*} values
     * @param {*} options
     */
    async bulkCreate(table, values, options) {
        throw new Error('bulkCreate(): not implemented');
    }
}

module.exports = AbstractConnector;
