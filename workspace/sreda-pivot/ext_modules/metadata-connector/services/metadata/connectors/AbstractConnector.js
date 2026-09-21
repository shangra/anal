const crypto = require('crypto');

const { Sequelize, Op, col, QueryTypes } = require('sequelize');
const { RLSManager: RLSManagerClass } = require('../../../../../core/db/rls/RLSManager');

const { default: knex } = require('knex');
const sequelize = new Sequelize('database', 'username', 'password', { dialect: 'postgres', });

const { isEmptyObject, hop, uniqueValues, mergeDeep } = require('../../../../utils/services');

const Credentials = require('../credentials/Credentials');
const AttributeClass = require('./utils/attributes/Attribute.class');
const Extensions = require('../../../../../core/class/Extensions.class');
const GlobalService = require('../../../../../core/services/Global.service');
const QueryBuilderClass = require('../qb');

/**
 * @typedef {import('../../../../../core/db/types').TField} TField
 * @typedef {import('../../../../../core/db/types').TAggField} TAggField
 * 
 * @typedef {knex.Knex<any, unknown[]>} GQBI
 * @typedef {knex.Knex.QueryBuilder<any, unknown[]>} GQBQBI
 * @typedef {knex.Knex.Raw<any>} GQBIstring
 * 
 * @typedef {import('sequelize/types/utils').Literal} Literal
 */

/**
 * @typedef {import('../types').IWithOption} IWithOption
 */

const constants = require('../../../constants');

/**
 * @typedef {import('../types').SynchI} SynchI
 * @typedef {import('../types').CastTypeI} CastTypeI
 * @typedef {import('../types').IFindAllChildren} IFindAllChildren
 * 
 * @typedef {import('../types').IFieldRecursive} IFieldRecursive
 * 
 * @typedef {import('../Connector.class').Ifrom} Ifrom
 */

//TODO: переработать используя knex

/**
 * @typedef {object} ILevel
 * @property {object} [options = {}]
 * @property {IWithOption[]} [withOptions=[]]
 */

class AbstractConnector extends Extensions {
    /**
     * Метод генерации ключей таблицы.
     * @param {object} keys Список ключей таблицы.
     * @private
     * @static
     * @returns {{ primaryKeys: string[]; uniqueKeys: {customIndex: boolean; fields: string[]}[], indexes: {customIndex: boolean; fields: string[]}[] }} Объект с списком ключей таблицы.
     */
    static generateKeys(keys = {}) {
        const primaryKeys = [];
        const uniqueKeys = [];
        const indexes = [];

        for (let key in keys) {
            const fields = Object.keys(keys[key].fields);

            if (!fields.length) {
                continue;
            }

            if (keys[key].settings?.primarykey) {
                primaryKeys.push(...fields);
                continue;
            }

            if (keys[key].settings?.unique) {
                uniqueKeys.push({
                    customIndex: true,
                    fields,
                });
            } else {
                indexes.push({
                    customIndex: true,
                    fields,
                });
            }
        }

        return { primaryKeys, uniqueKeys, indexes };
    }

    /**
     * @public
     * 
     * @param {*} settings 
     * @returns 
     */
    static getHash(settings) {
        return GlobalService.md5(JSON.stringify(settings));
    }

    connector = null;
    _queries = {};

    constructor(settings) {
        super();
        // если конектор совпадает по всем параметрам кроме схемы то он должен иметь возможность ходить в смежные схемы
        this.dbhash = AbstractConnector.getHash(
            JSON.stringify(
                settings.connection_string
                    ? { url: settings.connection_string }
                    : {
                        host: settings.host,
                        port: settings.port,
                        database: settings.database,
                        // schema: settings.schema,
                        // user: settings.user,
                        // password: settings.password,
                    }
            )
        );

        this.Model = settings;
        this.AbstractSequelize = sequelize;

        //@ts-expect-error
        this.queryGenerator = this.AbstractSequelize.dialect.queryGenerator;
    }

    isNullAvaliable = true;

    /**
     * @public
     * 
     * @param {string} field 
     * @param {CastTypeI} [type='TEXT']
     * @returns {string}
     */
    createArray = (field, type = 'TEXT') => `ARRAY[${field}]`;

    /**
     * @public
     * 
     * @param {string} arrayFeild 
     * @param {string} field 
     * @param {CastTypeI} [type]
     * @returns {string}
     */
    appendArray = (arrayFeild, field, type = 'TEXT') => `ARRAY_APPEND(${arrayFeild}, ${field})`;

    /**
     * @public
     * 
     * @param {string} arrayField 
     * @param {number} start 
     * @param {number} end 
     * @returns {string}
     */
    arraySlice = (arrayField, start, end) => `"${arrayField}"[${start}:${end}]`;

    /**
     * @public
     * 
     * @param {GQBI} gqb
     * @param {string} field
     * @param {string} value
     */
    findInArray = (gqb, field, value) => {
        const val = typeof value === 'number' ? value : `'${value}'`;
        return gqb.raw(`${val} = ANY(${field})`);
    }

    /**
     * @public
     * 
     * @param {string} arrayField 
     * @returns {string}
     */
    getFieldLength = (arrayField) => { throw new Error('Not implemented'); }

    /**
     * @public
     * 
     * @param {string} arrayField 
     * @returns {string}
     */
    getLastElemntOfArray = (arrayField) => { throw new Error('Not implemented'); }

    /**
     * @public
     * @param {string} arrayField 
     * @param {string} [type] 
     * @returns {string}
     */
    getLastNonEmptyElemntOfArray = (arrayField, type) => { throw new Error('Not implemented'); }

    /**
     * @public
     * @param {string} arrayField 
     * @param {string} [type] 
     * @returns {string}
     */
    filterArray = (arrayField, type) => { throw new Error('Not implemented'); }

    /**
     * @public
     *
     * @param {string} arrayField
     * @param {number} index
     * @returns {string}
     */
    getElementOfArray = (arrayField, index) => { throw new Error('Not implemented'); }

    /**
     * @param {string} type 
     * @returns {any}
     */
    getDefaultValue = (type) => { throw new Error('Not implemented'); }

    /**
     * @public
     * 
     * @param {string} query
     * @param {string} prefix
     * @param {boolean} [ifExist]
     * 
     * @returns {{ with?: { sql: string, name: string }, volatile?: { sql: string, name: string } }}
     */
    cte(query, prefix, ifExist) {
        const withCte = this.with(query, prefix);
        const volatile = this.volatile(query, prefix);

        return { with: withCte, volatile: volatile };
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
        return null;
    }

    /**
     * @public
     * 
     * @param {string} query 
     * @param {string} prefix 
     * @returns 
     */
    with(query, prefix = '') {
        const lq = query.replaceAll(';', '');

        const id = `${prefix}${GlobalService.md5(lq)}`;

        return { sql: `${id} AS (${lq})`, name: id };
    }

    /**
     * @param {{ withOption: IWithOption, alias: string }} param0 
     */
    parseWith({ withOption, alias }) {
        let { name, query, connectionFields, mapping, type } = withOption;

        const fields = (connectionFields || []).filter(
            (item) => item?.left?.field && item?.right?.field
        );
        const cteSql = String(query || '').replace(/;$/, '').trim();

        if (!['inner', 'left', 'right', 'cross'].includes(type)) type = 'inner';
        if (!cteSql || !fields.length) {
            type = 'no';
        }

        const id = GlobalService.md5(cteSql || name || 'empty');

        const prefix = 'with_';

        const rightSideName = name || `${prefix}${id}`;

        const join = fields.length
            ? `${type} JOIN ${rightSideName} ON `
                + fields
                    .map(({ left, right }) => `"${alias}".${this.cast(`"${left.field}"`, left.type)} = "${rightSideName}".${this.cast(`"${right.field}"`, right.type)}`)
                    .join(' AND ')
            : '';

        const cte = cteSql ? `${rightSideName} as (${cteSql})` : '';

        const volatile = cteSql ? this.volatile(cteSql, prefix)?.sql : undefined;

        const attributes = (mapping || []).map(({ left, right }) => [`"${rightSideName}"."${left.field}"`, `"${right.field}"`]);

        return {
            id,
            cte,
            join,
            type,
            volatile,
            attributes,
        }
    }

    /**
     * @protected
     * @param {string} attr 
     * @returns {string}
     */
    ecran(attr) {
        return attr[0] === '$' && attr.slice(-1) === '$' ? attr.replaceAll('$', '') : `"${attr}"`;
    }

    /**
     * @public
     * 
     * @param {{  withOptions?: { sql: string, name: string }[], volatileOptions?: { sql: string, name: string }[], sqls: Ifrom[] }} param0 
     */
    union({ withOptions, volatileOptions, sqls }) {
        let withCte = '';

        if (withOptions?.length) {
            const withSqls = uniqueValues(withOptions.map(({ sql }) => sql)).join(', ');
            withCte = `with ${withSqls}`.replaceAll(';', '');
        }

        let volatileCte = '';
        if (volatileOptions?.length) {
            volatileCte = uniqueValues(volatileOptions.map(({ sql }) => sql)).join('\n');
        }

        const lsql = sqls.map((item) => item?.table).filter(i => i);

        const sql = `${withCte} ${volatileCte} ${lsql.join(' union all ').replaceAll(';', '')};`;

        return sql;
    }

    /**
     * @public
     * 
     * @param {Ifrom} from
     * @param {object[]} levels
     * 
     * @returns {Promise<{ sql: Ifrom, withs: Record<string, string>, volatile: Record<string, string> }>}
     */
    async generateCte(from, levels) {
        /** @type {Record<string, string>} */
        const withs = {};

        /** @type {Record<string, string>} */
        const volatile = {};

        let sql = structuredClone(from);

        for (const level of levels) {
            let { attributes } = level;

            sql.table = await this.findSQL(sql, level);

            if (level.withOptions?.length) {
                const { table, withCte, volatile: lVolatile, joinCte } = await this.parseWithOptions(level.withOptions, attributes, sql);

                mergeDeep(withs, withCte);
                mergeDeep(volatile, lVolatile);

                sql.table = joinCte ? `${table} ${joinCte}` : table;
            }
        }

        return { sql, withs, volatile };
    }

    /**
     * @public
     *
     * @param {Ifrom} from
     * @param {ILevel} param0
     */
    async generateFrom(from, { options = {}, withOptions = [] }) {
        let { attributes } = options;

        if (options) {
            const sql = await this.findSQL(from, { ...options });

            from = {
                table: sql,
                //@ts-ignore
                alias: from.alias || from,
            };
        }

        if (!withOptions.length) {
            return from;
        }

        /** @type {string} */
        //@ts-ignore
        const alias = from.alias || from;

        const localAttributes = attributes.map((i) =>
            Array.isArray(i) ? i[1] : i
        );

        const withAttributes = [...localAttributes];
        const withQueries = [];
        const withJoins = [];

        for (let index = 0; index < withOptions.length; index++) {
            const { id, attributes, cte, join, type } = this.parseWith({ withOption: withOptions[index], alias, });

            withQueries.push(cte);

            if (type !== 'no' && join) {
                withJoins.push(join);
                withAttributes.push(...attributes);
            }
        }

        const uniqueValues = (arr) => {
            const res = {};

            arr.forEach((item) => {
                Array.isArray(item)
                    ? (res[item[1].replace(/"/g, '')] = item)
                    : (res[item] = item);
            });

            return Object.values(res);
        };

        /** @type {string} */
        //@ts-ignore
        let sql = from.table || from;

        sql = await this.findSQL(
            { table: sql, alias },
            { attributes: uniqueValues(withAttributes) }
        );

        const withCte = withQueries.length ? `with ${withQueries.join(', ')}` : '';

        sql = `${withCte} ${sql.slice(0, -1)} ${withJoins.join('\n')};`;

        from = { table: sql, alias };

        return from;
    }

    /**
     * 
     * @param {IWithOption[]} withOptions 
     * @param {TField[]} attributes 
     * @param {Ifrom} from
     * 
     * @returns 
     */
    async parseWithOptions(withOptions, attributes, from) {
        /** @type {string} */
        //@ts-ignore
        const alias = from.alias || from;

        const localAttributes = /** @type {TAggField[]} */(attributes)
            .map((i) => Array.isArray(i) ? i[1] : i)
            .map((item) => [`"${alias}"."${item?.field || item}"`, `"${item?.field || item}"`]);

        const withAttributes = [...localAttributes];
        /** @type {Record<string, string>} */
        const withQueries = {};
        /** @type {Record<string, string>} */
        const volatile = {};
        /** @type {string[]} */
        const withJoins = [];

        for (let index = 0; index < withOptions.length; index++) {
            const { id, attributes, cte, volatile: lVolatile, join, type } = this.parseWith({ withOption: withOptions[index], alias });

            if (cte) {
                withQueries[id] = cte;
            }

            if (lVolatile) {
                volatile[id] = lVolatile;
            }

            if (type !== 'no' && join) {
                withJoins.push(join);
                withAttributes.push(...attributes);
            }
        }

        const uniqueValues = (arr) => {
            const res = {};

            arr.forEach((item) => {
                Array.isArray(item)
                    ? (res[item[1].replace(/"/g, '')] = item)
                    : (res[item] = item);
            });

            return Object.values(res);
        };

        /** @type {string} */
        //@ts-ignore
        let sql = from.table || from;

        sql = await this.findSQL(
            { table: sql, alias },
            { attributes: uniqueValues(withAttributes) }
        );

        const joinCte = withJoins.length ? `${uniqueValues(withJoins).join('\n')}` : '';

        return { table: sql.slice(0, -1), withCte: withQueries, volatile, joinCte };
    }

    /**
     * @public
     * 
     * @param {string} field 
     * @param {string} [type='TEXT'] 
     * @returns {string}
     */
    cast(field, type = 'TEXT') {
        type = (type || 'TEXT')?.toUpperCase();
        /** @type {string} */
        let lType = 'TEXT';

        if (constants.DATE_TYPES.includes(type)) {
            lType = 'DATE';
        }

        if (constants.REF_TYPES.includes(type)) {
            lType = 'UUID';
        }

        if (['INTEGER'].includes(type)) {
            lType = 'INT8';
        }

        if (['FLOAT'].includes(type)) {
            lType = 'FLOAT8';
        }

        if (['BOOLEAN'].includes(type)) {
            lType = 'BOOL';
        }

        return `${field}::${lType}`;
    }

    async connect(...args) {
        throw new Error('Not implemented');
    }

    /**
     * @param {{ ca: string, cert: string, key: string }} param0
     * @returns {Promise<{ ca: string, cert: string, key: string }>}
     */
    async getSslCredentials({ ca, cert, key }) {
        const credReader = new Credentials();

        const [caData, certData, keyData] = await Promise.all([
            credReader.readFile(ca),
            credReader.readFile(cert),
            credReader.readFile(key),
        ]);

        return { ca: caData, cert: certData, key: keyData };
    }

    /**
     * @private
     * 
     * метод конвертируем объект фильтрации запроса и приводит его к формату который сможет переварить orm
     * 
     * @param {*} where 
     * @returns 
     */
    // TODO нужно переписать этот метод
    transformOperations(where) {
        let newWhere = {};

        for (const conditionName in where) {
            /** @type {Literal | string | { sql: string }} */
            let newConditionName = conditionName;
            if (conditionName.slice(0, 1) === '$') {
                const operationName = conditionName.slice(1);
                if (operationName.slice(0, 3) !== 'sql') {
                    newConditionName = Op[operationName];
                    if (!newConditionName) {
                        //NOTE это не "$sql..." и не один из операторов sequelize
                        const lit = operationName.slice(0, -1);
                        //NOTE ^^^ зачем отрезается последний символ? так и должно быть?
                        //ANSW ^^^ должна отрезаться ";", которую добавляет sequelize в построенный запрос -- не подтверждено
                        newConditionName = sequelize.literal(lit); //`$${operationName}`;
                    }
                } else {
                    const lit = operationName.slice(4).slice(0, -1);
                    //NOTE ^^^ зачем отрезается последний символ? так и должно быть?
                    //NOTE ^^^ почему не .slice(4, -1)?
                    //ANSW ^^^ должна отрезаться ";", которую добавляет sequelize в построенный запрос
                    //^^^^^^^^ (итого) НО ЭТО НЕ ТАК, это про отрезание правой скобки из "$sql(...)"
                    //NOTE ^^^ .slice(4, ...) отрезает первые 4 символа: видимо, имеется ввиду отрезать '$sql',
                    //NOTE ^^^ но '$sql***' -- это conditionName, в operationName уже отрезан первый символ (т.е. там 'sql***') -- мб это ошибка?
                    //^^^^^^^^ (итого) А ЭТО ПРО ОТРЕЗАНИЕ ЛЕВОЙ СКОБКИ
                    newConditionName = { sql: lit };
                    //NOTE ^^^ зачем здесь так ({ sql: lit }), если ниже всё равно sequelize.literal(newConditionName.sql)?
                }
            }

            let newConditionValue = where[conditionName];
            const constructorName = newConditionName?.constructor?.name ?? '';

            if (newConditionValue?.[0] == '$' && newConditionValue?.slice(-1) == '$') {
                newConditionValue = col(newConditionValue.replaceAll('$', ''));
            }

            if (where[conditionName] && typeof where[conditionName] === 'object') {
                if (Array.isArray(where[conditionName])) {
                    newConditionValue = where[conditionName].map(
                        // eslint-disable-next-line no-return-await
                        (conditionValue) => {
                            let tempResValue = conditionValue;
                            if (typeof conditionValue === 'object') {
                                tempResValue = this.transformOperations(conditionValue);
                            }
                            return tempResValue;
                        }
                    );
                } else {
                    newConditionValue = this.transformOperations(where[conditionName]);
                }
            }

            if (
                typeof newConditionName === 'object' &&
                constructorName !== 'Literal'
            ) {
                let comparator = Op.eq;
                if (Array.isArray(newConditionValue)) {
                    comparator = Op.in;
                }
                newWhere = {
                    [Op.and]: [
                        //@ts-ignore
                        sequelize.where(sequelize.literal(newConditionName.sql), {
                            [comparator]: newConditionValue,
                        }),
                        { ...newWhere },
                    ],
                };
            } else if (constructorName === 'Literal') {
                newWhere = {
                    [Op.and]: [
                        sequelize.where(newConditionName, newConditionValue),
                        { ...newWhere },
                    ],
                };
            } else {
                newWhere[newConditionName] = newConditionValue;
            }
        }
        return newWhere;
    }

    /**
     * @private
     * 
     * конвертируем переданные аттрибуты в формат который сможет переварить наша орм
     * 
     * @param {TField[]} optionsAttributes 
     * @returns {Promise<{ attributes: TField[], sqlalias: object }>}
     */
    async transformAttributes(optionsAttributes) {
        const fieldPattern =
            /(?<func>[a-z]+)\s*\(\s*(?<operations>.+)\s*\)\s*(AS\s*(?<vision>[_a-z0-9]+))?/gimu;
        const attributes = [];
        const sqlalias = {};

        optionsAttributes.forEach((attribute) => {
            if (Array.isArray(attribute)) {
                return attributes.push([sequelize.literal(attribute[0]), attribute[1]]);
            }

            if (typeof attribute === 'object') {
                const attr = new AttributeClass();

                return attributes.push(sequelize.literal(attr.toSQLfunc(attribute)));
            }

            const math = fieldPattern.exec(attribute);
            fieldPattern.lastIndex = 0;
            if (math) {
                const vision =
                    math.groups.vision ?? `${math.groups.operations}_${math.groups.func}`;
                if (math.groups.func.toLowerCase() === 'literal') {
                    attributes.push([
                        sequelize.literal(math.groups.operations),
                        `${vision}`,
                    ]);
                } else {
                    attributes.push([
                        sequelize.fn(
                            math.groups.func.toUpperCase(),
                            sequelize.literal(math.groups.operations)
                        ),
                        `${vision}`,
                    ]);
                }
                sqlalias[attribute] = {
                    vision,
                    innerSQLField: `${math.groups.func.toUpperCase()}("${vision}")`,
                };
            } else {
                attributes.push(attribute);
            }
        });

        return { attributes, sqlalias };
    }

    /**
     * @protected
     * 
     * рекурсивно найти всех детей одной записи по заданным параметрам иерархии (parent - child)
     * 
     * @param {IFindAllChildren} fields 
     * @param {string} parent дефолтное значение для родительского поля
     * @param {Ifrom} table 
     * @param {{}} [options={}] 
     * 
     */
    async findAllChildren(table, fields, parent, options = {}) {
        const { where: guideWhere, guideAttrs } = fields;

        const parentWhere = Array.isArray(parent) ? parent : [parent];

        const where = { ['$and']: parentWhere };

        if (!isEmptyObject(parent || {})) {
            table.table = await this.findSQL(table, { attributes: ['*'], where: guideWhere });
        }

        const sql = await this.generateRecursive({
            guideAttrs,
            fields,
            table,
            where,
        });

        return this.query(sql, {});
    }

    /**
     * @public
     * 
     * сгенерировать запрос по заданным параметрам
     *
     * @param {string | Ifrom} table
     * @param {*} options
     * @returns {Promise<string>}
     */
    async findSQL(table, options = {}) {
        await this.connect(this.Model);

        options.group = uniqueValues(options?.group || []);

        const { attributes, sqlalias } = await this.transformAttributes(
            options.attributes
        );

        let where = this.transformOperations(options.where);

        if (options.rls && options.table) {
            ({ where } = this.getRlsOptions({ type: 'read', where, options }));
        }

        const having = options.having
            ? this.transformOperations(options.having)
            : {};

        let SQL = '';
        if (typeof table === 'object') {
            const newAttributes = uniqueValues(attributes);
            const newOptions = {
                ...(options || {}),
                attributes: newAttributes,
                where,
                having,
            };

            const tableData = table.raw ? [[table.raw]] : [['FROM_TO_BE_REPLACED', table.alias]];

            const fromsql = table.raw ? '' : table.table.replaceAll(';', '');

            SQL = await this.queryGenerator.selectQuery(tableData, newOptions);

            for (const key in sqlalias) {
                const alias = sqlalias[key];
                SQL = SQL.replaceAll(key, alias.innerSQLField);
            }

            SQL = SQL.replaceAll('"FROM_TO_BE_REPLACED"', `(${fromsql})`);
        } else {
            const tableInfo = { schema: this.Model.schema, tableName: table };

            const newOptions = { ...(options || {}), attributes, where, having };

            SQL = await this.queryGenerator.selectQuery(tableInfo, newOptions);
        }

        return SQL;
    }

    /**
     * @public
     * 
     * выполнить запрос подсчета строк
     * 
     * @param {Ifrom} table 
     * @param {*} options 
     * @returns 
     */
    async count(table, options = {}) {
        await this.connect(this.Model);

        const attributes = [['COUNT(*)', 'count']];
        const newOptions = { ...(options || {}) };

        //избавимся от условий которые могут повлиять на результат
        delete newOptions['offset'];
        delete newOptions['limit'];
        delete newOptions['order'];

        const preSQL = await this.findSQL(table, { ...newOptions });

        /** @type {Ifrom} */
        const from = {
            table: preSQL,
            alias: /** @type {object} */(table).alias ?? table,
        };
        const SQL = await this.findSQL(from, { attributes });

        return this.query(SQL, {
            ...(options || {}),
            type: QueryTypes.SELECT,
            raw: true,
        });
    }

    /**
     * @public
     * 
     * создание таблицы по переданным параметрам
     * 
     * @param {string} table 
     * @param {SynchI} [options] 
     * @returns 
     */
    async synch(table, options = {}) {

        const opt_resultAsArray = options.resultAsArray ?? false;
        const opt_noSupportSerial = options.noSupportSerial ?? false;
        const opt_noSupportDefault = options.noSupportDefault ?? false;
        const opt_noSupportUnique = options.noSupportUnique ?? false;
        const opt_noSupportNotNull = options.noSupportNotNull ?? false;
        const opt_noSupportPK = options.noSupportPK ?? false;

        /**
         * @param {*} info
         * @returns {string}
         */
        function generateCreateColumn(info) {
            /** @type {string[]} */
            const infoArray = [];

            // info.type;
            // info.len;
            // info.defaultValue;
            // info.unique;
            // info.allowNull;
            // info.primaryKey;
            // info.autoIncrement;

            /** @type {string} */
            const info_type = info?.type.toUpperCase() ?? 'STRING'; // was `type`
            /** @type {string} */
            let sql_datatype = options?.typeMapping?.[info_type] ?? info_type; // was `sqlType`

            /** @type {string} */
            let defaultData = '';
            if (info.defaultValue === 'UUID' && info_type === 'UUID') info.defaultValue = undefined;
            if (info.defaultValue !== undefined && info.defaultValue !== 'NOW' && info.defaultValue !== 'UUID') {
                defaultData = info.defaultValue !== undefined ? `${info.defaultValue}` : '';
                if (info_type === 'STRING' || info_type === 'UUID') defaultData = `'${defaultData}'`;
                defaultData = `default ${defaultData}`;
            }

            if (info_type) { //NOTE seems to always have value
                if (info_type === 'TIMESTAMP') {
                    sql_datatype = `${sql_datatype} with time zone`;
                    defaultData = `default CURRENT_TIMESTAMP`;
                }
                if (info_type === 'STRING') {
                    sql_datatype = `${sql_datatype}(${info.len || 255})`;
                }
            }
            /** @type {string} */
            const unique = info.unique ? 'UNIQUE' : '';
            /** @type {string} */
            const notNull = info.allowNull ? '' : 'NOT NULL';

            /**
             * Текст "primary key" должен быть написан заглавными,
             * так как в sequalize проверяется наличие заглавных букв
             * //NOTE поотрывать бы конечности тем волшебным личностям, которые сделали подобное в sequelize:
             * //NOTE потому что эти подстроки могут встречаться в sql-комментариях (/* ...) и взрывать парсинг
             * //NOTE и не только в комментариях, а в функциях, именах столбцов и т.п...
             * //NOTE БЫТЬ ОЧЕНЬ АККУРАТНЫМ С ТЕМ, ЧТО ПОДАЁТСЯ В ГЕНЕРАТОР!
             */
            /** @type {string} */
            const primaryKey = info.primaryKey ? 'PRIMARY KEY' : '';

            if (info.autoIncrement && (info_type === 'INTEGER')) {
                if (opt_noSupportSerial) {
                    sql_datatype = `INTEGER /*_noSupportSerial */`;
                }
                else {
                    sql_datatype = `SERIAL`;
                }
            }

            infoArray.push(sql_datatype);
            if ("" !== defaultData) infoArray.push(opt_noSupportDefault ? `/*_noSupportDefault */` : defaultData);
            if ("" !== unique) infoArray.push(opt_noSupportUnique ? `/*_noSupportUnique */` : unique);
            if ("" !== notNull) infoArray.push(opt_noSupportNotNull ? `/*_noSupportNotNull */` : notNull);
            if ("" !== primaryKey) infoArray.push(opt_noSupportPK ? `/*_noSupportPK */` : primaryKey);

            return infoArray.join(' ');
        }

        let result = [];

        await this.connect(this.Model);

        const isTableExist = await this.isTableExist(table);
        if (!isTableExist) {
            /** @type {Record<string, string>} */
            const columns = {};
            const { primaryKeys, uniqueKeys, indexes } = AbstractConnector.generateKeys(
                options.Keys
            );

            for (const fieldName in options.Fields) {
                const newField = options.Fields[fieldName];

                columns[fieldName] = generateCreateColumn({
                    type: newField.type ?? 'UUID',
                    allowNull: !(newField.notnull ?? false),
                    primaryKey: primaryKeys.includes(fieldName),
                    defaultValue: newField.default,
                    autoIncrement: newField.increment ?? false,
                    len: newField.len,
                    unique: newField.unique,
                });
            }

            const SQL = await this.queryGenerator.createTableQuery(
                { schema: this.Model.schema, tableName: table },
                columns,
                { uniqueKeys, indexes }
            );

            result.push(SQL);
        } else {
            const tSQL = [];
            if (options.fieldsSettings.delete) {
                for (const columnName of Object.keys(options.fieldsSettings.delete)) {
                    const SQL = await this.queryGenerator.removeColumnQuery(
                        { schema: this.Model.schema, tableName: table },
                        columnName,
                        {
                            cascade: false,
                            ifExists: true,
                        }
                    );
                    tSQL.push(SQL);
                }
            }

            if (options.fieldsSettings.insert) {
                for (const columnName of Object.keys(options.fieldsSettings.insert)) {
                    const field = options.Fields[columnName];

                    const type = field?.type?.toUpperCase() ?? 'UUID';
                    let sqlType = options?.typeMapping[type] ?? type;
                    const columnLen =
                        type === 'STRING' && field.len ? `(${field.len})` : '';
                    if (sqlType && field.len) sqlType = `${sqlType}${columnLen}`;

                    const columnDefinition = {
                        autoIncrement: field.increment ?? false,
                        allowNull: !(field.notnull ?? false),
                        type: sqlType ?? 'UUID',
                        // defaultValue: field.default,
                    };

                    const SQL = await this.queryGenerator.addColumnQuery(
                        { schema: this.Model.schema, tableName: table },
                        columnName,
                        columnDefinition,
                        {
                            ifNotExists: true,
                        }
                    );
                    tSQL.push(SQL);
                }
            }

            if (options.fieldsSettings.update) {
                for (const columnName of Object.keys(options.fieldsSettings.update)) {
                    const newColumn = options.fieldsSettings.update[columnName];
                    const type = newColumn?.type?.toUpperCase() ?? 'UUID';
                    const columnType = (
                        options?.typeMapping[type] ??
                        type ??
                        'uuid'
                    ).toUpperCase();
                    const columnLen =
                        type === 'STRING' && newColumn.len ? `(${newColumn.len})` : '';
                    if (newColumn.field !== columnName) {
                        const SQL = `ALTER TABLE ${this.Model.schema}."${table}" RENAME COLUMN "${columnName}" TO "${newColumn.field}";`;
                        tSQL.push(SQL);
                    }
                    const SQL = `ALTER TABLE ${this.Model.schema}."${table}" ALTER COLUMN "${newColumn.field}" TYPE ${columnType}${columnLen};`;
                    tSQL.push(SQL);
                }
            }
            if (opt_resultAsArray) {
                result.push(...tSQL);
            } else {
                result.push(tSQL.join('\n'));
            }
        }

        if (isTableExist && options.recreateKeys) {
            const schema = this.Model.schema;

            const tableKeys = await this.getAllActiveIndexes(table);
            const tableConstrains = await this.getAllConstrains(table);

            const { uniqueKeys } = AbstractConnector.generateKeys(options.Keys);

            const delIndex = tableKeys.map((key) => this.queryGenerator.removeIndexQuery(table, key));
            const delConstrains = tableConstrains.map((key) => `ALTER TABLE "${schema}"."${table}" DROP CONSTRAINT ${key}`);
            const addIndex = [];

            uniqueKeys.map((key) => {
                addIndex.push(this.queryGenerator.addIndexQuery({ schema, tableName: table }, key.fields, { name: crypto.randomUUID(), unique: true }))
            });

            // result = `
            // ${result}
            // ${delConstrains.join(';\n')};
            // ${delIndex.join(';\n')};
            // ${addIndex.join(';\n')};`;

            result.push(...delConstrains);
            result.push(...delIndex);
            result.push(...addIndex);
        }

        return opt_resultAsArray ? result : result.join(';\n');
    }

    /**
     * @protected
     * 
     * @param {string} table 
     * @returns {Promise<string[]>}
     */
    async getAllConstrains(table) {
        try {
            const schema = this.Model.schema;

            const sql = `SELECT conname as constraint_name FROM pg_constraint WHERE conrelid = '${schema}.${table}' :: regclass;`

            /** @type {[{ constraint_name: string }[], object]} */
            const [rows] = await this.querySql(sql);

            return rows.map((i) => i.constraint_name);
        } catch {
            return [];
        }
    }

    /**
     * @protected
     * 
     * @param {string} table 
     * @returns {Promise<string[]>}
     */
    async getAllActiveIndexes(table) {
        const sql = `SELECT indexname FROM pg_indexes WHERE tablename = '${table}';`

        /** @type {[{ indexname: string }[], object]} */
        const [rows] = await this.querySql(sql);

        return rows.map((i) => i.indexname);
    }

    /**
     * @param {string} table
     * @returns {Promise<string>}
     */
    async drop(table) {
        // await this.connect(this.Model);
        const SQL = await this.queryGenerator.dropTableQuery(
            {
                schema: this.Model.schema,
                tableName: table,
            },
            {
                cascade: false,
            }
        );
        return SQL;
    }

    /**
     * @public
     * 
     * @param {string} table 
     * @returns {Promise<boolean>}
     */
    async isTableExist(table) {
        const result = await this.model(table);

        return !!Object.keys(result).length;
    }

    /**
     * @public
     * 
     * @param {string} table
     * @param {*} options
     * @returns {Promise<Record<string, string>>}
     */
    async model(table, options) {
        await this.connect(this.Model);

        const SQL = await this.queryGenerator.selectQuery(
            { schema: this.Model.schema, tableName: table },
            { limit: 1 }
        );

        try {
            const data = await this.query(SQL, { ...(options || {}) });

            const [, { fields }] = data;
            /** @type {Record<string, string>} */
            const nowFields = {};
            for (const field of fields) {
                nowFields[field.name] = field;
            }

            return nowFields;
        } catch (err) {
            console.error(err);

            return {};
        }
    }

    /**
     * @public
     * 
     * @param {string} SQL 
     * @param {*} options 
     * @returns 
     */
    async querySql(SQL, options = {}) {
        await this.connect(this.Model);
        return this.query(SQL, { ...(options || {}) });
    }

    /**
     * @protected
     *
     * @param {string | { query: string, bind: any[] }} SQL
     * @param {{ type?: string, transaction?: object, tags?: Record<string, string>, timeOut?: number }} [options]
     */
    async query(SQL, options) {
        options = options ?? {};

        let requestSql = SQL;
        if (options.type === QueryTypes.SELECT)
            requestSql = await this.setQueryTags(SQL, options);

        return this.connector.query(requestSql, options);
    }

    /**
     * 
     * @param {*} table 
     * @param {*} values 
     * @param {*} options 
     * @param {*} callback 
     */
    async upsert(table, values, options, callback) {

        const { queue } = options;
        if (queue) {
            if (!queue.connector) queue.connector = this.connector;
            if (!queue.options) queue.options = { transaction: options.transaction }

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
     * 
     * @param {*} table 
     * @param {*} values 
     * @param {*} options 
     * @param {*} callback 
     * @returns 
     */
    async create(table, values, options = {}, callback) {

        const { queue } = options;
        if (queue) {
            if (!queue.connector) queue.connector = this.connector;
            if (!queue.options) queue.options = { transaction: options.transaction }

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
     * 
     * @param {*} table 
     * @param {*} values 
     * @param {*} options 
     * @param {*} callback 
     * @returns 
     */
    async bulkCreate(table, values, options, callback) {

        const { queue } = options;
        if (queue) {
            if (!queue.connector) queue.connector = this.connector;
            if (!queue.options) queue.options = { transaction: options.transaction }

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
     * @protected
     * 
     * выставление тегов запроса
     *
     * @param {string | { query: string }} SQL
     * @param {{ tags?: Record<string, string>, timeOut?: number }} inputOptions
     * @returns
     */
    async setQueryTags(SQL, inputOptions) {
        let requestSql = typeof SQL !== 'string' ? SQL.query : SQL;

        if (inputOptions.tags) {
            let str = '';
            for (const key in inputOptions.tags) {
                const value = inputOptions.tags[key];

                value && (str += `${key}=${value};`);
            }

            if (str) {
                requestSql = `SET gpcc.query_tags TO '${str}'; ${requestSql}`;
            }
        }

        requestSql = inputOptions.timeOut
            ? `set statement_timeout = ${inputOptions.timeOut}; ${requestSql};`
            : requestSql;

        return requestSql;
    }

    /**
     * способ получения транзакции привязанной к коннектору
     * 
     * @public
     */
    async transaction() {
        return {
            commit: () => {
                console.warn("Transactions doesn't support.");
            },
            rollback: () => {
                console.warn("Transactions doesn't support.");
            },
        };
    }

    /**
     * имитируем поведение модели и используя модуль RLS добавляем ограничения доступов на запрос
     * 
     * @protected
     * 
     * @param {{ type: string, where: object, options: object }} param0 
     * @returns 
     */
    getRlsOptions({ type, where, options }) {
        //** имитируем модель */
        const rls = new RLSManagerClass({
            tableName: options.table,
            // @ts-ignore
            name: options.table,
            options: {
                ...options,
                schema: sreda.env.DB_SCHEMA
            }
        });

        return rls.getRlsOptions(type, { where });
    }

    /**
     * @public
     * 
     * @param {{
     *  parentFilter?: { $eq: any },
     *  table: { table: string },
     *  fields: { pk: IFieldRecursive, parent: IFieldRecursive },
     *  attributes?: IFieldRecursive[],
     *  guideWhere?: object,
     *  where?: object
     * }} param0
     * @returns {Promise<string>}
     */
    async recursiveFilter({
        parentFilter,
        /** подполя основного запроса которые используются для фильтрации */
        attributes = [],
        /** фильтр по справочнику */
        guideWhere,
        /** фильтр по ключам иерархии */
        where,
        /** мета запроса */
        fields,
        /** название таблицы */
        table
    }) {
        // TODO!!!
        //@ts-ignore
        const qb = new QueryBuilderClass({ schema: this.Model.schema, connector: this });

        return qb.sql({ guideWhere, parentFilter, attributes, where, fields, table });
    }

    /**
     * @public
     * 
     * @param {{
     *  parentFilter?: { $eq: any },
     *  table: Ifrom,
     *  fields: {
     *    pk: IFieldRecursive,
     *    view?: IFieldRecursive,
     *    parent: IFieldRecursive,
     *    order?: [string, string][],
     *  },
     *  withAttributes?: string[],
     *  guideAttrs?: string[],
     *  attributes?: string[],
     *  guideWhere?: object,
     *  systemWhere?: [object],
     *  where?: object,
     *  level?: number
     * }} param0
     * @returns {Promise<string>}
     */
    async generateRecursive({
        parentFilter,
        guideAttrs = [],
        attributes = [],
        guideWhere,
        systemWhere,
        where,
        fields,
        table,
        level,
    }) {
        // TODO!!!
        // @ts-ignore
        const qb = new QueryBuilderClass({ schema: this.Model.schema, connector: this });

        return qb.generateRecursive({ parentFilter, guideAttrs, attributes, guideWhere, systemWhere, where, fields, table, level, });
    }

    /**
     * @protected
     * 
     * @param {{ sqls: Ifrom[], withOptions: object, volatileOptions: object }} param0
     * 
     * @returns {Promise<AsyncIterable<object[]>>}
     */
    async findGen({ withOptions, volatileOptions, sqls }) {
        throw new Error('NOT IMPLEMENTED');
    }
}

module.exports = AbstractConnector;