/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import('../../../metadata-connector/services/metadata/types').IConnectionField} IConnectionField
 * @typedef {import('sequelize').WhereOptions} WhereOptions
 * 
 * @typedef {import('../../../metadata-connector/services/metadata/types').IFieldRecursive} IFieldRecursive
 */

const { isNil, isEmptyObject } = require("../../../utils/services/predicates");

const DefaultClass = require('./_DefaultBehavior.class');

/**
 * Поведение без иерархий
 * 
 * @class BaseClass
 * @implements {IQueryBuilerBehavior}
 */
class BaseBehaviorClass extends DefaultClass {

    /**
     * @public
     * 
     * @param {{ guideConnector?: IConnector, viewName?: string }} param0 
     * @returns {Promise<boolean>}
     */
    async isValid({ }) { return true; }

    /**
     * TODO нужно избавиться от этого блока - он тут не должен быть
     * 
     * @public
     * 
     * @param {IBehaviourQueryOptions} options
     * @param {string} attribute 
     * @param {string} [viewName]
     * 
     * @returns {Promise<IBehaviourOptions>}
     */
    async query(options, attribute, viewName) {
        const { where, systemWhere, dictionaryWhere } = options;

        let and = [];

        if (where?.[attribute] !== undefined) {
            and.push(this.getFilter(where, attribute));
        }
        if (systemWhere?.[attribute] !== undefined) {
            and.push(this.getFilter(systemWhere, attribute));
        }

        if (this.isHierarchy && where?.[attribute] !== undefined) {
            const treeObject = await this.meta.tableInfo(this.meta, this.id);

            this.guideFields = treeObject?.AllFieldsGUID || treeObject?.FieldsGUID;

            this.getConnectionFields();

            const { IdField, ParentField } = await this.meta.getSettings(this.id, treeObject);

            const { rows } = await this.getRows({
                where: { [IdField.field]: where[attribute] },
                pk: IdField,
                parent: ParentField,
                hierarchy: this.isHierarchy
            });

            and.push(rows.map((row) => [row[IdField.field], row.children || []]).flat(Infinity));
        }

        if (dictionaryWhere[attribute] !== undefined) {
            const treeObject = await this.meta.tableInfo(this.meta, this.id);

            const { IdField, ParentField } = await this.meta.getSettings(this.id, treeObject);

            this.guideFields = treeObject?.AllFieldsGUID || treeObject?.FieldsGUID;

            this.getConnectionFields();

            const { keys } = await this.getRows({
                where: dictionaryWhere[attribute],
                pk: IdField,
                parent: ParentField,
            });

            and.push(keys);
        }

        and = and.filter((i) => !isNil(i));

        const before = !and.length ? [{ attribute }] : [{ attribute, where: { [attribute]: { ['$and']: and.flat() } } }];

        return { before }
    }

    /**
     * @protected
     */
    getConnectionFields() {
        /** @type {IConnectionField[]} */
        this.connectionFields = Object.values(this.field.refFields).map(({ field, refField }) => {
            const right = this.guideFields[refField.value];
            const left = this.treeFields[field.value];

            return {
                right: {
                    field: right.field,
                    type: right.type
                },
                left: {
                    field: left.field,
                    type: left.type
                }
            }
        });

        /** @type {string[]} */
        this.connectionAliases = this.connectionFields.map(({ right }) => right.field);
        /** @type {Record<string, IFieldRecursive>} */
        this.leftRightMapping = this.connectionFields.reduce((acc, { left, right }) => {
            acc[right.field] = left
            return acc;
        }, {});
    }

    /**
     * @protected
     * 
     * @param {{ where: WhereOptions, pk: IFieldRecursive, parent?: IFieldRecursive, hierarchy?: boolean }} where 
     * 
     * @returns 
     */
    async getRows({ where, pk, parent, hierarchy }) {
        const attributes = [...Object.keys(where), pk.field, parent?.field].filter(Boolean);

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
            qoptions.attributes = [pk.field, parent.field];
            qoptions.withChildren = {
                pk,
                parent,
                guideAttrs: this.connectionAliases || []
            };
        }

        const { rows } = await this.meta.read(this.id, qoptions);

        const pkKeys = [];

        for (let i = 0; i < rows.length; i++) {
            const { [pk.field]: key } = rows[i];

            const children = rows[i].childrenFields || [];

            children.forEach((child) => child[pk.field] && pkKeys.push(child[pk.field]))

            pkKeys.push(key);
        }

        return { rows, keys: pkKeys };
    }

    /**
     * получить данные по pk parentKey и дефолтному фильтру из дерева метаданных
     * 
     * @protected
     * 
     * @param {*} treeObject 
     * @param {*} item 
     * 
     * @returns {{ pkName: string, parentName: string, parentFilter: { $eq: string } | { $is: null } }}
     */
    getRefConfig(treeObject, item) {
        const { fieldhierarchy, fieldhierarchydefault } = item?.manifest?.settings || {};

        const pkName = this.getPK(treeObject.Keys) || 'id';
        const parentName = this.getParent(treeObject, fieldhierarchy);

        /** @type {{ $eq: string } | { $is: null }} */
        const parentFilter = !isNil(fieldhierarchydefault)
            ? { $eq: fieldhierarchydefault }
            : { $is: null };

        return {
            pkName,
            parentName,
            parentFilter
        };
    }

    /**
     * @protected
     * 
     * @param {Record<string, { settings: { primarykey: boolean }, fields: object }>} keys 
     * 
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
     * 
     * @returns {string}
     */
    getParent(treeObject, defVal) {
        let parentName = 'parent';

        if (defVal) {
            const fieldHierarchy = typeof defVal === 'object' ? defVal.value : defVal;

            parentName = treeObject?.AllFieldsGUID?.[fieldHierarchy]?.field || treeObject.FieldsGUID?.[fieldHierarchy]?.field; // TODO не поддерживает составные ключи
        }

        return parentName;
    }
}

module.exports = BaseBehaviorClass;