/**
 * @typedef {import('../../../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 * @typedef {import("../../../metadata-cmp/services/metadata/source/type/index").default} LeveClassI
 * @typedef {import("../types").IBehaviourQueryOptions} IBehaviourQueryOptions
 * @typedef {import("../types").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../types").IBehaviourOptions} IBehaviourOptions
 * @typedef {import('../types').ILevel} ILevel
 */

const { isEmptyObject, isNil, hop } = require('../../../utils/services');

const MemorySaveInstance = require("../../../../core/services/memory-save");
const BaseBehaviorClass = require('../field/BaseBehavior.class');

/**
 * Поведение без иерархий
 */
class ViewSubFieldClass extends BaseBehaviorClass {
    constructor({ field, meta, table, connector, delimeter, logger, treeObject }) {
        super({ field, meta, table, connector, delimeter, logger, treeObject });

        this.connector = connector;
        this.logger = logger;
    }
    /**
     * @public
     * 
     * @param {{ guideConnector?: IConnector, viewName?: string }} param0 
     * @returns {Promise<boolean>}
     */
    async isValid({ }) {
        // проверим что выбрат тип соединения
        const isView = this.field.SQLQueryFormat === 'useView';

        // проверим что выбрат есть на чем строить это соединение
        this.maxLevel = await this.getLevelsForAttribute(this.table, this.field.field); // максимальный

        return isView && this.maxLevel > 0;
    }

    /**
     * @private
     * 
     * @param {Object} param0
     * @param {object} param0.where
     * @param {string} param0.attribute
     * @param {Set<number>} param0.arr
     * 
     * @returns 
     */
    static getLevelAttributes({ where, attribute, arr }) {
        if (!where) return;

        if (Array.isArray(where)) {
            return where.map((item) => this.getLevelAttributes({ where: item, attribute, arr }));
        }

        if (typeof where === 'object') {
            if (typeof where['__level__'] === 'number') {
                arr.add(where['__level__']);
            }

            for (const key in where) {
                return this.getLevelAttributes({ where: where[key], attribute, arr });
            }
        }

        return;
    }

    /**
     * 
     * @param {object} where 
     * @param {string} attribute lt 
     * @returns 
     */
    static parseWhere(where, attribute) {
        if (!where) return where;

        if (Array.isArray(where)) {
            return where.map((item) => this.parseWhere(item, attribute));
        }

        if (typeof where === 'object') {
            if (typeof where['__level__'] === 'number') {
                const lvl = where['__level__'];

                delete where['__level__'];

                if (hop(where, '$ne')) {
                    const ne = structuredClone(where.$ne);
                    delete where.$ne;

                    where.$or ||= [];
                    where.$or.push({ $ne: ne }, { '$is': null });
                }

                return { [`${attribute}__lvl_${lvl}`]: where };
            }

            for (const key in where) {
                where[key] = this.parseWhere(where[key], attribute);
            }

            return where;
        }

        return where;
    }

    /**
     * Формирование рекурсивных опций
     * 
     * @private
     * 
     * @param {IBehaviourQueryOptions} options - Данные для SQL
     * @param {string} attribute - Атрибут
     * @param {string} viewName - Имя представления
     * 
     * @returns {Promise<object>}
     */
    async subQuery(options, attribute, viewName) {
        const { where, systemWhere = {}, dictionaryWhere, settings } = options;

        const isReport = settings?.isReport || false;

        const viewAlias = [attribute, viewName].filter(Boolean).join(this.delimeter);

        /**
         * флаг сообщающий что текущий расчет идет относительно измерения которое будет отображаться в UI
         */
        this.isVisibleField = this.isVisible(settings, viewAlias);

        this.maxLevel = await this.getLevelsForAttribute(this.table, this.field.field); // максимальный

        const localSystemWhere = systemWhere[attribute]?.__parent__ ?? systemWhere[attribute] ?? { $not: null };
        // уровень по которому идет фильтрация раскрытия иерархий
        const level = systemWhere[attribute]?.__level__ || 0;

        //уровень который будет отображаться
        let displayLevel = this.getLvl({ where: {}, systemWhere, attribute: attribute, isVisible: true });
        if (!this.isVisibleField) {
            displayLevel -= 1
            if (displayLevel < 0) {
                displayLevel = 0;
            }
        };

        if (displayLevel >= this.maxLevel) {
            const lWhere = !isEmptyObject(where[attribute] ?? {}) ? { [attribute]: where[attribute] } : {}

            return {
                before: [
                    {
                        attribute: this.field.field,
                        field: this.field.value,
                        //условие выброс - при такой записи будет запрос типа `SELECT * FROM table WHERE 1 <> 1` и не вернется данных
                        where: this.isHierarchy ? { [attribute]: [] } : lWhere
                    }
                ]
            }
        }

        const searchAttr = new Set([displayLevel]);

        ViewSubFieldClass.getLevelAttributes({ where: { $and: [where[attribute], systemWhere[attribute]] }, attribute, arr: searchAttr });

        ViewSubFieldClass.parseWhere(where[attribute] || {}, attribute);

        const treeObject = await this.meta.tableInfo(this.meta, this.id);

        const check = await this.isValidForQuery({ level, treeObject, attribute });
        if (check) return check;

        const { IdField } = await this.meta.getSettings(this.id, treeObject)

        const lWhere = {
            ['$and']: [
                where[attribute],
                {
                    ['$and']: [
                        { [`${attribute}__lvl_${level || 0}`]: localSystemWhere || { $ne: null } },
                        { [`${attribute}__lvl_${displayLevel || 0}`]: { $ne: null } }
                    ]
                }
            ]
        };

        if (!isEmptyObject(dictionaryWhere[attribute] || {})) {
            const { keys } = await this.getRows({ where: dictionaryWhere[attribute] ?? {}, pk: IdField });

            lWhere.$and.push({ [attribute]: keys });
        }

        lWhere.$and = lWhere.$and.filter(i => !isEmptyObject(i || {}));

        !lWhere.$and.length && delete lWhere.$and;

        // уровень вложенности для обрабатываемого атрибута:
        this.maxLevel = await this.getLevelsForAttribute(this.table, this.field.field); // максимальный

        await this.logger.console(`Определен максимальный уровень денормализации maxLevel: ${this.maxLevel}`);

        /** @type {ILevel} */
        const mainField = { attribute: this.field.field, field: this.field.value, where: lWhere };
        /** @type {ILevel[]} */
        const values = Array.from(searchAttr).map((attr) => ({ attribute: `${attribute}__lvl_${attr}`, field: `${attribute}__lvl_${attr}`, where: {}, }));

        let currentField;

        if (this.isVisibleField) {
            if (isReport) {
                currentField = [{ attribute: this.field.field, field: this.field.field }];
            } else {
                currentField = [{ attribute: this.field.field, field: `${attribute}__lvl_${displayLevel}` }];
            }
        } else {
            currentField = [{ attribute: this.field.field }];
        }

        return {
            before: [mainField, ...values],
            current: currentField,
        };
    }

    /**
     * Формирование рекурсивных опций
     * 
     * @public
     * @param {IBehaviourQueryOptions} options - Данные для SQL
     * @param {string} key - Атрибут
     * @param {string} viewName - Имя представления
     * 
     * @returns {Promise<object>}
     */
    async query(options, key, viewName) {
        const { before, current, after } = await this.subQuery(options, key, viewName);

        return { before, current, after };
    }

    /**
     * @protected
     * 
     * получить максимальное количество уровней
     * 
     * @param {string} table
     * @param {string} attribute 
     * @returns {Promise<number>}
     */
    async getLevelsForAttribute(table, attribute) {
        const key = `denorm_levels_id:${this.id}_${attribute}_${table}`

        let result = await MemorySaveInstance.get(key);

        if (!isNil(result)) {
            return +result || 0;
        }

        const fields = await this.connector.model(table);

        result = Object.keys(fields).filter((columnName) => columnName.startsWith(`${attribute}__lvl`)).length;

        await MemorySaveInstance.set(key, result, { isLocal: false });

        return result;
    }
}

module.exports = ViewSubFieldClass;