const Extensions = require('../../../core/class/Extensions.class');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');

const Metadata = new MetadataClass();

const ApiError = require("../../../core/exceptions/ApiError");

const { mergeDeep, isNil, isEmptyObject, arrayGenerator, uniqueValues } = require("../../utils/services");

const constants = require('../constants');

const { ref_extract } = require('../../metadata-cmp/util');

/**
 * @typedef {import('./type').IGetAllRefs} IGetAllRefs
 * @typedef {import('../../metadata-cmp/services/Metadata.service').IRefObj} IRefObj
 * @typedef {import('../select/types').ISettings} ISettings
 * @typedef {{ id?: IRefObj, key?: IRefObj }} IQueryRef
 * @typedef {import('../../metadata-cmp/services/metadata/source/type').default} LevelClassI
 */

// TODO
class QueryRefclass extends Extensions {
    /**
     * @param {{ console: (msg: string, meta?: any) => void }} logger 
     */
    constructor(logger) {
        super();

        this.looger = logger;
    }

    /**
     * Логгер
     * 
     * перегруженный метод с помощью которого можно получить логи из других сервисов или фронта
     * 
     * @public
     *
     * @param {object} meta 
     * @param {string} msg 
     * @returns {Promise<void>}
     */
    async console(msg, meta) {
        // SREDA-overload
    }

    /**
     * @public
     * 
     * @param {Object} param0 
     * @param {*} param0.rows 
     * @param {ISettings} param0.options 
     * @param {*} param0.treeObject 
     * @param {*} param0.refsToParse внешние зависимости по рефам
     * @param {string} param0.id
     * 
     * @returns 
     */
    async getLayerRefs({ rows, options, treeObject, refsToParse, id: parentId }) {
        const { refsForLoad } = await this.getRefsForLoad(options, treeObject, refsToParse);

        await this.console(`RefsForLoad`, { query: refsForLoad });

        let refs = {};
        let refFields = {};
        let viewField = {};
        if (!options.withOutRefs) {
            ({ refs, fields: refFields, viewField } = await this.getAllRefs({
                refs: refsForLoad,
                rows,
                parentId,
                options,
            }));
        }

        if (!isEmptyObject(refsToParse)) {
            const { refs: parsedRefs, refFields: parsedRefFields } = await this.getAllLocalRefs(refsToParse, rows);

            mergeDeep(refs, parsedRefs || {});
            mergeDeep(refFields, parsedRefFields || {});
        }

        return { refs, refFields, viewField }
    }

    /**
     * TODO вернуть функционал
     * 
     * @private
     * 
     * из массива данных вытаскиваем уже имеющиеся записи полей
     * маркером поля является __
     * в результате формируются ref и refFields
     * 
     * @param {Record<string, any>} refsToParse 
     * @param {object[]} rows 
     * @returns 
     */
    async getAllLocalRefs(refsToParse, rows) {
        const refs = {};
        const refFields = {};

        rows.forEach((row) => {
            for (const key in refsToParse) {
                const viewField = refsToParse[key];

                refs[key] ||= {};
                refs[key][row[key]] = row[`${key}__${viewField}`];

                refFields[key] ||= {};

                for (const rowKey in row) {
                    const check = rowKey.startsWith(`${key}__`);

                    refFields[key] ||= {};

                    if (check) {
                        const attr = rowKey.replace(`${key}__`, '');

                        refFields[key][row[key]] ||= {};
                        refFields[key][row[key]][attr] = row[rowKey];
                    }
                }
            }
        });

        return {
            refs,
            refFields,
            viewField: {}
        }
    }

    /**
     * @private
     * 
     * Собирает значения из rows в refs.
     *
     * @param {Object} refs - Ссылки.
     * @param {Object} rows - Строки.
     * 
     * @returns {{ refData: Record<string, Record<string, number>>, maskRefData: Record<string, Record<string, number>> }}
     */
    getRefValues(refs, rows) {
        /** @type {Record<string, Record<string, number>>} */
        const refData = {};
        /** @type {Record<string, Record<string, number>>} */
        const maskRefData = {};

        /** @type {Record<string, Record<string, number>>} */
        const hasRef = {};

        Object.keys(refs || {}).forEach((key) => {
            refData[key] = {};
            maskRefData[key] = {};
            hasRef[key] = {};
        });

        const gen = arrayGenerator(rows);

        /**
         * проходимся по рефам
         */
        for (const row of gen) {
            for (const fieldAlias in refs) {
                const value = row[fieldAlias];

                if (isNil(value)) continue;

                refData[fieldAlias][value] = (refData[fieldAlias][value] ?? 0) + 1;

                row[constants.noRefName]
                    ? maskRefData[fieldAlias][value] = 1
                    : hasRef[fieldAlias][value] = 1;
            }
        }

        for (const fieldAlias in maskRefData) {
            for (const value in maskRefData[fieldAlias]) {
                if (hasRef[fieldAlias][value]) delete maskRefData[fieldAlias][value];
            }
        }

        return { refData, maskRefData };
    }

    /**
     * @private
     * 
     * @param {ISettings} options 
     * @param {object} treeObject 
     * @param {Record<string, string>} refsToParse 
     * @returns {Promise<{ refsForLoad: Record<string, IRefObj> }>}
     */
    async getRefsForLoad(options, treeObject, refsToParse) {
        /** @type {Record<string, IRefObj>} */
        const refsForLoad = {};

        for (const field of /** @type {string[]} */(options.attributes)) {
            if (options.attributesForDel?.includes(field)) continue;

            const fieldName = this.getField(field);

            /** @type {IRefObj} */
            const ref = treeObject.Fields[fieldName]?.ref;

            const { value: fieldLink } = ref_extract(ref);

            if (options.maskFields?.includes(field)) {
                refsForLoad[field] = {};
            }

            if (!fieldLink) continue;

            const fieldAlias = this.getFieldName(field);

            if (fieldAlias) {
                if (options.settings?.fields[/** @type {string} */(fieldAlias)]) {
                    ref.fieldChildren = options.settings.fields[fieldAlias].children;
                }

                if (!refsToParse[fieldAlias]) {
                    refsForLoad[fieldAlias] = ref;
                }
            }
        }

        return { refsForLoad };
    }

    /**
     * @private
     * 
     * @param {string | string[] | { field: string }} val 
     */
    getFieldName(val) {
        if (Array.isArray(val)) return val[1];

        if (typeof val === 'object') return val.field;

        return val;
    }

    /**
     * @private
     * 
     * @param {string | string[] | { field: string }} val 
     */
    getField(val) {
        const [field] = this.getFieldName(val).split(constants.subDimensionDelimeter);

        return field;
    }

    /**
     * @private
     * 
     * @param {string} str 
     * @returns {boolean}
     */
    isSubDiv(str) {
        return !!~str.indexOf(constants.subDimensionDelimeter);
    }

    /**
     * @private
     * 
     *
     * @param {Object} param0
     * @param {string} param0.refName
     * @param {object} param0.refItem
     * @param {IRefObj} [param0.refItem.id]
     * @param {IRefObj} [param0.refItem.key]
     * @param {string[]} param0.PKsData
     * @param {string[]} [param0.fieldList]
     * @param {Record<string, number>} param0.maskPK
     * @param {string} param0.parentId
     * @param {boolean} param0.isSubDiv
     * @param {number} param0.level
     * 
     * @returns
     */
    async readRef({ refName, refItem: { id }, PKsData, fieldList = [], maskPK, parentId, isSubDiv, level }) {
        // TODO работает только с ключами 1 к 1, не поддерживает составные ключи
        const resultRef = {};
        const resultFields = {};

        const meta = await Metadata.getInstance(id, {});

        if (!meta || !PKsData?.length) {
            return this.generateDefaultRefs({ PKsData, maskPK, refName, parentId });
        }

        const idValue = typeof id === 'object' ? id.value : id;
        const treeObject = await meta?.tableInfo(meta, idValue);

        const { IdField, ViewField, ParentField, templateview, maxLevel } = await meta.getSettings(idValue, treeObject);

        const pkAlias = IdField.field;
        const viewAlias = this.generateTemplateView({ templateview, alias: ViewField.field });

        const viewName = ViewField.field;

        const attributes = uniqueValues([pkAlias, viewAlias, ParentField?.field, ...fieldList].filter(Boolean));

        await this.console(`PKS ${refName}`, { query: PKsData });

        if (attributes.length > 0 && !isSubDiv) {
            const options = {
                attributes,
                where: {
                    [pkAlias]: PKsData,
                },
                hierarchy: false,
                withOutCount: true,
                // withOutRefs: true,
                withOutOrder: true,
                level: typeof level === 'number' ? level + 1 : maxLevel,
            };

            /** @type {{rows: object[], refs: Record<string, Record<string, any>>}} */
            const { rows, refs } = await meta.read(idValue, options);

            rows.forEach((item) => {
                resultRef[item[pkAlias]] = item[/** @type {string} */ (viewName)];
                const fields = {};
                attributes.forEach((attr) => (fields[attr] = item[/** @type {string} */ (attr)]));

                for (const refField in refs) {
                    const refValue = refs[refField];
                    const originalValue = fields[refField];

                    if (originalValue) {
                        fields[refField] = refValue[originalValue] || originalValue;
                    }
                }

                resultFields[item[pkAlias]] = fields;
            });
        } else {
            PKsData.forEach((item) => (resultRef[item] = item));
        }

        const _ = await this.maskData({ id: idValue, refName, parentId, data: PKsData, viewAlias: viewName, resultRef, resultFields, maskRefData: maskPK });

        return { ref: resultRef, fields: resultFields, viewField: viewName };
    }

    /**
     * @private
     *
     * @param {{ templateview: string, alias: string }} param0
     * @returns {MayBeArray<string>}
     */
    generateTemplateView({ templateview, alias }) {
        if (!templateview?.trim()) return alias;

        const reg = /\[\[\s*(?<field>[-_a-z0-9]+)\s*\]\]/gimu;
        const array = [...templateview.matchAll(reg)];

        const template = array.reduce(
            (acc, value) => {
                acc = acc.replaceAll(value[0], `'&&${value.groups.field}&&'`);

                return acc;
            },
            templateview
        );

        const arr = `'${template}'`.split('&&');

        return [`CONCAT(${arr.join(' , ')})`, alias];
    }

    /**
     * @private
     * 
     * @param {{PKsData: string[], maskPK: Record<string, number>, refName: string, parentId: string}} param0 
     * @returns 
     */
    async generateDefaultRefs({ PKsData, maskPK, refName, parentId }) {
        const resultRef = {};
        const resultFields = {};

        PKsData.forEach(item => {
            resultFields[item] ||= {};
            resultFields[item][refName] = item;
            resultRef[item] = item;
        });

        const _ = await this.maskData({ id: null, refName, parentId, data: PKsData, viewAlias: refName, resultRef, resultFields, maskRefData: maskPK });

        return { ref: resultRef, fields: resultFields, viewField: refName };
    }

    /**
     * @private
     * 
     * Формирование refs из данных rows.
     *
     * @param {IGetAllRefs} param0
     *
     * @returns {Promise<Object>}
     */
    async getAllRefs({ refs, rows, parentId, options }) {
        this.looger.console(`Получаем ссылки по данным`);

        const { systemWhere, isReport } = options;

        /**
         * мара с key/value значениями
         * по типу: { 'scode_2023': {'R_01': 'Активы'} }
         */
        const { refData, maskRefData } = this.getRefValues(refs, rows);
        /**
         * мапа в которой указанно ключ -> все поля связанные с таким ключом
         * по типу: { 'scode_2023': {'R_01': { 'sparent': NULL, 'sname': 'Активы', 'tilda': '+' }} }
         */
        const fieldsData = {};
        /** 
         * мапа в которой указанно измерение -> поле представления
         * по типу: {'scode_2023': 'sname' }
         */
        const viewField = {};

        const result = { refs: refData, fields: fieldsData, viewField };
        const refKeys = Object.keys(refs);

        if (!refKeys.length) return result;

        const promise = refKeys.map(async (refName) => {
            const isSubDiv = this.isSubDiv(refName);

            const refItem = refs[refName];

            try {
                const PK = Object.keys(refData[refName]);
                const maskPK = maskRefData[refName] || {};

                const level = isReport
                    ? null
                    : typeof systemWhere?.[refName]?.__level__ === 'number'
                        ? systemWhere?.[refName]?.__level__
                        : -1;

                const resultReadRef = await this.readRef(
                    {
                        refName,
                        refItem: { id: refItem },
                        PKsData: PK,
                        fieldList: refItem.fieldChildren || [],
                        maskPK,
                        parentId,
                        isSubDiv,
                        level,
                    }
                );

                //@ts-ignore
                refData[refName] = resultReadRef.ref;
                fieldsData[refName] = resultReadRef.fields;
                viewField[refName] = resultReadRef.viewField;
            } catch (e) {
                throw ApiError.BadRequest(`Не смогли получить данные по ссылке ${refItem.name}: ${e.message}`, []);
            }
        });

        await Promise.all(promise);

        return result;
    }

    /**
     * @private
     * 
     * перегружаемый метод
     * 
     * @param {object} options
     * @param {string} options.id
     * @param {string} options.refName
     * @param {string} options.parentId
     * @param {any[]} options.data
     * @param {string | string[]} options.viewAlias
     * @param {object} options.resultRef
     * @param {object} options.resultFields
     * @param {object} options.maskRefData
     */
    async maskData(options) { }

    /**
     * @protected
     * 
     * WARNING
     * 
     * метод используется в перегрузке RLS service
     * для работы перегрузки getMaskFields
     * 
     * 
     * @param {string} str 
     * @returns {string}
     */
    sanitizeName(str) {
        const [val] = str.split(constants.subDimensionDelimeter);

        return val;
    }
}

module.exports = QueryRefclass;