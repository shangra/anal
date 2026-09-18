const { default: knex } = require("knex");
const { isEmptyObject, hop, uniqueValues } = require("../../../../utils/services");

/**
 * @typedef {import("../connectors/AbstractConnector").CastTypeI} CastTypeI
 * @typedef {import("../../../../../core/db/models/types").TField} TField
 * @typedef {import("../Connector.class").IConnector} IConnector
 * @typedef {import("../Connector.class").Ifrom} Ifrom
 * 
 * @typedef {knex.Knex<any, unknown[]>} GQBI
 * @typedef {knex.Knex.QueryBuilder<any, unknown[]>} GQBQBI
 * @typedef {knex.Knex.Raw<any>} GQBIstring
 * 
 * @typedef {import("../types").IFieldRecursive} IFieldRecursive
 */

const ID_FIELD = '_id';
const PARENT_FIELD = '_pid';

class QueryBuilderClass {
    /**
     * @param {object} param0 
     * @param {string} param0.schema
     * @param {IConnector} param0.connector
     */
    constructor({ schema, connector }) {
        this.schema = schema;
        this.connector = connector;
    }

    /**
     * @public
     * 
     * @param {{
     *  parentFilter?: { $eq: any },
     *  table: Ifrom,
     *  fields: {
     *    pk: IFieldRecursive,
     *    parent: IFieldRecursive
     *  },
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
        /** подполя справочника которые используются для фильтрации */
        guideAttrs,
        /** подполя основного запроса которые используются для фильтрации */
        // attributes = [],
        /** фильтр по подполям основного запроса */
        guideWhere,
        /** фильтр по ключам иерархии */
        where,
        fields,
        table,
        level,
    }) {
        const cte = await this.sql({ guideAttrs, parentFilter, guideWhere, where, fields, table });

        const lvl = (level || 0) + 1;

        const gqb = knex({ dialect: 'postgres' });

        const sql = gqb.select([
            gqb.raw(`_path[${lvl}] as "__id__"`),
            gqb.raw(`${ID_FIELD} as "__child__"`),
            ...guideAttrs,
        ])
            .groupBy(['__id__', '__child__', ...guideAttrs])
            .fromRaw(`(${cte}) as cte`)
            .whereNotNull(`_path[${lvl}]`);

        return sql.toQuery();
    }

    /**
     * @public
     * 
     * @param {{
     *  parentFilter?: { $eq: any },
     *  table: Ifrom,
     *  fields: {
     *    pk: IFieldRecursive,
     *    parent: IFieldRecursive,
     *  },
     *  guideAttrs?: string[],
     *  attributes?: { field: string, type: string}[],
     *  guideWhere?: object,
     *  where?: object
     * }} param0
     * @returns {Promise<string>}
     */
    async sql({
        parentFilter,
        /** поля которые нужно достать 1 к 1 относительно каждой строки */
        guideAttrs,
        /** поля которые необходимо достать из рекурсии в виде scode: {0, 1, 2, 3, 4} */
        attributes = [],
        /** фильтр по справочнику */
        guideWhere = {},
        /** фильтр по ключам иерархии */
        where = {},
        /** мета запроса */
        fields,
        /** название таблицы */
        table
    }) {
        const { pk, parent } = fields;

        const tableAlias = this.getTableAlias(table);

        const gqb = knex({ dialect: 'postgres' });

        /**
         * аттрибуты которые будут присутствовать при формировании рекурсии
         */
        /** @type {{ field: string, type: string}[]} */
        let arrayAttributes = [];

        const mappedRecAttrs = { [pk.field]: [ID_FIELD], [parent.field]: [PARENT_FIELD] };

        attributes.forEach((attr) => {
            mappedRecAttrs[attr.field] ||= [];
            mappedRecAttrs[attr.field].push(attr.field);
            arrayAttributes.push({ field: attr.field, type: attr.type });
        });

        /** @type {[string, string[]][]} */
        const recAttrs = Object.entries(mappedRecAttrs);

        /**
         * очитстим поля по которым будут формироваться массивы от системных полей
         */
        arrayAttributes = uniqueValues(arrayAttributes.filter((({ field }) => ![ID_FIELD, PARENT_FIELD].includes(field))));

        /**
         * аттрибуты которые выбираем из основного запроса
         */
        const subAttributes = uniqueValues(recAttrs.map(([_, item]) => item).flat());

        const guideKeys = uniqueValues([...Object.keys(guideWhere || {}), ...guideAttrs || []].filter(Boolean));
        const dictAttrs = guideKeys.map((item) => gqb.raw(`"_dict_main"."${item}" as "${item}"`));

        const attributesAliases = attributes.map(({ field }) => field);

        /**
         * основной запрос обернутый в выборку ID_FIELD и PARENT_FIELD + guideAttrs
         */
        const mainCteSql = this.generateSql({ gqb, recAttrs, attributes: [...attributesAliases, ...guideKeys], tableAlias });

        /**
         * так как в основном запросе может использоваться любое количество данных то мы его искуственно ограничивае если есть алиасы
         * (по сути оставляем только ID_FIELD и PARENT_FIELD)
         */
        const dict = gqb
            .with('_dict_main', gqb.raw(mainCteSql))
            .with('_dict', (qb) =>
                qb
                    .select(subAttributes)
                    .from('_dict_main')
                    .groupBy(subAttributes)
            );

        const walk = this.walk(dict, gqb, arrayAttributes, parentFilter, pk);

        const cte = walk
            .select([
                gqb.raw(`"_walk"."_path" as "_path"`),
                gqb.raw(`"_walk"."${PARENT_FIELD}" as "${PARENT_FIELD}"`),
                gqb.raw(`"_walk"."${ID_FIELD}" as "${ID_FIELD}"`),
                ...attributesAliases.map((attr) => gqb.raw(`"_walk"."${attr}" as "${attr}"`)),
                ...dictAttrs
            ])
            .from('_walk')
            .groupBy([
                gqb.raw(`_walk._path`),
                gqb.raw(`_walk."${PARENT_FIELD}"`),
                gqb.raw(`_walk.${ID_FIELD}`),
                ...attributesAliases.map((attr) => gqb.raw(`_walk."${attr}"`)),
                ...guideKeys.map(attr => gqb.raw(`_dict_main."${attr}"`)),
            ]);

        const fthis = this;

        cte.andWhere(function () { fthis.where({ fthis, where: where, cte: this, gqb }) });

        let SQL = cte.toQuery() + ';';

        if (dictAttrs.length) {
            cte.innerJoin('_dict_main', function () { this.on(`_walk.${ID_FIELD}`, '=', `_dict_main.${ID_FIELD}`) });

            SQL = await this.connector.findSQL(
                { table: `${cte.toQuery()};`, alias: 'cte' },
                { attributes: ['*'], where: guideWhere || {} }
            );
        }

        return SQL.replace(/;\s*$/g, "");
    }

    /**
     * @private
     * 
     * @param {object} param0 
     * @param {this} param0.fthis
     * @param {object} param0.where
     * @param {GQBI} param0.gqb
     * @param {GQBQBI} param0.cte
     */
    where({ where, fthis, cte, gqb }) {
        if (typeof where !== 'object') return cte.andWhereRaw(fthis.connector.findInArray(gqb, '_walk._path', where));

        if (Array.isArray(where)) {
            return where.map((where) => this.where({ where, fthis, cte, gqb }));
        }

        for (const key in where) {
            if (key === '$and') {
                for (const item of where[key]) {
                    cte.andWhere(function () {
                        fthis.where({ where: item, fthis, cte: this, gqb });
                    });
                }
            }

            if (key === '$or') {
                for (const item of where[key]) {
                    cte.orWhere(function () {
                        fthis.where({ where: item, fthis, cte: this, gqb });
                    });
                }
            }

            if (key === '$eq' || key === '__parent__') {
                const value = typeof where[key] === 'number' ? where[key] : `'${where[key]}'`;

                true || typeof where?.__level__ !== 'number'
                    ? cte.orWhereRaw(fthis.connector.findInArray(gqb, '_walk._path', where[key]))
                    : cte.orWhereRaw(`_walk._path[${where.__level__ + 1}] = ${value}`);
            }
        }
    }

    /**
     * @private
     * 
     * @param {GQBQBI} dict 
     * @param {GQBI} gqb 
     * @param {IFieldRecursive[]} attributes
     * @param {any} parentFilter 
     * @param {{field: string, type: string}} pk 
     */
    walk(dict, gqb, attributes, parentFilter, pk) {
        /**
         * аттрибуты основного запроса
         */
        const mainRecAttr = this.createMainRecursiveAttributes(gqb, attributes, pk);

        /**
         * аттрибуты которые используются в рекурсивном запросе
         */
        const recAttr = this.createRecursiveAttributes(gqb, attributes, pk);

        return dict
            .withRecursive('_walk', (qb) => {
                // 1. Якорная часть (Anchor)
                qb
                    .select(mainRecAttr)
                    .from('_dict')
                    .where({ [PARENT_FIELD]: parentFilter?.['$eq'] ?? null });

                // 2. Рекурсивная часть (Recursive)
                const recursiveQuery = gqb
                    .select(recAttr)
                    .from('_walk')
                    .innerJoin('_dict', (joinQb) => {
                        joinQb.on(`_dict.${PARENT_FIELD}`, '=', `_walk.${ID_FIELD}`);
                    });

                // Добавляем рекурсивный запрос через unionAll
                qb.unionAll(recursiveQuery);
            })
    }

    /**
     * @private
     * 
     * @param {GQBI} gqb 
     * @param {IFieldRecursive[]} attributes
     * @param {IFieldRecursive} pk
     */
    createRecursiveAttributes(gqb, attributes, pk) {
        // TODO костыль
        const isBlocked = {};

        const recAttr = [
            gqb.raw(`_walk.__level__ + 1 as __level__`),
            gqb.raw(`_dict.${ID_FIELD} as ${ID_FIELD}`),
            gqb.raw(`_dict.${PARENT_FIELD} as ${PARENT_FIELD}`),
            gqb.raw(`${this.connector.appendArray('_walk._path', this.connector.cast(`_dict.${ID_FIELD}`, pk.type))} as _path`),
        ];

        attributes.forEach(({ field, type }) => {
            if (isBlocked[field]) return;

            recAttr.push(gqb.raw(`${this.connector.appendArray(`_walk.${field}`, this.connector.cast(`_dict.${field}`, type))} as ${field}`));

            isBlocked[field] = field;
        });

        return recAttr;
    }

    /**
     * @private
     * 
     * @param {GQBI} gqb 
     * @param {IFieldRecursive[]} attributes
     * @param {IFieldRecursive} pk
     */
    createMainRecursiveAttributes(gqb, attributes, pk) {
        const isBlocked = {};

        const mainRecAttr = [
            gqb.raw(`0 as __level__`),
            gqb.raw(`_dict.${ID_FIELD} as ${ID_FIELD}`),
            gqb.raw(`_dict.${PARENT_FIELD} as ${PARENT_FIELD}`),
            gqb.raw(`${this.connector.createArray(this.connector.cast(`_dict.${ID_FIELD}`, pk.type))} as "_path"`),
        ];

        attributes.forEach(({ field, type }) => {
            if (isBlocked[field]) return;

            mainRecAttr.push(gqb.raw(`${this.connector.createArray(this.connector.cast(`_dict.${field}`, type))} as ${field}`))

            isBlocked[field] = field;
        });

        return mainRecAttr;
    }

    /**
     * @private
     * 
     * @param {Ifrom} table 
     * 
     * @returns {string}
     */
    getTableAlias(table) {
        return typeof table !== 'object'
            ? `${this.schema}."${table}"`
            : table.table.slice(0, -1);
    }

    /**
     * @private
     * 
     * @param {{ gqb: GQBI, recAttrs: [string, string[]][], attributes: string[], tableAlias: string }} param0 
     */
    generateSql({ gqb, recAttrs, attributes, tableAlias }) {
        const aliases = this.getAliases(attributes || []).map(i => `"${i}"`);

        const groupFields = [...aliases];

        const rawAttributes = recAttrs.map(([key, values]) => {
            return values.reduce(
                (acc, alias) => {
                    groupFields.push(`"${key}"`);

                    if (key == alias) {
                        acc.push(`"${key}"`);
                        return acc;
                    }
                    acc.push(`"${key}" as "${alias}"`);
                    return acc;
                },
                []
            );
        });

        const castAttrs = uniqueValues(rawAttributes.flat());

        const mainAttr = uniqueValues([...castAttrs, ...aliases]).map((item) => gqb.raw(item));

        const mainCteGroup = uniqueValues(groupFields.filter(Boolean));

        const mainCteSql = gqb
            .select(mainAttr)
            .fromRaw(`(${tableAlias}) as cte`)
            .as('mainCte')
            .groupByRaw(mainCteGroup.join(', '));

        return mainCteSql;
    }

    /**
     * @private
     * 
     * @param {TField[]} attributes 
     * @returns {string[]}
     */
    getAliases(attributes) {
        return attributes.map((attr) => {
            if (Array.isArray(attr)) return attr[1];

            return typeof attr === 'object' ? attr.alias : attr;
        });
    }
}

module.exports = QueryBuilderClass;