const AbstractConnector = require('./AbstractConnector');
const {
    Sequelize,
    Op: SequelizeOp,
    QueryTypes,
    Utils: {
        Literal: SequelizeLiteral,
        SequelizeMethod,
    }
} = require('sequelize');


const { Trino, BasicAuth: Trino_BasicAuth } = require("trino-client");

class TrinoError extends Error {
    constructor(error, opts = {}) {
        if ("string" == typeof error) {
            error = { message: error };
        }
        super(error.message);
        //this.rawError = error;
        this.code = error.errorCode; // 131079
        this.name = error.errorName; // 'EXCEEDED_LOCAL_MEMORY_LIMIT'
        this.type = error.errorType; // 'INSUFFICIENT_RESOURCES'
        // failureInfo: {
        //     type: 'io.trino.ExceededMemoryLimitException',
        //     message: '...',
        //     suppressed: [],
        //     stack: [Array],
        //     errorInfo: [Object]
        // }
    }
};


class TrinoConnector extends AbstractConnector {

    name = 'Trino';

    constructor(settings) {
        super(settings);
        this.esc = (val) => this.AbstractSequelize.escape(val);
        this.escid = (id) => this.queryGenerator.quoteIdentifier(id);
    }

    /**
     * спецификация поля из метаданных -> sql-тип
     * @param {{ type: string, length: number }} spec
     */
    mksql_type(spec) {
        const typemap = {
            "string": "VARCHAR",
            "blob": "UUID",
        };
        const { type, length } = spec ?? {};
        const sql_typename = type ? (typemap[String(type).toLocaleLowerCase()] ?? type) : null;
        const sql_typefull = sql_typename ? `${sql_typename}${length ? `(${length})` : ``}` : null;
        return sql_typefull;
    }

    walk_ast(arg, reviewer, key = null) {
        if ((arg === null) || (typeof arg !== "object") || (Array.isArray(arg))) {
            // встретили null, undefined или примитив (не забываем, что null тоже object)
            return reviewer(key, arg);
        }
        // обрабатываем depth-first
        // коллекции создаём заново
        // иметь ввиду, что теряем конструкторы и прочее: здесь должны быть ТОЛЬКО массивы и простые объёкты
        const out = Array.isArray(arg) ? [] : {};
        // for (const k of Object.getOwnPropertySymbols(arg)) {
        //     const [k2, v2] = this.walk_ast(arg[k], reviewer, k)
        //     out[k2] = v2;
        // }
        for (const [k, v] of Object.entries(arg)) {
            const [k2, v2] = this.walk_ast(v, reviewer, k);
            out[k2] = v2;
        }
        return out;
    };

    valueToCastValue(val, newType) {
        const types = {
            "uuid": (val) => { return `CAST('${val}' as UUID)` },
            "string": (val) => { return `CAST('${val}' as VARCHAR(255))` }
        }
        const result = types[newType.type]?.(val) ?? val;
        return result;
    }

    reviewer(k, v, columnDefinitions) {
        const sql_typefull = this.mksql_type(columnDefinitions[k]);

        let vv = [];
        if (sql_typefull === null && Array.isArray(v)) {
            vv = this.walk_ast(v, columnDefinitions);
            // console.log(vv);
        } else {
            vv = v;
        }
        const result = sql_typefull !== null
            ? [k, vv === null ? null : { $eq: { $literal: this.valueToCastValue(vv, columnDefinitions[k]) } }]
            : [k, vv];
        return result;
    }

    /**
     * добавление CAST для значений, когда есть информация о типе
     * @param {*} arg
     * @param {*} columnDefinitions
     */
    rebuild_casts(arg, columnDefinitions) {
        return this.walk_ast(arg, (k, v) => this.reviewer(k, v, columnDefinitions));
    }

    async connect(settings) {
        if (!this.connector) {
            const options = {
                // server?: 'http://localhost:8080',
                // source?: string,
                // catalog?: 'something',
                // schema?: 'foobar',
                // auth?: new Trino_BasicAuth('user'),
                // session?: Session,
                // extraCredential?: ExtraCredential,
                // ssl?: SecureContextOptions,
                // extraHeaders?: RequestHeaders,
            };

            //TODO ssl?
            const ssl = null;
            // settings.(ca|cert|key)

            const settings_host = String(settings.host ?? "");
            options.server = ((null == ssl) ? "http://" : "https://") // is it correct for https:// to be on ssl?
                + (settings_host.length ? settings_host : "localhost")
                + (settings.port ? `:${settings.port}` : ":8080") // does ssl port differ from 8080?
                ;

            const settings_database = String(settings.database ?? "");
            if (settings_database.length) {
                options.catalog = settings_database;
            }

            const settings_schema = String(settings.schema ?? "");
            if (settings_schema.length) {
                options.schema = settings_schema;
            }

            const settings_user = String(settings.user ?? "");
            if (settings_user.length) {
                const settings_password = String(settings.password ?? "");
                options.auth = settings_password.length
                    ? new Trino_BasicAuth(settings_user)
                    : new Trino_BasicAuth(settings_user, settings_password)
                    ;
            }

            this.connector = Trino.create(options);
        }
    }

    async findAll(table, options) {
        await this.connect(this.Model);

        if (!options) options = {};
        // const where_patched = options.where;
        const where_patched = (options.where && options.name2spec) ? this.rebuild_casts(options.where, options.name2spec) : options.where;

        const SQL = await this.findSQL(table, { ...options, where: where_patched });

        let [rows] = await this.query(SQL, { ...(options || {}) });

        if (options.withChildren) {
            const newResult = [];
            const { pkName, parentName, where, guideAttrs } = options.withChildren;
            // for (const row of rows) {
            for (let i = 0, il = rows.length; i < il; ++i) {
                const { children, parents } = await this.findAllChildren(table, { pkName, parentName, where, guideAttrs }, rows[i][pkName], options);
                Object.assign(rows[i], { children, parents });
            }
        }

        return rows;
    }

    async findAllChildren(table, fields, parent, options) {
        const [rows] = await super.findAllChildren(table, fields, parent, options);

        let children = new Set();
        let parents = new Set();
        for (const row of rows) {
            children.add(row.__child__);
            parents.add(row.__parent__);
        }

        return { children: [...children], parents: [...parents] };
    }


    async count(table, options) {
        // unexpectedly complex (and possibly wrong) processing for count(*) queries (Rls, subquery wrapping, etc, see super.count)
        // without options.attributes and hack for outer count(*) it doesn't work due to subquery wrapping

        if (!options) options = {};
        const where_patched = (options.where && options.name2spec) ? this.rebuild_casts(options.where, options.name2spec) : null;

        const [rows] = await super.count(table, { ...options, attributes: [["1", "dummy"]], where: where_patched });
        const count = rows[0]?.count;
        return parseInt(count, 10);
    }

    async update(table, values, options) {
        //WARN untested in real environment
        let result = false;

        await this.connect(this.Model);
        const columnDefinitions = options?.name2spec ?? {};


        if (this.Model.trino_dialect === "memory") {
            //Так как memory не поддерживает update, делаем через Чтение/Удаление/Вставку
            //Прочитаем все записи
            const tmpResult = await this.findAll(table, { ...options, attributes: Object.keys(columnDefinitions) });
            if (Array.isArray(tmpResult)) {
                //Удалим старые записи
                await this.delete(table, options);

                tmpResult.forEach(row => {
                    for (const name in values) row[name] = values[name];
                })

                //Создадим новые записи
                const res = await this.bulkCreate(table, tmpResult, options);
                result = res.result;
            }
        } else {
            const where_patched = (options.where && options.name2spec) ? this.rebuild_casts(options.where, columnDefinitions) : options.where;
            let where = this.transformOperations(where_patched);

            const vals = {};
            for (const name in values) {
                const sql_typefull = this.mksql_type(columnDefinitions[name]);
                const val = sql_typefull ? Sequelize.literal(this.valueToCastValue(values[name], columnDefinitions[name])) : values[name];
                vals[name] = val;
            }

            //В целом, всё что ниже это костыли для обязательных полейб почему при create не отрабатывает правильно default - вопрос...
            if (!vals["updatedat"]) {
                const currentDate = new Date();
                vals["updatedat"] = Sequelize.literal(`CAST('${currentDate.toISOString().split('T').join(' ')}' as TIMESTAMP)`)
            }

            if (options?.rls && where) {
                ({ where } = this.addRlsOptions({ type: 'write', where, options }));
            }

            const SQL = await this.queryGenerator.updateQuery(
                { tableName: table },
                vals,
                where,
                {
                    bindParam: false
                }
            );

            //const [rows, result_metadata] = await this.query(SQL, { ...(options || {}) });
            const [rows] = await this.query(SQL.query, { ...(options || {}) });
            result = rows[0]?.rows > 0;
        }

        return result;
    }

    async create(table, values, options) {
        return this.bulkCreate(table, [values], options);
    }


    async bulkCreate(table, values, options) {
        //К сожалению весь этот код ниже не работает по результату...

        // const typemap = {
        //     "string": "VARCHAR",
        //     "blob": "UUID",
        // };

        // const query_options = { ...(options ?? {}), type: QueryTypes.INSERT };
        // delete query_options.name2spec;
        // const name2spec = options?.name2spec ?? {};

        // if (!values.length) throw new Error("Empty rowlist for bulkCreate"); // should it be a success instead?

        // await this.connect(this.Model);

        // // придётся пройтись по values дважды, чтобы собрать все встречающиеся имена колонок (вместо того, чтобы взять его из первой строки);
        // // плюс в разных строках может быть разный порядок колонок в объекте
        // // это поведение sequelize, на которое кто-то может рассчитывать; там это реализовано МАКСИМАЛЬНО ущербно, см.:
        // // https://github.com/sequelize/sequelize/blob/4b8b5b94a09220f7aae1e96d6d19ff65695fc100/src/dialects/abstract/query-generator.js#L331
        // // т.е. if (!allAttributes.includes(key)) ... ARRAY! ... INCLUDES! ... !!!!!!!

        // const cols = new Set(); // все найденные колонки (список имён)

        // for (const row of values) {
        //     for (const name of Object.keys(row)) {
        //         cols.add(name);
        //     }
        // }

        // const sql_insert_targets = []; // список полей целевой таблицы
        // const sql_select_transit = []; // список преобразований
        // const sql_values_sources = []; // список алиасов колонок из values
        // let sql_values = "";

        // const { esc, escid } = this;

        // for (const name of cols) {
        //     let { type, length } = name2spec[name] ?? {};
        //     if (type) type = typemap[String(type).toLocaleLowerCase()] ?? type;
        //     const sql_name = escid(name);
        //     const sql_type = type ? `${type}${length ? `(${length})` : ``}` : null;
        //     sql_insert_targets.push(sql_name);
        //     sql_select_transit.push(sql_type ? `CAST(${sql_name} as ${sql_type}) as ${sql_name}` : sql_name);
        //     sql_values_sources.push(sql_name);
        // }

        // const _hop = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

        // let i = 0;
        // for (const row of values) {
        //     const sql_row = [];
        //     for (const name of cols) {
        //         if (_hop(row, name)) {
        //             sql_row.push(esc(row[name]));
        //             continue;
        //         }
        //         const val_default = name2spec[name]?.default;
        //         // if (undefined === val_default) sql_row.push("DEFAULT"); // unsupported, left here for reference
        //         if (null == val_default) sql_row.push("NULL"); // null or undefined
        //         else sql_row.push(esc(val_default)); // should be escaped or not?
        //     }
        //     if (i++) sql_values += ",";
        //     sql_values += "(" + sql_row.join(",") + ")";
        // }

        // const sql_table = `${this.Model.schema ? `${escid(this.Model.schema)}.` : ""}${escid(table)}`;

        // const sql = `
        //     INSERT INTO ${sql_table} (${sql_insert_targets.join(",")})
        //     SELECT ${sql_select_transit.join(",")}
        //     FROM (VALUES ${sql_values}) as "values"(${sql_values_sources.join(",")});

        // `;

        // const [rows] = await this.query(sql, query_options);
        // return { result: rows[0]?.rows === 1 }; // why === 1?



        //Пришлось писать свой...
        const name2spec = options?.name2spec ?? {};
        await this.connect(this.Model);

        const vals = values.map(row => {
            const newRow = {};
            for (const name in row) {
                const sql_typefull = this.mksql_type(name2spec[name]);
                const val = sql_typefull ? Sequelize.literal(this.valueToCastValue(row[name], name2spec[name])) : row[name];
                newRow[name] = val;
            }

            //В целом, всё что ниже это костыли для обязательных полейб почему при create не отрабатывает правильно default - вопрос...
            if (!newRow["code"]) {
                newRow["code"] = 0; //Это костыль по хорошему нужно подумать как это обходить
            }

            if (!newRow["createdat"] && !newRow["createdAt"]) {
                const currentDate = new Date();
                newRow["createdAt"] = Sequelize.literal(`CAST('${currentDate.toISOString().split('T').join(' ')}' as TIMESTAMP)`)
            } else {
                const currentDate = newRow["createdat"] || newRow["createdAt"];
                delete newRow["createdat"];
                delete newRow["createdAt"];
                newRow["createdAt"] = Sequelize.literal(`CAST('${currentDate.val}' as TIMESTAMP)`)
            }
            if (!newRow["updatedat"] && !newRow["updatedAt"]) {
                const currentDate = new Date();
                newRow["updatedAt"] = Sequelize.literal(`CAST('${currentDate.toISOString().split('T').join(' ')}' as TIMESTAMP)`)
            } else {
                const currentDate = newRow["updatedat"] || newRow["updatedAt"];
                delete newRow["updatedat"];
                delete newRow["updatedAt"];
                newRow["updatedAt"] = Sequelize.literal(`CAST('${currentDate.val}' as TIMESTAMP)`)
            }
            return newRow;
        })

        const sql = await this.queryGenerator.bulkInsertQuery({ schema: this.Model.schema, tableName: table }, vals);
        const res = await this.query(sql, { ...options, type: QueryTypes.INSERT });

        return { result: res[0][0].rows > 0 };
    }

    async delete(table, options, serviceOptions) {
        //WARN untested in real environment
        let result = { result: false };

        await this.connect(this.Model);
        const columnDefinitions = options?.name2spec ?? {};

        if (this.Model.trino_dialect === "memory") {

            const attributes = Object.keys(columnDefinitions);
            const where_patched = (options.where && options.name2spec) ? this.rebuild_casts(options.where, columnDefinitions) : options.where;
            const SQL = await this.findSQL(table, { ...options, attributes, where: { $not: where_patched } });

            //Memory не поддерживает удаление, только Trancate и DROP TABLE
            const createSQL = `CREATE TABLE ${table}__temp (${attributes.join(', ')}) AS ${SQL}`;
            await this.query(createSQL);

            const dropSQL = `DROP TABLE ${table}`;
            await this.query(dropSQL);

            const alterSQL = `ALTER TABLE ${table}__temp RENAME TO ${table}`;
            await this.query(alterSQL);
            // console.log(res);
            result = { result: true };

        } else {
            const where_patched = (options.where && options.name2spec) ? this.rebuild_casts(options.where, options.name2spec) : options.where;
            let where = this.transformOperations(where_patched);

            if (options?.rls && where) {
                ({ where } = this.addRlsOptions({ type: 'delete', where, options }));
            }

            const sql = await this.queryGenerator.deleteQuery({ schema: this.Model.schema, tableName: table }, where);
            const [rows] = await this.query(sql, { ...serviceOptions, type: QueryTypes.BULKDELETE });

            result = { result: rows[0]?.rows >= 0 }; // none matched is "0", is it success?
        }


        return result;
    }

    async synch(table, options) {
        //WARN untested in real environment

        await this.connect(this.Model);

        options = {
            ...(options ?? {}),
            typeMapping: {
                // retain options.typeMapping if any?
                DATETIME: 'DATETIME',
                BLOB: 'UUID',
                STRING: 'VARCHAR',
            },
            resultAsArray: true,
            noSupportSerial: true, // `colname SERIAL` is in fact alias for `colname integer NOT NULL DEFAULT nextval('tablename_colname_seq')`, but proxying is not available
            noSupportDefault: true, // not supported (in currently used trino version? or only for `memory` db?)
            noSupportUnique: true, // not supported
            // noSupportNotNull: true, // limited support
            noSupportPK: true, // not supported
        };

        const Fields = {}
        Object.keys(options.Fields).forEach(fieldName => {
            Fields[fieldName.toLowerCase()] = options.Fields[fieldName];
        });

        const sqls = await super.synch(table, { ...options, Fields, resultAsArray: true });
        // let r = []; // throws on error, result is never used and may be discarded
        for (const sql of sqls) {
            await this.query(sql, { ...(options || {}) })
            // r.push(await this.query(sql, { ...(options || {}) }));
        }
        return true;
    }

    async drop(table) {
        //WARN untested in real environment

        await this.connect(this.Model);

        const sql = await super.drop(table);
        return sql
            ? await this.query(sql/* , { ...(options || {}) } */) //NOTE: no `options` arg in superclass func declaration
            : null
            ;
    }

    // async isTableExist(table) {
    //     return super.isTableExist(table);
    // }

    /**
     * @protected
     *
     * @param {*} SQL
     * @param {*} inputOptions
     * @returns 
     */
    async setQueryTags(SQL, inputOptions) {
        return SQL;
    }

    /**
     * @protected
     *
     * @param {string | { query: string, bind: any[] }} SQL
     * @param {*} options 
     */
    async query(SQL, options = {}) {

        //WARN клиент трино НЕ ПОДДЕРЖИВАЕТ множественные sql-запросы!
        //WARN и обходные пути (пока?) не реализованы!

        //TODO handle non-SELECT commands differently?

        let sql = (options.type === QueryTypes.SELECT)
            ? await this.setQueryTags(SQL, options)
            : SQL;

        // console.log(sql);
        sql = sql.replace(/;\s*$/g, ""); // exclude trailing semicolon, if any
        // quick-dirty offset-limit query patching for trino, which does not understand non-standard keyword order
        // (should be patched elsewhere in query construction rounines, NOT HERE)
        sql = sql.replace(/LIMIT (\d+) OFFSET (\d+)/g, "OFFSET $2 LIMIT $1");
        // console.log(sql);

        // should construct (something like) generic/legacy result from trino result iterator
        //TODO seems like return value depends on QueryTypes.SELECT presence in options.type -- should support?
        //TODO? handle rowAsArray?
        //TODO? handle options.raw?
        //TODO? handle options.plain?
        //TODO? handle options.transaction?
        //TODO? after all, maybe its better to extend sequelize dialects with trino?

        const result_rows = [];
        let found_columns = null;

        const iter = await this.connector.query(sql); // returns promise of async iterator

        // theres no proper info being found on how to properly walk across this
        for await (const result of iter) {
            /*
            type QueryResult = {
                columns?: Columns;
                data?: QueryData[];
                error?: QueryError;
                id: string;
                infoUri?: string;
                nextUri?: string;
                stats?: QueryStats;
                warnings?: string[];
                //undocumented:
                updateType: "INSERT" | "UPDATE"
            }
            */
            // console.log(Object.assign(structuredClone(result), { stats: "...", data: "..." }));
            // console.log(result);
            if (result.error) {
                const error = new TrinoError(result.error.message, { error: result.error });
                console.error({ sql, error });
                throw error;
            }
            if (result.columns) {
                // how to handle multiple occurs?
                // are they always same?
                // are they defined only if there is result.data?
                found_columns = result.columns;
            }
            if (result.data) {
                result_rows.push(...result.data);
            }
        }

        const result_fields = [];
        const fields_j2name = [];
        for (const column of found_columns ?? []) {
            // column: {
            //     name: '_col0',
            //     type: 'integer', // not documented properly
            //     typeSignature: { rawType: 'integer', arguments: [] } // not documented at all
            // }
            result_fields.push({ // class Field
                name: column.name,
                // tableID: null, // 0 | not implemented
                // columnID: null, // 0 | not implemented
                // dataTypeID: null, // 23 | not implemented
                // dataTypeSize: null, // 4 | not implemented
                // dataTypeModifier: null, // -1 | not implemented
                // format: null // 'text' | not implemented
            });
            fields_j2name.push([fields_j2name.length, column.name]);
        }

        // should transform result_rows to contain objects with column names instead of arrays
        for (let i = 0, il = result_rows.length; i < il; ++i) {
            const row_arr = result_rows[i];
            const row_obj = {};
            for (const [j, name] of fields_j2name) row_obj[name] = row_arr[j];
            result_rows[i] = row_obj;
        }

        const result_metadata = { // class Result
            command: null, // 'SELECT' // should support?
            rowCount: result_rows.length, // null | int
            // oid: null, // not implemented
            rows: result_rows,
            fields: result_fields,
            // _parsers: [ [Function: parser], [Function: parser] ], // not implemented
            // _types: TypeOverrides { // not implemented
            //     _types: { getTypeParser: [Function: bound getTypeParser] },
            //     text: {},
            //     binary: {}
            // },
            // RowCtor: null, // not implemented
            rowAsArray: false, // should implement?
            // _prebuiltEmptyResultObject: { '?column?': null } // should implement?
        };

        return [result_rows, result_metadata];
    }
};

module.exports = TrinoConnector;
