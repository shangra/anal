/**
 * @typedef {import('../../../../../metadata-cmp/services/Metadata.service')} MetadataService
 * @typedef {import('../../../../../metadata-cmp/services/Metadata.service').LevelClassI} LevelClassI
 * @typedef {import("../../../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../../../../../../db/rls/types/WhereOptions").WhereOptions} WhereOptions
 */

const ApiError = require('../../../../../../core/exceptions/ApiError');
const { isNil } = require('../../../../../utils/services/predicates');

const ALLOWED_AGG_FUNS = {
    sum: true,
    count: true,
    avg: true,
    min: true,
    max: true,
    first_value: true,
    last_value: true,
};

/**
 * @typedef AccountConfigI
 * @property {string} id
 * @property {string} parent
 * @property {string} agg_func
 * @property {string} name
 * @property {string} tilda
 */

class AccountClass {
    /**
     * @param {{ meta: MetadataService }} param0
     */
    constructor({ meta }) {
        this.meta = meta;
    }

    /**
     * @public
     *
     * @param {{ options: object, treeObject: object, metaClass: MetadataService }} param0
     * @returns
     */
    async matrix({ options, treeObject }) {
        const { attributes } = options;

        const { accountDimension } = options?.settings || {};

        if (!accountDimension || !this.isValid(attributes, accountDimension))
            return { mappedOptions: [options] };

        const refItem = this.checkAccountField({
            attributes,
            accountDimension,
            fields: treeObject.Fields,
        });

        const systemParent = this.getParent(options.systemWhere, refItem.field);

        const meta = refItem?.ref ? await this.meta.getInstance(refItem?.ref, {}) : null;

        if (!meta) {
            throw ApiError.BadRequest('Не указан cправочник для агрегации Показателей');
        }

        const { rows: items, neRowIds } = await this.getItems({ ref: refItem?.ref, systemParent });

        const mapping = this.groupByAggField(items);

        const mappedOptions = [];

        for (const key in mapping) {
            const value = mapping[key];

            const [first] = value;

            if (!first.agg_func) continue;

            const localOptions = structuredClone(options);

            const where = {
                ['$or']: value.map((i) => i.id),
            };

            if (neRowIds.length) {
                where['$and'] = neRowIds.map((i) => ({ ['$ne']: i }));
            }

            localOptions.where = { [refItem.field]: where };

            localOptions.attributes = localOptions.attributes.map((attr) => {
                if (attr?.func === 'ACCOUNT') {
                    return {
                        field: attr.field,
                        func: first.agg_func,
                        alias: `${attr.field}:->:ACCOUNT`,
                    };
                }

                return attr;
            });

            mappedOptions.push(localOptions);
        }

        return { mappedOptions };
    }

    /**
     * @private
     *
     * @param {{ ref: { value: string, link: string }, systemParent: object }} param0
     * @returns
     */
    async getItems({ ref, systemParent }) {
        const meta = await this.meta.getInstance(ref, {});
        if (!meta) {
            throw ApiError.BadRequest('Не указано поле агрегации Показателей');
        }

        const idGuide = ref.value;
        if (!idGuide) {
            throw ApiError.BadRequest('Не указанна ссылка для связи со справочником Показателей');
        }

        const [item, treeObject] = await Promise.all([
            meta.getItem(idGuide),
            meta.tableInfo(meta, idGuide),
        ]);

        const { pkName, viewField, parentName, parentFilter } = this.getRefConfig(treeObject, item);
        const { connector } = await meta.getConnector(item);

        const where = systemParent ?? parentFilter;

        const rows = await this.getEqIds({
            where,
            idGuide,
            meta,
        });

        const ids = rows.map((i) => i.id);

        const neRowIds = await this.getNeEqIds({
            parentFilter,
            parentName,
            connector,
            pkName,
            idGuide,
            meta,
            ids,
        });

        return {
            rows,
            pkName,
            viewField,
            parentFilter,
            neRowIds: neRowIds.filter((i) => !ids.includes(i)),
        };
    }

    /**
     * @private
     *
     * @param {{ where: object, meta: LeveClassI, idGuide: string }} param0
     * @returns
     */
    async getEqIds({ where, meta, idGuide }) {
        const { rows } = await meta.read(idGuide, {
            attributes: ['id', 'parent', 'name', 'agg_func', 'tilda'],
            where: { parent: where },
            withOutCount: true,
            withOutOrder: true,
            withOutRefs: true,
        });

        return rows;
    }

    /**
     *
     * @param {{ idGuide: string, meta: LevelClassI, parentFilter: object, connector: object, pkName: string, parentName: string, ids: string[] }} param0
     * @returns
     */
    async getNeEqIds({ idGuide, meta, parentFilter, connector, pkName, parentName, ids }) {
        const { query } = await meta.query(idGuide, {
            attributes: ['id', 'parent', 'name', 'agg_func', 'tilda'],
            withOutCount: true,
            withOutOrder: true,
            withOutRefs: true,
            hierarchy: false,
        });

        const sql = await connector.generateRecursive({
            parentFilter,
            where: { ['$and']: ids },
            attributes: ['tilda'],
            fieldsWhere: { tilda: '~' },
            table: { table: query.table },
            fields: { pkName, parentName },
        });

        const items = await connector.findAll(
            { table: `${sql};`, alias: 'temp' },
            { attributes: ['*'] }
        );

        return items.map((i) => i._id);
    }

    /**
     * @private
     *
     * @param {AccountConfigI[]} items
     * @returns {Record<string, AccountConfigI[]>}
     */
    groupByAggField(items) {
        /** @type {Record<string, AccountConfigI[]>} */
        const mapping = items.reduce((acc, item) => {
            if (!ALLOWED_AGG_FUNS[item.agg_func?.toLowerCase()]) {
                throw ApiError.BadRequest(
                    `указан недопустимая функция агрегации для записи ${JSON.stringify(item)}`
                );
            }
            acc[item.agg_func] ||= [];
            acc[item.agg_func].push(item);

            return acc;
        }, {});

        return mapping;
    }

    /**
     * @protected
     *
     * @param {{ attributes: string[], accountDimension: { field: string }, fields: Record<string, object> }} param0
     * @returns
     */
    checkAccountField({ attributes, accountDimension, fields }) {
        const field = attributes.find((item) => accountDimension.field === item);
        if (!field) {
            throw ApiError.BadRequest('В срезе не переданно поле агрегации Показателей');
        }

        const refItem = fields[accountDimension.field];
        if (!refItem) {
            throw ApiError.BadRequest('Не указано поле агрегации Показателей');
        }

        return refItem;
    }

    getParent(where, attribute) {
        return where[attribute]?.__parent__ ?? where[attribute] ?? null;
    }

    /**
     * получить данные по pk parentKey и дефолтному фильтру из дерева метаданных
     *
     * @private
     *
     * @param {*} treeObject
     * @param {*} item
     * @returns {{ viewField: string, pkName: string, parentName: string, parentFilter: WhereOptions | { $eq: string } }}
     */
    getRefConfig(treeObject, item) {
        const { fieldhierarchy, fieldhierarchydefault } = item?.manifest?.settings || {};

        const { field: pkName, key } = this.getPK(treeObject.Keys) || { field: 'id', key: 'id' };
        const parentName = this.getParenPk(treeObject, fieldhierarchy);
        const value = treeObject.Keys[key]?.settings?.fieldview;
        const viewField = treeObject.FieldsGUID[value?.value || value]?.field;

        /** @type {WhereOptions} */
        const parentFilter = !isNil(fieldhierarchydefault)
            ? { $eq: fieldhierarchydefault }
            : { $is: null };

        return {
            pkName,
            viewField,
            parentName,
            parentFilter,
        };
    }

    /**
     * @private
     *
     * @param {Record<string, { settings: { primarykey: boolean }, fields: object }>} keys
     * @returns {{ field: string, key: string }}
     */
    getPK(keys) {
        /** @type {string} */
        let field = null;
        let pKey = null;
        Object.keys(keys).forEach((key) => {
            if (keys[key].settings?.primarykey) {
                field = Object.keys(keys[key].fields ?? {})[0];
                pKey = key;
            }
        });

        return { field, key: pKey };
    }

    /**
     * парсинг parent Key из дерева метаданных
     *
     * @private
     *
     * @param {*} treeObject
     * @param {string | { value: string }} defVal
     * @returns
     */
    getParenPk(treeObject, defVal) {
        let parentName = 'parent';

        if (defVal) {
            const fieldHierarchy = typeof defVal === 'object' ? defVal.value : defVal;

            parentName =
                treeObject?.AllFieldsGUID?.[fieldHierarchy]?.field ||
                treeObject.FieldsGUID?.[fieldHierarchy]?.field; // TODO не поддерживает составные ключи
        }

        return parentName;
    }

    /**
     * проверяем есть ли агрегативное поле ACCOUNT в атрибутах среза и есть ли функция агрегации ACCOUNT
     *
     * @private
     *
     * @param {({ field: string, func: string, alias: string })[]} attributes
     */
    isValid(attributes, accountDimension) {
        return (
            attributes.some((attr) => accountDimension.field === attr) &&
            attributes.some((attr) => attr.func === 'ACCOUNT')
        );
    }
}

module.exports = AccountClass;
