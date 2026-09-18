/**
 * @typedef {import("../../../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../../../../../../db/rls/types/WhereOptions.d.ts").WhereOptions} WhereOptions
 * @typedef {import("../behaviour/types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../behaviour/types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../behaviour/types/index").IBehaviourOptions} IBehaviourOptions
 */

const { isNil } = require('../../../../../utils/services/predicates');
const DefaultClass = require('./Default.class');

/**
 * Поведение без иерархий
 *
 * @class BaseClass
 * @implements {IQueryBuilerBehavior}
 */
class BaseClass extends DefaultClass {
    /**
     * @public
     *
     * @param {IBehaviourQueryOptions} options
     * @param {string} attribute
     * @param {string} [viewName]
     * @returns {Promise<IBehaviourOptions>}
     */
    async query(options, attribute, viewName) {
        const localWhere = {};

        const { where, systemWhere, dictionaryWhere } = options;

        if (where?.[attribute] !== undefined) {
            localWhere[attribute] = this.getFilter(where, attribute);
        }
        if (systemWhere?.[attribute] !== undefined) {
            localWhere[attribute] = this.getFilter(systemWhere, attribute);
        }

        if (this.isHierarchy && where?.[attribute] !== undefined) {
            const [item, treeObject] = await Promise.all([
                this.meta.getItem(this.id),
                this.meta.tableInfo(this.meta, this.id),
            ]);

            const { pkName, parentName } = this.getRefConfig(treeObject, item);

            const { rows } = await this.getRows({
                where: { [pkName]: where[attribute] },
                pkName,
                parentName,
                hierarchy: this.isHierarchy,
            });

            localWhere[attribute] = rows
                .map((row) => [row[pkName], row.children || []])
                .flat(Infinity);
        }

        if (dictionaryWhere[attribute] !== undefined) {
            const [item, treeObject] = await Promise.all([
                this.meta.getItem(this.id),
                this.meta.tableInfo(this.meta, this.id),
            ]);

            const { pkName } = this.getRefConfig(treeObject, item);

            const { keys } = await this.getRows({ where: dictionaryWhere[attribute], pkName });

            localWhere[attribute] ??= [];

            keys.forEach((key) => localWhere[attribute].push(key));
        }

        return {
            before: [{ attribute, where: localWhere }],
        };
    }

    /**
     * @protected
     *
     * @param {{ where: WhereOptions, pkName: string, parentName?: string, hierarchy?: boolean }} where
     * @returns
     */
    async getRows({ where, pkName, parentName, hierarchy }) {
        const attributes = [...Object.keys(where), pkName, parentName].filter(Boolean);

        const qoptions = {
            attributes,
            where,
            group: attributes,
            withOutCount: true,
            withOutOrder: true,
            withOutRefs: true,
            hierarchy: false,
        };

        if (hierarchy) {
            qoptions.attributes = [pkName, parentName];
            qoptions.withChildren = { pkName: pkName, parentName: parentName };
        }

        const { rows } = await this.meta.read(this.id, qoptions);

        const pkKeys = [];

        for (let i = 0; i < rows.length; i++) {
            const { [pkName]: key } = rows[i];

            pkKeys.push(key);
        }

        return { rows, keys: pkKeys };
    }

    /**
     * Формирование первичных атрибутов
     *
     * @public
     *
     * @param {object} options
     * @param {string | object} key
     * @param {string} [viewName]
     * @returns {Promise<IBehaviourOptions>}
     */
    async getSubQuery(options, key, viewName) {
        let where = {};
        let attribute, viewAttribute;

        let isCalculated = false;

        attribute = this.field?.field;
        viewAttribute = this.field?.value;

        if (!Array.isArray(key) && typeof key === 'object') {
            // where['$or'] ??= {};
            // where['$or'][key.field] = {
            //     ['$and']: {
            //         [this.NOT_EQUAL]: 0,
            //         [this.NOT]: null,
            //     },
            // };

            attribute = key.field;

            isCalculated = true;
        }

        return {
            current: [{ attribute, field: viewAttribute, where: {} }],
            after: isCalculated ? [{ attribute, where }] : [{ where }],
        };
    }

    /**
     * получить данные по pk parentKey и дефолтному фильтру из дерева метаданных
     *
     * @protected
     *
     * @param {*} treeObject
     * @param {*} item
     * @returns {{ pkName: string, parentName: string, parentFilter: WhereOptions | { $eq: string } }}
     */
    getRefConfig(treeObject, item) {
        const { fieldhierarchy, fieldhierarchydefault } = item?.manifest?.settings || {};

        const pkName = this.getPK(treeObject.Keys) || 'id';
        const parentName = this.getParent(treeObject, fieldhierarchy);

        /** @type {WhereOptions} */
        const parentFilter = !isNil(fieldhierarchydefault)
            ? { $eq: fieldhierarchydefault }
            : { $is: null };

        return {
            pkName,
            parentName,
            parentFilter,
        };
    }

    /**
     * @protected
     *
     * @param {Record<string, { settings: { primarykey: boolean }, fields: object }>} keys
     * @returns {string}
     */
    getPK(keys) {
        /** @type {string} */
        let fieldsPK = null;
        Object.keys(keys).forEach((key) => {
            if (keys[key].settings?.primarykey) {
                fieldsPK = Object.keys(keys[key].fields ?? {})[0];
            }
        });

        return fieldsPK;
    }

    /**
     * парсинг parent Key из дерева метаданных
     *
     * @protected
     *
     * @param {*} treeObject
     * @param {string | { value: string }} defVal
     * @returns
     */
    getParent(treeObject, defVal) {
        let parentName = 'parent';

        if (defVal) {
            const fieldHierarchy = typeof defVal === 'object' ? defVal.value : defVal;

            parentName =
                treeObject?.AllFieldsGUID?.[fieldHierarchy]?.field ||
                treeObject.FieldsGUID?.[fieldHierarchy]?.field; // TODO не поддерживает составные ключи
        }

        return parentName;
    }
}

module.exports = BaseClass;
