const { isNil, isEmptyObject, iterateOverLargeArray, arrToMap, yeildEventLoop, uniqueValues } = require("../../../utils/services");
const BaseClass = require("./BaseBehavior.class");

/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../metadata-connector/services/metadata/Connector.class").Ifrom} Ifrom
 * @typedef {import("../types/index").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../types/index").ILevel} ILevel
*/

/**
 * 
 * 
 * @typedef {object} IGenerateCase 
 * @property {Map<string, object[]>} uniqueConnections
 * @property {Set<string>} [aval]
 * @property {boolean} needFiltering
 * @returns 
 */

/**
 * TODO Нужно почистить класс - слишком сильно разрастается
 */

/**
 * Поведение с иерархиями через кейсы
 * 
 * @class CaseClass
 * @implements {IQueryBuilerBehavior}
 */
class CaseBehaviorClass extends BaseClass {
    constructor({ meta, connector, table, field, delimeter, logger, treeObject }) {
        super({ meta, connector, table, field, delimeter, logger, treeObject });
    }

    /**
     * @public
     * 
     * @param {{ guideConnector?: IConnector, viewName?: string }} param0 
     * @returns {Promise<boolean>}
     */
    async isValid({ viewName }) {
        return !(!this.isHierarchy && !viewName)
    }

    /**
     * Формирование иерархичных опций
     * 
     * @public
     * @param {IBehaviourQueryOptions} param0 - Данные для SQL
     * @param {string} attribute - Атрибут
     * @param {string} viewName - Имя представления
     * 
     * @returns {Promise<object>}
     */
    async query({ dictionaryWhere, systemWhere, where, settings, previousLevels }, attribute, viewName) {
        const disableHierarchy = settings.disableHierarchy;

        /**
         * нет иерархии и нет подполей как измерений то смысла в текущем поведении нет
         */
        if (
            (!this.isHierarchy || disableHierarchy) && !viewName
        ) {
            return super.query({ dictionaryWhere, systemWhere, where, settings, previousLevels }, attribute, viewName);
        }

        this.previousLevels = previousLevels;

        this.attribute = attribute;

        /**
         * флаг который говорит что нужно фильтровать по подполям измерения
         */
        this.isDictionaryWhere = !isEmptyObject(dictionaryWhere ?? {});

        /**
         * флаг который говорит что нужно просчитывать листовые елементы
         */
        this.isLeafHeararchy = this.field.subtotal;

        /**
         * id рефа метеданных
         */
        this.id = typeof this.field?.ref === 'object' ? this.field.ref.value : this.field?.ref;

        this.viewAlias = [this.attribute, viewName].filter(Boolean).join(this.delimeter);

        /**
         * флаг сообщающий что текущий расчет идет относительно измерения которое будет отображаться в UI
         */
        this.isVisibleField = this.isVisible(settings, this.viewAlias);

        const treeObject = await this.meta.tableInfo(this.meta, this.id);

        const { IdField, ParentField, ViewField, fieldhierarchydefault, maxLevel } = await this.meta.getSettings(this.id, treeObject);

        const pkName = IdField?.field;
        const parentName = ParentField?.field
        const parentFilter = fieldhierarchydefault;

        this.maxLevel = maxLevel;

        this.guideFields = treeObject?.AllFieldsGUID || treeObject?.FieldsGUID;

        this.getConnectionFields();

        /**
         * плохое решение перекладывать все данные в this
         * нужно будет переделать
         */
        this.pkName = pkName;
        // TODO!!!!!!
        this.pkNameType = IdField?.type;
        this.parentName = parentName;
        // TODO!!!!!!
        this.parentNameType = ParentField?.type;
        this.parentFilter = parentFilter;

        this.viewName = viewName;

        // this.where = this.removeLevels(where ?? {});
        this.where = where;
        this.systemWhere = systemWhere ?? {};
        this.dictionaryWhere = dictionaryWhere ?? {};

        return viewName
            ? this.pkData()
            : this.generate();
    }

    /**
     * формируем подполе как измерение
     *
     * @private
     * @returns {Promise<IBehaviourOptions>}
     */
    async pkData() {
        // const attributes = [this.viewName, ...this.connectionAliases];
        const view = `${this.attribute}${this.delimeter}${this.viewName}`;

        /** @type {object} */
        const where = {
            ['$and']: [
                this.where[view] ? { [this.viewName]: this.where[view] } : {},
                this.systemWhere[view] ? { [this.viewName]: this.systemWhere[view] } : {}
            ]
        };

        if (!this.systemWhere[view] && !this.where[view]) {
            /**
             * данные которые уже лежат по данному атрибуту в таблице фактов
             */
            const columnData = await this.getValuesByAttribute(this.previousLevels, view);

            where.$and.push({ $or: columnData });
        }

        where.$and = where.$and.filter((i) => !isEmptyObject(i || {}));

        if (!where.$and.length) {
            delete where.$and;
        }

        const { uniqueConnections } = await this.getRefData({
            pkName: this.viewName,
            parentName: this.viewName,
            where,
            dictionaryWhere: where,
            recursiveWhere: {},
            hierarchy: false,
        });

        const { field, } = this.generateCase({
            uniqueConnections,
            needFiltering: false,
        });

        const ids = Array.from(uniqueConnections.keys());

        const pkWhere = { [view]: Array.from(ids) }

        // const { field, where: pkWhere } = await this.generateField({ rows, fieldName: view, alias: this.viewAlias });

        return {
            before: [{ attribute: view, field }],
            current: [{ attribute: view, field: view, where: pkWhere }],
        }
    }

    /**
     * @private
     * 
     * @protected
     * @returns {Promise<IBehaviourOptions>}
     */
    async generate(...args) {
        // ================== пользоваьтельские фильтры ========================
        /**
         * фильтры по иерархиям
         */
        const parentWhere = this.getFilterWithoutNe(this.where, this.attribute);

        /**
         * фильтр установленный пользователем
         * включает фильтры по подполям
         * и фильтры по иерархиям
         */
        // TODO выглядит как косяк но из за удачного пересечения условий работает без проблем
        // изучить риски и принять решение
        // это допустимое поведени или нужно будет править
        /**
         * фильтр пользователя по иерархии
         */
        const localWhere = structuredClone(this.dictionaryWhere[this.attribute] ?? {});
        if (!isEmptyObject(parentWhere ?? {})) {
            localWhere[this.pkName] = parentWhere;
        }
        // ================== пользоваьтельские фильтры ========================

        // ================== системные(технические) фильтры ========================
        const sWhere = {}
        if (this.systemWhere[this.attribute] !== undefined) {
            /**
             * если измерение отображается в таблицето мы ставим фильтр на родителя
             * иначе на primary key
             */
            const keyFiled = this.isVisibleField
                ? this.parentName
                : this.pkName;

            sWhere[keyFiled] = this.getSysFilter(this.systemWhere, this.attribute);
        } else {
            sWhere[this.parentName] = this.parentFilter;
        }
        // ================== системные(технические) фильтры ========================

        // фильтры $ne так как с ними сложно работать выделяются в отдельную фильрацию
        // и применяются непосредственно на самый нижний уровень запроса справочника
        // тем самым отрезая все доступные иерархии узла
        const neWhere = this.getSanitizedNeWhere(this.where, this.attribute);

        // фильтрация по подполям
        const filterWhere = this.dictionaryWhere[this.attribute] ?? {};

        const level = this.getLvl({ where: {}, systemWhere: this.systemWhere, attribute: this.attribute, isVisible: this.isVisibleField });

        const [filterRows, systemRows] = await Promise.all([
            /**
             * фильтрации пользователя
             */
            (
                !isEmptyObject(localWhere) ||
                !isEmptyObject(filterWhere)
            ) && this.getRefData({
                dictionaryWhere: filterWhere,
                where: localWhere,
            }),
            /**
             * системные фильтры
             */
            this.getRefData({
                where: sWhere,
                recursiveWhere: neWhere,
                level,
            })
        ]);

        /** @type {Set<string>} */
        const avaliableValues = new Set(
            Array.from(filterRows?.uniqueConnections?.entries() || []).flatMap(([_, key]) => key).map(({ key }) => key)
        );
        /** @type {boolean} */
        const needFiltering = !!filterRows?.rows?.length;

        /**
         * Eсли выдав в case-е замыкание на пустые значение попробовать отфильтровать по нему мы получим database error
         */
        const { field, hasValues } = this.generateCase({
            uniqueConnections: systemRows.uniqueConnections,
            aval: avaliableValues,
            needFiltering
        });

        const useWhere = hasValues && this.field.joinType !== 'left';

        const systemWhere = Array.from(systemRows.uniqueConnections.keys());

        // todo - реализация left join но нет времени ее тестировать
        let where = useWhere ? { [this.attribute]: systemWhere } : null;
        if (!where && !systemWhere?.length) {
            where = { [this.attribute]: systemWhere };
        }

        return {
            before: [
                {
                    attribute: this.attribute,
                    field
                }
            ],
            current: [
                {
                    attribute: this.attribute,
                    where: { [this.attribute]: hasValues ? systemWhere : [] },
                }
            ],
        };
    }

    /**
     * @protected
     * 
     * @param {*} where 
     * @param {*} attribute 
     * @returns 
     */
    getSysFilter(where, attribute) {
        const res = where[attribute];

        res.$eq = res.__parent__;

        delete res.__parent__;

        return res;
    }

    /**
     * TODO!!! требуется пересмотрение объектов фильтрации - их слишком много
     * 
     * @private
     * 
     * @param {Object} param0 
     * @param {string} [param0.pkName=this.pkName] 
     * @param {string} [param0.parentName=this.parentName] 
     * @param {object} [param0.where]
     * @param {object} [param0.dictionaryWhere]
     * @param {object} [param0.recursiveWhere]
     * @param {number} [param0.level=this.maxLevel] 
     * @param {boolean} [param0.hierarchy=this.isLeafHeararchy] 
     * 
     * @returns {Promise<{ rows: string[], uniqueConnections: Map<string, object[]> }> }}
     */
    async getRefData({ pkName = this.pkName, parentName = this.parentName, dictionaryWhere, where, recursiveWhere, level = this.maxLevel, hierarchy = this.isLeafHeararchy }) {
        // все аттрибуты используемые в запросе
        const attributes = uniqueValues([
            pkName,
            parentName,
            ...this.getAllProperties(dictionaryWhere ?? {}),
            ...this.getAllProperties(where ?? {}),
            ...this.connectionAliases
        ]).filter(Boolean);

        const localWhere = { ['$and']: [structuredClone(where ?? {}), structuredClone(recursiveWhere || {})] };

        localWhere.$and = localWhere.$and.filter(i => !isEmptyObject(i || {}));

        if (!localWhere.$and?.length) {
            delete localWhere.$and;
        }

        const qoptions = {
            attributes,
            where: localWhere,
            group: attributes,
            withOutCount: true,
            withOutRefs: true,
            withOutOrder: true,
            hierarchy: false,
            level
        };

        const withChildren = hierarchy
            ? {
                pk: { field: this.pkName, type: this.pkNameType },
                parent: { field: this.parentName, type: this.pkNameType },
                where: recursiveWhere,
                parentFilter: this.parentFilter,
                guideAttrs: this.connectionAliases || []
            }
            : null;

        /**
         * TODO: рефакторинг
         * 
         * по сути этот кусок кода ОЧЕНЬ чуствителен к передаваемым параметрам
         * поэтому как то его менять нельзя(на самом деле можно но будет больно)
         * только при 200% покрытии тестами
         * и безумной уверености в себя
         */
        qoptions.withChildren = withChildren
        if (
            !isEmptyObject(dictionaryWhere ?? {})
            || !this.isLeafHeararchy
        ) {
            delete qoptions.withChildren;
        }
        if (
            !this.isHierarchy
            && !isEmptyObject(this.dictionaryWhere ?? {})
        ) {
            qoptions.withChildren = withChildren;
        }
        if (
            !this.isHierarchy
            && !isEmptyObject(this.dictionaryWhere ?? {})
            && !isEmptyObject(dictionaryWhere ?? {})
        ) {
            delete qoptions.withChildren;
        }

        const { rows } = await this.meta.read(this.id, qoptions);

        /** @type {Map<string, object[]>} */
        const uniqueConnections = new Map();

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            const refs = [
                this.getRefs(row),
                ...(row.childrenFields || [])
                    .map((row) => this.getRefs(row))
            ];

            let arr = uniqueConnections.get(row[pkName]) || [];

            arr = [].concat(arr, refs);

            uniqueConnections.set(row[pkName], arr);

            await yeildEventLoop();
        }

        for (const key in uniqueConnections) {
            uniqueConnections.set(key, arrToMap(uniqueConnections[key], 'key'));

            await yeildEventLoop();
        }

        return {
            rows,
            uniqueConnections,
        }
    }

    /**
     * @private
     * 
     * @param {object} row 
     * @returns {{ ref: object, key: string }}
     */
    getRefs(row) {
        const ref = {};
        const arr = [];

        this.connectionAliases.forEach((alias) => {
            ref[alias] = row[alias];
            arr.push(row[alias]);
        });

        return { ref, key: arr.join('::') };
    }

    /**
     * @private
     * 
     * @param {IGenerateCase} param0 
     * @returns {{ field: string, hasValues: boolean }}
     */
    generateCase({ uniqueConnections, aval, needFiltering }) {
        const defaulValue = "CASE when 1 <> 1 then 1 END";
        if (!uniqueConnections.size) return { field: defaulValue, hasValues: false };

        let sql_select = `CASE`;

        let hasValues = true;

        for (const [pkValue, values] of uniqueConnections.entries()) {
            const type = typeof pkValue;

            const cases = [];
            values.forEach(({ key, ref: value }) => {
                const arr = [];

                if (needFiltering && !aval.has(key)) return;

                this.connectionAliases.forEach((alias) => {
                    const attribute = this.leftRightMapping[alias]?.field;
                    const type = this.leftRightMapping[alias]?.type?.toLocaleUpperCase() || 'TEXT';

                    const then = ['TEXT', 'STRING', 'VARCHAR', 'DATE', 'DATETIME', 'UUID'].includes(type) ? `'${value[alias]}'` : value[alias];

                    arr.push(`"${this.table}"."${attribute}" = ${then}`);
                })

                cases.push(arr.join(' AND '))
            });

            if (!cases.length) continue;

            sql_select += ` WHEN `

            hasValues = !!cases.length;

            sql_select += `(${cases.join(') OR (')})`;

            const then = type === 'string' ? `'${pkValue}'` : pkValue;

            sql_select += ` THEN ${then} `;
        }

        if (!hasValues) return { field: defaulValue, hasValues };

        return { field: sql_select += `END`, hasValues: true };
    }

    /**
     * @private
     * 
     * получить фильтр очищенный от where и мутировать фильтры
     * 
     * @param {*} where 
     * @param {*} attribute 
     * @returns 
     */
    getSanitizedNeWhere(where, attribute) {
        const rawNeWhere = this.getNeWhere(where, attribute)?.[attribute] || {};
        const neWhere = {};

        for (const prefix in rawNeWhere) {
            const ids = rawNeWhere[prefix];

            if (ids.length) {
                neWhere[prefix] = [this.pkName].map((key) => ids.map(id => ({ [key]: id }))).flat();
            }
        }

        return neWhere;
    }

    /**
     * @private
     * 
     * @param {Ifrom} from 
     * @param {string} attribute 
     */
    async getValuesByAttribute(from, attribute) {
        const attributes = this.connectionAliases.map(i => this.leftRightMapping[i]).map(i => i.field);

        const query = await this.connector.findSQL(structuredClone(from), { attributes, group: attributes });

        await this.logger.console(`выполняем оптимизационный запрос для получение всех активных id из факта`, { query })

        const rows = await this.connector.querySql(query, { type: 'SELECT' });

        const rightLeftMapping = Object.entries(this.leftRightMapping).reduce((acc, [key, value]) => {
            acc[value.field] = key;
            return acc;
        }, {});

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];

            rows[index] = attributes.reduce((acc, attr) => {
                const right = rightLeftMapping[attr];
                acc[right] = row[attr];
                return acc;
            }, {});

            await yeildEventLoop();
        }

        return rows;
    }
}

module.exports = CaseBehaviorClass;