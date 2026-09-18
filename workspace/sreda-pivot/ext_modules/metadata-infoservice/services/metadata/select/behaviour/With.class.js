const { uniqueValues, isEmptyObject } = require('../../../../../utils/services');
const BaseClass = require('./Base.class');

/**
 * @typedef {import('../../../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../../../../db/rls/types/WhereOptions.d.ts").WhereOptions} WhereOptions
 * @typedef {import("../behaviour/types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../behaviour/types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../behaviour/types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../behaviour/types/index").ILevel} ILevel
 * @typedef {import("../../../../../../db/rls/types/WhereOptions").Where} Where
 */

/**
 * Нужно почистить класс - слишком сильно разрастается
 */

/**
 * Поведение с иерархиями для рекурсивных джойнов
 *
 * @class WithClass
 * @exptends {BaseClass}
 * @implements {IQueryBuilerBehavior}
 */
class WithClass extends BaseClass {
    constructor({ refItem, meta, connector, field, table, delimeter }) {
        super({ refItem, meta, table, field, delimeter });
        /** @type {IConnector} */
        this.connector = connector;
    }

    /**
     * @param {string} viewName
     * @returns {string}
     */
    generateViewName(viewName) {
        return `${this.attribute}${this.delimeter}${viewName}`;
    }

    /**
     * Формирование рекурсивных опций
     *
     * @public
     * @param {IBehaviourQueryOptions} param0 - Данные для SQL
     * @param {string} attribute - Атрибут
     * @param {string} viewName - Имя представления
     *
     * @returns {Promise<object>}
     */
    async query({ dictionaryWhere, systemWhere, where, settings }, attribute, viewName) {
        this.subFields = settings?.fields?.[attribute]?.children || [];

        this.attribute = attribute;

        this.index = settings?.index;
        this.columns = settings?.columns;

        const viewAlias = this.generateViewName(viewName);

        this.id = typeof this.refItem.ref === 'object' ? this.refItem.ref.value : this.refItem.ref;

        const isVisible = this.isVisible(settings, attribute, viewAlias);

        const [item, treeObject] = await Promise.all([
            this.meta.getItem(this.id),
            this.meta.tableInfo(this.meta, this.id),
        ]);

        const { pkName, parentName, parentFilter } = this.getRefConfig(treeObject, item);

        const { view } = await this.getPkField(treeObject);

        const params = {
            dictionaryWhere: dictionaryWhere ?? {},
            systemWhere: systemWhere ?? {},
            where: where ?? {},
            parentFilter,
            parentName,
            viewName,
            isVisible,
            pkName,
            view,
        };

        return viewName ? this.pkData(params, attribute) : this.generate(params, attribute);
    }

    /**
     * @private
     *
     * формирование подполей как измерений
     *
     * @param {{ systemWhere: object, where: object, pkName: string, viewName: string, isVisible: boolean }} param0
     * @returns {Promise<IBehaviourOptions>}
     */
    async pkData({ pkName, systemWhere, where, viewName }, attribute) {
        const view = this.generateViewName(viewName);
        const attributes = [pkName, [viewName, view]];
        const group = [pkName, viewName];

        const qoptions = {
            attributes,
            group,
            withOutCount: true,
            withOutOrder: true,
            withOutRefs: true,
            hierarchy: false,
        };

        /**
         * получим квери необходимое для формирования иерерахии
         */
        const { query } = await this.meta.query(this.id, qoptions);

        /**
         * выставляем пользовательские фильтры
         */
        const localWhere = where[view] !== undefined ? { [view]: where[view] } : null;
        /**
         * выставим системные фильтры
         */
        const viewWhere = systemWhere[view] !== undefined ? { [view]: systemWhere[view] } : null;

        const withOption = {
            query: query.table.slice(0, -1),
            viewNames: [view],
            connectionField: pkName,
            attributeName: view,
            joinField: attribute,
        };

        const baseLevel = { attribute: view, field: view, ignoreAttribute: attribute };

        return {
            before: [{ withOption }],
            current: [{ ...baseLevel, where: localWhere }],
            after: [{ ...baseLevel, where: viewWhere }],
        };
    }

    /**
     *
     * @param {*} param0
     * @param {*} attribute
     * @returns
     */
    async generate(
        { dictionaryWhere, parentFilter, systemWhere, parentName, isVisible, pkName, where, view },
        attribute
    ) {
        const isLeafHeararchy = !!this.refItem.subtotal || !!this.refItem.hierarchy;

        /**
         * получим текущий фильтр раскрытия
         */
        const sWhere = this.getFilter(systemWhere, attribute);

        /**
         * получим текущий уровень расскрытия
         */
        const level = this.getLvl({ where: {}, systemWhere, attribute, isVisible });

        /**
         * получим пользовательский фильтр
         */
        const pkWhere = this.getFilter(where, attribute);
        /**
         * уставноим пользовательский филтр на pk field
         */
        const localWhere = this.sanitizeWhere(pkWhere !== undefined ? { [pkName]: pkWhere } : {});

        const {
            viewAlias,
            query,
            viewNames,
            connectionField,
            attributeFields,
            additionalAttributes,
            mergeName,
            cast,
        } = await this.getRefData(
            {
                parentFilter,
                hierarchy: isLeafHeararchy,
                systemWhere: sWhere,
                where: localWhere,
                dictionaryWhere,
                parentName,
                pkName,
                view,
                level,
            },
            attribute
        );

        const withOption = {
            query,
            viewNames,
            connectionField,
            attributeFields,
            attributeName: attribute,
            joinField: attribute,
            mergeName,
            cast,
        };

        /** @type {IBehaviourOptions} */
        const result = {
            before: [{ withOption }],
            current: [{ additionalAttributes }],
            after: [{ additionalAttributes }],
            viewAlias,
        };

        return result;
    }

    /**
     * COMMENTS: перегруженная дичь прилепленная без понимания и смысла
     * нужно убрать но так как теперь это часть функционала то теперь нам с этим жить
     * данная релиазация это копипаст поэтому это делает ее еще более ужасной
     *
     * @param {*} treeObject
     * @returns
     */
    async getPkField(treeObject) {
        let viewAlias = null;
        let view = null;
        for (const keyName in treeObject.Keys) {
            const guidKey = treeObject.Keys[keyName];
            const findKey = guidKey.settings.primarykey; // Если не ищем какой-то особенный ключ, то ищем только первичный
            if (findKey) {
                if (guidKey.settings.templateview && guidKey.settings.templateview.trim() !== '') {
                    let template = guidKey.settings.templateview;
                    const reg = /\[\[\s*(?<field>[-_a-z0-9]+)\s*\]\]/gimu;
                    const array = [...guidKey.settings.templateview.matchAll(reg)];

                    array.forEach(
                        (value) =>
                            (template = template.replaceAll(
                                value[0],
                                `'&&${value.groups.field}&&'`
                            ))
                    );

                    template = `'${template}'`.split('&&');
                    viewAlias = 'view';
                    view = [`CONCAT(${template.join(' , ')})`, viewAlias];
                } else if (guidKey.settings.fieldview) {
                    const fieldView =
                        typeof guidKey.settings.fieldview === 'object'
                            ? guidKey.settings.fieldview.value
                            : guidKey.settings.fieldview;

                    view =
                        treeObject.AllFieldsGUID?.[fieldView]?.field ??
                        treeObject.FieldsGUID[fieldView]?.field;
                    viewAlias = view;
                }
            }
        }

        return { view, viewAlias };
    }

    /**
     * @private
     *
     * @param {{
     *      dictionaryWhere: object,
     *      parentFilter: object,
     *      systemWhere: object,
     *      where: object,
     *      parentName: string,
     *      pkName: string,
     *      view: string
     *      hierarchy: boolean,
     *      level: number
     * }} param0
     * @param {string} attribute
     *
     *
     * @returns {Promise<{
     *  cast: boolean,
     *  viewAlias?: string,
     *  query: string,
     *  viewNames?: string[],
     *  connectionField?: string,
     *  attributeFields?: string[],
     *  mergeName: string,
     *  additionalAttributes?: string[]
     * }>}
     */
    async getRefData(
        {
            dictionaryWhere,
            parentFilter,
            systemWhere,
            where,
            parentName,
            pkName,
            view,
            hierarchy,
            level,
        },
        attribute
    ) {
        const attributes = hierarchy
            ? [pkName, parentName, ...Object.keys(dictionaryWhere[attribute] ?? {})]
            : [pkName, ...(view ? [view] : []), ...(this.subFields || [])];

        // =============================== формируем localWhere для справочника ==============================
        const localWhere = { ['$and']: [this.getNeWhere(where, pkName) ?? {}] };

        if (!hierarchy) {
            !isEmptyObject(where ?? {}) && localWhere.$and.push(where);

            !isEmptyObject(dictionaryWhere[attribute] ?? {}) &&
                localWhere.$and.push(dictionaryWhere[attribute]);
        }

        localWhere.$and = localWhere.$and.filter((i) => !isEmptyObject(i));

        if (!localWhere.$and.length) delete localWhere.$and;
        // =============================== формируем localWhere для справочника ==============================

        const qoptions = {
            attributes,
            where: localWhere,
            group: attributes,
            withOutCount: true,
            withOutOrder: true,
            withOutRefs: true,
            hierarchy: false,
            level,
        };

        const { query } = await this.meta.query(this.id, qoptions);

        let localQuery = query.table.slice(0, -1);

        const keys = (this.subFields || []).map((field) => `${attribute}__${field}`);

        /** @type {string[] | string} */
        let viewNames = uniqueValues([pkName, view, ...this.subFields]);

        let connectionField = pkName;

        let attributeFields = uniqueValues([attribute, `${attribute}__${view}`, ...keys]);

        let additionalAttributes = [...attributeFields];

        let viewAlias = view;

        let mergeName = null;

        let cast = false;

        if (hierarchy) {
            /** @type {any} */
            const searchWhere = {};

            if (!isEmptyObject(systemWhere)) {
                searchWhere['$and'] ??= [];
                searchWhere['$and'].push(systemWhere);
            }
            if (!isEmptyObject(where[pkName])) {
                searchWhere['$and'] ??= [];
                searchWhere['$and'].push(where[pkName]);
            }

            localQuery = await this.connector.generateRecursive({
                parentFilter,
                attributes: Object.keys(dictionaryWhere[attribute] ?? {}),
                fieldsWhere: dictionaryWhere[attribute] ?? {},
                table: { table: query.table },
                fields: { pkName, parentName },
                where: searchWhere,
                level,
            });

            viewNames = ['nid'];
            connectionField = 'nid_child';
            attributeFields = [attribute];
            additionalAttributes = [attribute];
            viewAlias = null;
            mergeName = 'nid';
            cast = true;
        }

        return {
            query: localQuery,
            viewAlias,
            viewNames,
            connectionField,
            attributeFields,
            additionalAttributes,
            mergeName,
            cast,
        };
    }
}

module.exports = WithClass;
