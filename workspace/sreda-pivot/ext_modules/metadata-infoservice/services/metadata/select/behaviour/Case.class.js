const { isNil, isEmptyObject } = require('../../../../../utils/services');
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
 *
 *
 * @typedef {object} IGenerateCase
 * @property {object[]} rows
 * @property {Set<string>} aval
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
class CaseClass extends BaseClass {
    constructor({ refItem, meta, table, field, delimeter }) {
        super({ refItem, meta, table, field, delimeter });
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
    async query({ dictionaryWhere, systemWhere, where, settings }, attribute, viewName) {
        /**
         * нет иерархии и нет подполей как измерений то смысла в текущем поведении нет
         */
        if (!this.isHierarchy && !viewName) {
            return super.query(
                { dictionaryWhere, systemWhere, where, settings },
                attribute,
                viewName
            );
        }

        this.attribute = attribute;

        /**
         * флаг который говорит что нужно фильтровать по подполям измерения
         */
        this.isDictionaryWhere = !isEmptyObject(dictionaryWhere ?? {});

        /**
         * флаг который говорит что нужно просчитывать листовые елементы
         */
        this.isLeafHeararchy = this.refItem.subtotal;

        /**
         * id рефа метеданных
         */
        this.id = typeof this.refItem.ref === 'object' ? this.refItem.ref.value : this.refItem.ref;

        const viewAlias = `${this.attribute}${this.delimeter}${viewName}`;

        /**
         * флаг сообщающий что текущий расчет идет относительно измерения которое будет отображаться в UI
         */
        this.isVisibleField = this.isVisible(settings, attribute, viewAlias);

        const [item, treeObject] = await Promise.all([
            this.meta.getItem(this.id),
            this.meta.tableInfo(this.meta, this.id),
        ]);

        const { pkName, parentName, parentFilter } = this.getRefConfig(treeObject, item);

        /**
         * плохое решение перекладывать все данные в this
         * нужно будет переделать
         */
        this.pkName = pkName;
        this.parentName = parentName;
        this.parentFilter = parentFilter;

        this.viewName = viewName;

        this.where = where ?? {};
        this.systemWhere = systemWhere ?? {};
        this.dictionaryWhere = dictionaryWhere ?? {};

        return viewName ? this.pkData() : this.generate();
    }

    /**
     * формируем подполе как измерение
     *
     * @protected
     * @returns {Promise<IBehaviourOptions>}
     */
    async pkData() {
        const attributes = [this.viewName, this.pkName];
        const view = `${this.attribute}${this.delimeter}${this.viewName}`;

        const localWhere =
            this.where[view] !== undefined ? { [this.viewName]: this.where[view] } : null;
        const viewWhere =
            this.systemWhere[view] !== undefined ? { [view]: this.systemWhere[view] } : null;

        const qoptions = {
            attributes,
            where: localWhere,
            group: attributes,
            withOutCount: true,
            withOutRefs: true,
            withOutOrder: true,
            hierarchy: false,
        };

        const { rows } = await this.meta.read(this.id, qoptions);

        const { field, where: pkWhere } = this.generateField({ rows });

        return {
            before: [{ attribute: view, field }],
            current: [{ attribute: view, field: view, where: pkWhere }],
            after: [{ attribute: view, field: view, where: viewWhere }],
        };
    }

    /**
     * @protected
     * @returns {Promise<IBehaviourOptions>}
     */
    async generate() {
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
        const localWhere = structuredClone(this.dictionaryWhere[this.attribute] ?? {});
        if (!isEmptyObject(parentWhere ?? {})) {
            localWhere[this.pkName] = parentWhere;
        }
        // ================== пользоваьтельские фильтры ========================

        // ================== системные(технические) фильтры ========================
        const sWhere = {};
        if (this.systemWhere[this.attribute] !== undefined) {
            /**
             * если измерение отображается в таблицето мы ставим фильтр на родителя
             * иначе на primary key
             */
            const keyFiled = this.isVisibleField ? this.parentName : this.pkName;

            sWhere[keyFiled] = this.getFilter(this.systemWhere, this.attribute);
        } else {
            sWhere[this.parentName] = this.parentFilter;
        }
        // ================== системные(технические) фильтры ========================

        const neWhere = this.getSanitizedNeWhere(this.where, this.attribute);

        const filterWhere = this.dictionaryWhere[this.attribute] ?? {};

        const level = this.getLvl({
            where: {},
            systemWhere: this.systemWhere,
            attribute: this.attribute,
            isVisible: this.isVisibleField,
        });

        const [filterRows, systemRows] = await Promise.all([
            /**
             * фильтрации пользователя
             */
            (!isEmptyObject(localWhere) || !isEmptyObject(filterWhere)) &&
                this.getRefData({ dictionaryWhere: filterWhere, where: localWhere, level }),
            /**
             * системные фильтры
             */
            this.getRefData({ where: sWhere, recursiveWhere: neWhere, level }),
        ]);

        /** @type {Set<string>} */
        const avaliableValues = new Set();
        /** @type {Set<string>} */
        const marker = filterRows?.unique;
        if (marker) {
            systemRows.unique.forEach((key) => {
                if (marker.has(key)) {
                    avaliableValues.add(key);
                }
            });
        }

        /**
         * Eсли выдав в case-е замыкание на пустые значение попробовать отфильтровать по нему мы получим database error
         */
        const { field, hasValues } = this.generateCase({
            rows: systemRows.rows,
            aval: avaliableValues,
            needFiltering: !!marker,
        });

        return {
            before: [
                {
                    attribute: this.attribute,
                    field,
                },
            ],
            current: [
                {
                    attribute: this.attribute,
                    where: { [this.attribute]: hasValues ? systemRows.where : [] },
                },
            ],
            after: [],
        };
    }

    /**
     * @private
     *
     * @param {{ dictionaryWhere?: object, where: object, recursiveWhere?: object, level?: number }} param0
     * @returns {Promise<{ rows: string[], unique: Set<string>, where: string[] }>}
     */
    async getRefData({ dictionaryWhere, where, recursiveWhere, level }) {
        const attributes = [this.pkName, this.parentName, ...Object.keys(dictionaryWhere ?? {})];

        const localWhere = structuredClone(where ?? {});

        const qoptions = {
            attributes,
            where: localWhere,
            group: attributes,
            withOutCount: true,
            withOutRefs: true,
            withOutOrder: true,
            hierarchy: false,
            level,
        };

        const withChildren = {
            pkName: this.pkName,
            parentName: this.parentName,
            where: recursiveWhere,
        };

        /**
         * TODO: рефакторинг
         */
        qoptions.withChildren = withChildren;
        if (!isEmptyObject(dictionaryWhere ?? {}) || !this.isLeafHeararchy) {
            delete qoptions.withChildren;
        }
        if (!this.isHierarchy && !isEmptyObject(this.dictionaryWhere ?? {})) {
            qoptions.withChildren = withChildren;
        }
        if (
            !this.isHierarchy &&
            !isEmptyObject(this.dictionaryWhere ?? {}) &&
            !isEmptyObject(dictionaryWhere ?? {})
        ) {
            delete qoptions.withChildren;
        }

        const { rows } = await this.meta.read(this.id, qoptions);

        const unique = new Set();
        const uniqueWhere = new Set();

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            unique.add(row[this.pkName]);
            // unique.add(row[this.parentName]);
            (row.children || []).forEach((i) => unique.add(i));

            uniqueWhere.add(row[this.pkName]);
        }

        return {
            rows,
            unique,
            where: Array.from(uniqueWhere),
        };
    }

    /**
     * @param {IGenerateCase} param0
     * @returns {{ field: string, hasValues: boolean }}
     */
    generateCase({ rows, aval, needFiltering }) {
        const defaulValue = 'CASE when 1 <> 1 then 1 END';
        if (!rows.length) {
            return { field: defaulValue, hasValues: false };
        }

        let sql_select = `CASE `;

        /** @type { Record<string, string[]> } */
        const mapping = {};

        let type = 'string';

        let resultWhere = [];

        rows.forEach((row) => {
            type = typeof row[this.pkName];

            resultWhere = [].concat(resultWhere, row[this.pkName]);
            if (!isNil(row[this.parentName])) {
                resultWhere.push(row[this.parentName]);
            }

            const childs = mapping[row[this.pkName]] || [];
            (row.children || []).forEach((i) => {
                (!needFiltering || aval.has(i)) && childs.push(i);
            });

            /**
             * если это не иерархия значит у него не будет детей поэтому в искомые данные нужно докинуть саму запись
             */
            if (this.isHierarchy && !this.isLeafHeararchy && !this.isDictionaryWhere)
                childs.push(row[this.pkName]);

            mapping[row[this.pkName]] = childs;
        });

        /** заполнен ли кейс */
        let isFilled = false;
        for (const key in mapping) {
            /** @type {string | string[]} */
            let childs = mapping[key];

            if (!childs.length) continue;

            isFilled = true;

            if (typeof childs[0] === 'string') {
                childs = `'${childs.join("','")}'`;
            } else {
                childs = childs.join(',');
            }

            const then = type === 'string' ? `'${key}'` : key;
            sql_select += ` WHEN "${this.table}"."${this.attribute}" IN (${childs}) THEN ${then} `;
        }

        if (!isFilled) {
            return { field: defaulValue, hasValues: false };
        }

        return { field: (sql_select += `END`), hasValues: true };
    }

    /**
     * @private
     *
     * @param {{ rows: object[] }} param0
     * @returns {ILevel}
     */
    generateField({ rows }) {
        const view = `${this.attribute}${this.delimeter}${this.viewName}`;
        const defaulValue = 'CASE when 1 <> 1 then 1 END';

        if (!rows.length) {
            return {
                field: defaulValue,
                attribute: view,
                where: { [view]: [] },
            };
        }

        const where = new Set();

        let field = `CASE `;
        const mapping = {};

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            mapping[row[this.viewName]] ||= [];
            mapping[row[this.viewName]].push(row[this.pkName]);

            where.add(row[this.viewName]);
        }

        for (const key in mapping) {
            const isString = typeof mapping[key][0] === 'string';
            const keyVal = typeof rows[0][this.viewName] === 'string' ? `'${key}'` : +key;

            const arr = isString ? mapping[key].map((i) => `'${i}'`) : mapping[key];

            field += ` WHEN "${this.table}"."${this.attribute}" IN (${arr.join(
                ', '
            )}) THEN ${keyVal} `;
        }

        field += `END`;

        return {
            field,
            attribute: view,
            where: { [view]: Array.from(where) },
        };
    }

    /**
     * находим основной фильтра без $ne условий
     *
     * @param {*} where
     * @param {string} attribute
     * @returns
     */
    getFilterWithoutNe(where, attribute) {
        const rawWhere = this.getFilter(where, attribute);

        const searchWhere =
            typeof rawWhere === 'object' && rawWhere ? structuredClone(rawWhere) : rawWhere;

        if (typeof searchWhere === 'object' && !Array.isArray(searchWhere)) {
            for (const key in searchWhere) {
                searchWhere[key] = searchWhere[key].filter((i) =>
                    i?.['$ne'] !== undefined ? null : i
                );
                if (!searchWhere[key]?.length) {
                    delete searchWhere[key];
                }
            }
        }

        return searchWhere;
    }

    /**
     * получить фильтр очищенный от where и мутировать фильтры
     *
     * @param {*} where
     * @param {*} attribute
     * @returns
     */
    getSanitizedNeWhere(where, attribute) {
        const rawNeWhere = this.getNeWhere(where, attribute);
        const neWhere = isEmptyObject((rawNeWhere ?? {})?.[attribute] ?? {})
            ? {}
            : { ['$or']: [{ nid: rawNeWhere[attribute] }, { nparentid: rawNeWhere[attribute] }] };

        return neWhere;
    }
}

module.exports = CaseClass;
