const { uniqueValues, isEmptyObject } = require("../../../utils/services");
const BaseClass = require("./BaseBehavior.class");

/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../metadata-connector/services/metadata/Connector.class").Ifrom} Ifrom
 * @typedef {import("../../../metadata-connector/services/metadata/types").IWithOption} IWithOption
 * @typedef {import("../../../metadata-connector/services/metadata/types").IConnectionField} IConnectionField
 * @typedef {import("../types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../../../../core/db/types").TField} TField
 * @typedef {import("../types/index").IJoinOption} IJoinOption
 * @typedef {import("../types/index").ILevel} ILevel
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
class WithBehaviorClass extends BaseClass {
    constructor({ meta, connector, field, table, delimeter, logger, treeObject }) {
        super({ meta, table, field, delimeter, logger, treeObject });
        /** @type {IConnector} */
        this.connector = connector;
    }

    /**
     * @public
     * 
     * @param {{ guideConnector?: IConnector, viewName?: string }} param0 
     * @returns {Promise<boolean>}
     */
    async isValid({ guideConnector }) {
        return this.field.SQLQueryFormat === 'useWith' || this.field.useWith && this.connector.dbhash === guideConnector.dbhash;
    }

    /**
     * @param {string} viewName 
     * @returns {string}
     */
    generateViewName(viewName) {
        return [this.attribute, viewName].filter(Boolean).join(this.delimeter);
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

        const { columns = [], index = [], disableHierarchy } = settings || {};

        this.index = index;
        this.columns = columns;
        this.disableHierarchy = disableHierarchy;

        const viewAlias = this.generateViewName(viewName);

        this.id = typeof this.field?.ref === 'object' ? this.field.ref.value : this.field?.ref;

        this.isVisibleField = this.isVisible(settings, viewAlias);

        const treeObject = await this.meta.tableInfo(this.meta, this.id);

        this.guideFields = treeObject?.AllFieldsGUID || treeObject?.FieldsGUID;

        this.getConnectionFields();

        const { IdField, ParentField } = await this.meta.getSettings(this.id, treeObject);

        const pkName = IdField?.field;
        const parentName = ParentField?.field;

        const { view } = await this.getPkField(treeObject);

        const params = {
            dictionaryWhere: dictionaryWhere ?? {},
            systemWhere: systemWhere ?? {},
            where: where ?? {},
            parentName,
            viewName,
            pkName,
            view
        };

        return viewName
            ? this.pkData(params, attribute)
            : this.generate(params, attribute);
    }

    /**
     * @private
     * 
     * формирование подполей как измерений
     * 
     * @param {{ systemWhere: object, where: object, viewName: string }} param0 
     * @param {string} attribute 
     * @returns {Promise<IBehaviourOptions>}
     */
    async pkData({ systemWhere, where, viewName }, attribute) {
        const DEFAULT_CONNECTION_NAME = '__id__'

        const view = this.generateViewName(viewName);
        const attributes = [[viewName, DEFAULT_CONNECTION_NAME]];

        const subWhere = { $and: [] }
        where[view] && subWhere.$and.push({ [DEFAULT_CONNECTION_NAME]: where[view] });
        systemWhere[view] && subWhere.$and.push({ [DEFAULT_CONNECTION_NAME]: systemWhere[view] });

        !subWhere.$and?.length && delete subWhere.$and;

        /**
         * получим квери необходимое для формирования иерерахии 
         */
        const { table: query, fields: connectionFields } = await this.queryMetadata({
            connectionFields: this.connectionFields,
            isRecursion: false,
            attributes,
            where: subWhere
        });

        // так как мы используем подполе измерения то измерение на измерении уже быть какая либо фильтрация из за чего мы можем получить недостоверные даанные
        // поэтому под каждое подполе имеерт свою колонку и следовательно поле соединения нужно заменить на эту колонку
        connectionFields.forEach(({ left }) => left.field === attribute && (left.field = view));

        /** @type {IWithOption} */
        const withOption = {
            query,
            type: this.field.joinType,
            connectionFields,
            mapping: [{ left: { field: DEFAULT_CONNECTION_NAME }, right: { field: `"${view}"` } },],
        };

        const baseLevel = { attribute: view, field: view, ignoreAttribute: attribute, additionalAttributes: [view] };

        return {
            before: [{ withOption }],
            current: [{ ...baseLevel, where: {} }],
        }
    }

    /**
     * 
     * @param {*} param0 
     * @param {*} attribute 
     * @returns 
     */
    async generate(
        {
            dictionaryWhere,
            systemWhere,
            parentName,
            pkName,
            where,
            view
        },
        attribute
    ) {
        const isLeafHeararchy = !!this.field.subtotal || !!this.field.hierarchy;

        /**
         * получим текущий фильтр раскрытия
         */
        const sWhere = this.getFilter(systemWhere, attribute);

        /**
         * получим текущий уровень расскрытия
         */
        const level = this.getLvl({ where: {}, systemWhere, attribute, isVisible: this.isVisibleField });

        /**
         * получим пользовательский фильтр
         */
        const pkWhere = this.getFilter(where, attribute);
        /**
         * уставноим пользовательский филтр на pk field
         */
        const localWhere = pkWhere !== undefined ? { [pkName]: pkWhere } : {};

        const {
            additionalAttributes,
            connectionFields,
            mapping,
            query,
            type,
            cast,
        } = await this.getRefData(
            {
                hierarchy: isLeafHeararchy,
                systemWhere: sWhere,
                where: localWhere,
                dictionaryWhere,
                parentName,
                pkName,
                level,
                view,
            },
            attribute
        );

        const withOption = {
            attributeName: attribute,
            joinField: attribute,
            connectionFields,
            id: this.id,
            mapping,
            query,
            type,
            cast,
        };

        /** @type {IBehaviourOptions} */
        const result = {
            before: [{ withOption }],
            current: [{ additionalAttributes }],
        };

        return result;
    }

    /**
     * COMMENTS: перегруженная дичь прилепленная без понимания и смысла
     * нужно убрать но так как теперь это часть функционала то теперь нам с этим жить
     * данная релиазация это копипаст поэтому это делает ее еще более ужасной
     * 
     * @param {{
     *      dictionaryWhere: object,
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
     * @returns {Promise<IJoinOption>}
     */
    async getRefData(
        {
            dictionaryWhere,
            systemWhere,
            parentName,
            hierarchy,
            pkName,
            where,
            level,
            view,
        },
        attribute
    ) {
        const handler = this.getHandler({ hierarchy });

        return handler.apply(this, [{ level, dictionaryWhere, systemWhere, parentName, hierarchy, attribute, where, pkName, view }]);
    }

    /**
     * @param {{ hierarchy: boolean }} param0 
     * @returns 
     */
    getHandler({ hierarchy }) {
        return hierarchy ? this.getRecursiveLevel : this.getPlainLevel;
    }

    /**
     * получить инерархичные данные - основной сценарий использования
     * 
     * @returns {Promise<IJoinOption>}
     */
    async getRecursiveLevel({ pkName, parentName, dictionaryWhere, attribute, where, systemWhere, level }) {
        const attributes = [
            pkName,
            parentName,
            ...Object.keys(dictionaryWhere[attribute] ?? {})
        ];

        // =============================== формируем localWhere для справочника ==============================
        const localWhere = { ['$and']: [] };

        const neWhere = this.getNeWhere(where, pkName)?.[pkName] || {};
        for (const prefix in neWhere) {
            localWhere.$and.push({ [prefix]: neWhere[prefix].map((item => ({ [pkName]: item }))) })
        }
        const eqWhere = this.getFilterWithoutNe(where, pkName);

        // neWhere?.length && localWhere.$and.push(...neWhere);

        localWhere.$and = localWhere.$and.filter(i => !isEmptyObject(i));

        if (!localWhere.$and.length) delete localWhere.$and;
        // =============================== формируем localWhere для справочника ==============================

        /** @type {any} */
        const searchWhere = {};

        if (!isEmptyObject(systemWhere)) {
            searchWhere['$and'] ??= [];
            searchWhere['$and'].push(systemWhere);
        }
        if (!isEmptyObject(eqWhere)) {
            searchWhere['$and'] ??= [];
            searchWhere['$and'].push(where[pkName]);
        }

        const { table: query, fields: connectionFields } = await this.queryMetadata({
            connectionFields: this.connectionFields,
            dictionaryWhere: dictionaryWhere[attribute] ?? {},
            isRecursion: true,
            group: attributes,
            searchWhere,
            systemWhere,
            attributes,
            where,
            level,
        });

        const joinName = this.disableHierarchy ? '__child__' : '__id__';

        return {
            query,
            type: this.field.joinType,
            connectionFields,
            mapping: [
                { left: { field: joinName }, right: { field: attribute } },
                // { left: { name: '__parent__' }, right: { name: `${attribute}__parent__` } },
                // { left: { name: '__level__' }, right: { name: `${attribute}__level__` } },
            ],
            additionalAttributes: [
                attribute,
                // `${attribute}__parent__`,
                // `${attribute}__level__`
            ],
        };
    }

    /**
     * edge кейс когда иерархия отключена но хотят получить данные вместе с рефами
     * 
     * @param {*} param0 
     * @returns {Promise<IJoinOption>}
     */
    async getPlainLevel({ pkName, view, dictionaryWhere, attribute, where, systemWhere }) {
        const attributes = [
            pkName,
            ...(view ? [view] : []),
            ...(this.subFields || []),
            ...Object.keys(dictionaryWhere[attribute] || {})
        ];

        this.removeLevels(where);

        // =============================== формируем localWhere для справочника ==============================
        // const neWhere = this.getNeWhere(where, pkName)?.[pkName]?.$and ?? {};
        const localWhere = { ['$and']: [where, dictionaryWhere?.[attribute]] }

        localWhere.$and = localWhere.$and.filter(i => !isEmptyObject(i || {}));

        if (systemWhere) {
            localWhere.$and.push({ [pkName]: systemWhere })
        }

        if (!localWhere.$and.length) delete localWhere.$and;
        // =============================== формируем localWhere для справочника ==============================
        const { table: query, fields: connectionFields } = await this.queryMetadata({
            connectionFields: this.connectionFields,
            isRecursion: false,
            where: localWhere,
            group: attributes,
            attributes,
        });

        return {
            query,
            type: this.field.joinType,
            connectionFields,
            mapping: [
                { left: { field: pkName }, right: { field: attribute } },
            ],
            additionalAttributes: [attribute],
        };
    }

    /**
     * @private
     * 
     * @param {{ isRecursion: boolean, connectionFields: IConnectionField[], attributes: any[], where?: any, systemWhere?: any, searchWhere?: any, dictionaryWhere?: any, group?: string[], level?: number }} param0 
     * 
     * @returns {Promise<{ table: string, query: Ifrom, fields }>}
     */
    async queryMetadata({
        connectionFields,
        dictionaryWhere,
        searchWhere,
        systemWhere,
        attributes,
        isRecursion,
        where,
        group,
        level
    }) {
        const qoptions = {
            where,
            searchWhere,
            systemWhere,
            dictionaryWhere,

            connectionFields,

            isRecursion,
            isVisible: this.isVisibleField,

            group,
            level,
            attributes,
            hierarchy: false,

            withOutRefs: true,
            withOutCount: true,
            withOutOrder: true,
        };

        const { query, connectionFields: fields } = await this.meta.query(this.id, qoptions);

        return { table: query.table.slice(0, -1), query, fields }
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
                    //@ts-ignore
                    const reg = /\[\[\s*(?<field>[-_a-z0-9]+)\s*\]\]/gimu;
                    const array = [...guidKey.settings.templateview.matchAll(reg)];

                    array.forEach((value) => template = template.replaceAll(value[0], `'&&${value.groups.field}&&'`));

                    template = `'${template}'`.split('&&');
                    viewAlias = 'view';
                    view = [`CONCAT(${template.join(' , ')})`, viewAlias];
                } else if (guidKey.settings.fieldview) {
                    const fieldView =
                        typeof guidKey.settings.fieldview === 'object'
                            ? guidKey.settings.fieldview.value
                            : guidKey.settings.fieldview;

                    view = treeObject.AllFieldsGUID?.[fieldView]?.field ?? treeObject.FieldsGUID[fieldView]?.field;
                    viewAlias = view;
                }
            }
        }

        return { view, viewAlias };
    }
}

module.exports = WithBehaviorClass;