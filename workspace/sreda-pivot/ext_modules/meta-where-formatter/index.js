const { isNil } = require('../utils/services');

const ApiError = require('../../core/exceptions/ApiError');
const { isEmptyObject } = require('../utils/services');

/**
 * @typedef {import('../../db/rls/types/WhereOptions').Where} Where
 */
/**
 * @import { IConnector } from '../../../../../metadata-connector/services/metadata/Connector.class'
 */

const EQUAL = '$eq';
const NOT_EQUAL = '$ne';
const LEVEL_KEY = '__level__';

//TODO переписать класс
class WhereFormater {
    /**
     * @public
     *
     * @param {*} where
     * @returns {boolean}
     */
    static hasIlike(where) {
        for (const key in where) {
            if (key === '$iLike' && where[key] !== '%%') return true;

            if (Array.isArray(where[key])) {
                if (where[key].some((val) => this.hasIlike(val))) {
                    return true;
                }
            } else if (typeof where[key] === 'object') {
                if (this.hasIlike(where[key])) return true;
            }
        }

        return false;
    }

    /**
     * @param {*} whereObj
     * @returns
     */
    getDictionaryParams(whereObj) {
        let dictionaryParams = {};
        let whereParams = {};

        for (const name in whereObj) {
            let value = whereObj[name];

            if (name.charAt(0) !== '$') {
                if (name.indexOf('.') > 0) {
                    dictionaryParams[name] = value;
                } else {
                    whereParams[name] = value;
                }
            } else {
                if (Array.isArray(value)) {
                    const dictionaryValues = [];
                    const whereValues = [];
                    for (const item of value) {
                        let values = this.getDictionaryParams(item);
                        if (Object.keys(values.dictionaryParams).length > 0)
                            dictionaryValues.push(values.dictionaryParams);
                        if (Object.keys(values.whereParams).length > 0)
                            whereValues.push(values.whereParams);
                    }

                    if (dictionaryValues.length > 0) dictionaryParams[name] = dictionaryValues;
                    if (whereValues.length > 0) whereParams[name] = whereValues;
                } else {
                    let values = this.getDictionaryParams(value);
                    if (Object.keys(values.dictionaryParams).length > 0)
                        dictionaryParams[name] = values.dictionaryParams;
                    if (Object.keys(values.whereParams).length > 0)
                        whereParams[name] = values.whereParams;
                }
            }
        }
        return { dictionaryParams, whereParams };
    }

    /**
     * @param {*} whereObj
     * @param {*} params
     * @param {*} conditions
     * @returns
     */
    getHavingParams(whereObj, params, conditions) {
        let newParams = {};
        for (const name in whereObj) {
            let value = whereObj[name];
            if (name.charAt(0) !== '$') {
                if (params.includes(name)) {
                    newParams['$and'] = Object.values(conditions[name]).map((val) => ({
                        [`${val}`]: value,
                    }));
                }
            } else {
                if (Array.isArray(value)) {
                    const newValues = [];
                    for (const item of value) {
                        const values = this.getHavingParams(item, params, conditions);
                        if (Object.keys(values).length > 0) newValues.push(values);
                    }
                    if (newValues.length > 0) newParams[name] = newValues;
                } else {
                    const values = this.getHavingParams(value, params, conditions);
                    if (Object.keys(values).length > 0) newParams[name] = values;
                }
            }
        }
        return newParams;
    }

    /**
     * @param {*} whereObj
     * @param {*} params
     * @returns
     */
    delHavingParams(whereObj, params) {
        let newParams = {};
        for (const name in whereObj) {
            let value = whereObj[name];
            if (name.charAt(0) !== '$') {
                if (!params.includes(name)) newParams[name] = value; //Никогда не добавляйте это условие в верхний if (name.charAt(0) !== '$') - иначе будет переполнение стека
            } else {
                if (Array.isArray(value)) {
                    const newValues = [];
                    for (const item of value) {
                        let values = this.delHavingParams(item, params);
                        if (Object.keys(values).length > 0) newValues.push(values);
                    }
                    if (newValues.length > 0) newParams[name] = newValues;
                } else {
                    let values = this.delHavingParams(value, params);
                    if (Object.keys(values).length > 0) newParams[name] = values;
                }
            }
        }
        return newParams;
    }

    /**
     * @param {*} whereObj
     * @param {*} attributesAggr
     * @param {*} flatWhere
     * @returns
     */
    replaceHavingParams(whereObj, attributesAggr, flatWhere) {
        const aggrConditions = {};
        const aggrField = attributesAggr.map((attr) => {
            if (!aggrConditions[attr.field]) aggrConditions[attr.field] = {};
            aggrConditions[attr.field][attr.alias] = `$${attr.func}("${attr.field}")$`;
            return attr.field;
        });

        const having = this.getHavingParams(whereObj, aggrField, aggrConditions);
        const where = this.delHavingParams(whereObj, aggrField);

        return { having, where };
    }

    /**
     * TODO нужен рефакторинг
     *
     * @param {*} whereObj
     * @returns
     */
    compressFlat(whereObj) {
        const newWhere = {};
        whereObj.forEach((option) => {
            Object.keys(option).forEach((params) => {
                newWhere[params] ??= {};
                if (!newWhere[params]?.['$or']) newWhere[params]['$or'] = [];
                if (!newWhere[params]?.['$and']) newWhere[params]['$and'] = [];

                if (option[params]?.['$and']) {
                    newWhere[params]['$and'] = [].concat(
                        newWhere[params]['$and'],
                        newWhere[params]['$or']
                    );

                    newWhere[params]['$or'] = [];
                }

                if (option[params]?.['$and']) {
                    newWhere[params]['$and'] = [].concat(
                        newWhere[params]['$and'],
                        Array.isArray(option[params]['$and'])
                            ? option[params]['$and']
                            : [option[params]['$and']]
                    );
                } else {
                    newWhere[params]['$or'] = [].concat(
                        newWhere[params]['$or'],
                        Array.isArray(option[params]) ? option[params] : [option[params]]
                    );
                }

                if (Array.isArray(newWhere[params]['$or']) && !newWhere[params]['$or'].length) {
                    delete newWhere[params]['$or'];
                }

                if (Array.isArray(newWhere[params]['$and']) && !newWhere[params]['$and'].length) {
                    delete newWhere[params]['$and'];
                }
            });
        });

        for (const param in newWhere) {
            if (
                newWhere[param]['$or']?.length &&
                newWhere[param]['$or'].every(
                    (i) => typeof i === 'string' || typeof i === 'number' || isNil(i)
                )
            ) {
                newWhere[param] = newWhere[param]['$or'];
                if (Array.isArray(newWhere[param]) && newWhere[param].length <= 1) {
                    [newWhere[param]] = newWhere[param];
                }
            }

            if (Array.isArray(newWhere[param]) && !newWhere[param]?.['$or']?.length) {
                delete newWhere[param]['$or'];
            }

            if (Array.isArray(newWhere[param]) && !newWhere[param]?.['$and']?.length) {
                delete newWhere[param]['$and'];
            }
        }

        return newWhere;
    }

    /**
     * @param {*} where
     * @returns
     */
    normalize(where) {
        const flatWhere = this.flat(where);
        return this.compressFlat(flatWhere);
    }

    /**
     * @param {*} whereObj
     * @param {*} previous
     * @returns
     */
    flat(whereObj, previous) {
        let flatParams = [];
        for (const name in whereObj) {
            let value = whereObj[name];
            if (name.charAt(0) !== '$') {
                if (previous === '$and') {
                    flatParams.push({ [name]: { [previous]: value } });
                } else {
                    flatParams.push({ [name]: value });
                }
            } else {
                if (Array.isArray(value)) {
                    for (const item of value) {
                        let values = this.flat(item, name);
                        flatParams = [].concat(flatParams, values);
                    }
                } else {
                    let values = this.flat(value, name);
                    flatParams = [].concat(flatParams, values);
                }
            }
        }
        return flatParams;
    }

    /**
     * Очистка условий WHERE (Имеет рекурсию).
     *
     * @param { Object } whereObj - Объект с WHERE условиями для sequelize ORM.
     * @param { Array } listFields - Список для фильтрации параметров WHERE.
     *
     * @returns - Мутированный объект с отфильтрованными для WHERE условиями.
     */
    clear(whereObj, listFields) {
        for (const attributeName in whereObj) {
            if (Array.isArray(whereObj[attributeName])) {
                whereObj[attributeName] = whereObj[attributeName].filter(
                    (attr) => !isNil(attr) && !listFields.includes(Object.keys(attr)?.[0])
                );
                // eslint-disable-next-line guard-for-in
                for (const attrItem in whereObj[attributeName]) {
                    // eslint-disable-next-line no-await-in-loop
                    const tempWhere = this.clear(whereObj[attributeName][attrItem], listFields);
                    whereObj[attributeName][attrItem] = tempWhere;
                }
                // if (!whereObj[attributeName]?.length) delete whereObj[attributeName];
            }
        }
        return whereObj;
    }

    /**
     * @param {*} whereObj
     * @returns
     */
    dictionary(whereObj) {
        const flatDictionaryWhere = this.flat(whereObj);
        let dictionaryWhere = this.compressFlat(flatDictionaryWhere);

        const dictionaryFields = {};
        for (const fieldName in dictionaryWhere) {
            const [fn, dictionaryFieldName] = fieldName.split('.');

            if (!dictionaryFields[fn]) dictionaryFields[fn] = {};
            dictionaryFields[fn][dictionaryFieldName] = dictionaryWhere[fieldName];
        }

        return dictionaryFields;
    }

    /**
     * @param {*} whereObj
     * @param {*} params
     * @returns
     */
    replace(whereObj, params) {
        let newParams = {};
        for (const name in whereObj) {
            let value = whereObj[name];
            if (name.charAt(0) !== '$') {
                if (params[name]?.[value]) newParams[name] = params[name]?.[value].where;
                else newParams[name] = value;
            } else {
                if (Array.isArray(value)) {
                    const newValues = [];
                    for (let i = 0; i < value.length; i++) {
                        const item = value[i];

                        const values = this.replace(item, params);
                        newValues.push(values);
                    }
                    newParams[name] = newValues;
                } else {
                    newParams[name] = this.replace(value, params);
                }
            }
        }
        return newParams;
    }

    /**
     * Извлечение пользовательских фильтров.
     *
     * @param { Object } options - параметры.
     *
     * @returns { string[] } - Массив пользовательских фильтров.
     */
    extractUserFilters(options) {
        // {
        //     $or: [
        //       {
        //         "ter_struct.nosb": {
        //           $gt: 100,
        //         },
        //       },
        //     ],
        //   }

        const filterList = options?.where?.['$and'];
        const usersFilters = [];

        if (filterList !== undefined) {
            filterList.forEach((filter) => {
                const filters = filter['$or'].flatMap((filter) => {
                    const fieldValue = Object.values(filter)[0];

                    if (typeof fieldValue === 'object') {
                        const fieldName = Object.keys(filter)[0];

                        return { [fieldName]: fieldValue };
                    }

                    return [];
                });
                usersFilters.push(...filters);
            });
        }

        return usersFilters;
    }

    /**
     * Формировщик фильтров для логики представления.
     *
     * @param {{ filters: Array, usedFilters: Array }} usersFilters - Отборные пользовательские фильтры.
     *
     * @returns {Array<Object>} - Сформированные фильтры для логики представления.
     */
    formatFiltersForView(usersFilters) {
        const formatedUsersFilters = [];

        usersFilters.filters.forEach((filter) => {
            const key = Object.keys(filter)[0];
            const viewKey = key.replace('.', '__');
            // Сохраняем фильтры в нужном формате
            formatedUsersFilters.push({ [viewKey]: filter[key] });
            // Вносим значения для дальнейшей очистки options.where
            usersFilters.usedFilters.push(key);
        });

        return formatedUsersFilters;
    }

    /**
     * Очистка полей первого аргумента.
     *
     * @param {Object} whereObj - Объект с WHERE условиями.
     * @param {Object} params
     *
     * @returns { Object }
     */
    delete(whereObj, params) {
        let newParams = {};
        for (const name in whereObj) {
            let value = whereObj[name];
            if (name.charAt(0) !== '$') {
                if (!params[name]?.[value]) newParams[name] = value;
            } else {
                if (Array.isArray(value)) {
                    const newValues = [];
                    for (const item of value) {
                        let values = this.delete(item, params);
                        if (Object.keys(values).length > 0) newValues.push(values);
                    }
                    if (newValues.length > 0) newParams[name] = newValues;
                } else {
                    let values = this.delete(value, params);
                    if (Object.keys(values).length > 0) newParams[name] = values;
                }
            }
        }
        return newParams;
    }

    /**
     * проходит по объекту where и ищет был ли передан __level__
     *
     * @param {*} where
     * @returns
     */
    isLvlSend(where) {
        if (Array.isArray(where)) {
            return where.some((item) => this.isLvlSend(item));
        }

        if (typeof where === 'object') {
            for (const key in where) {
                const val = where[key];

                if (typeof val === 'object') {
                    const check = this.isLvlSend(val);

                    if (check) {
                        return check;
                    }
                }

                if (key === LEVEL_KEY) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * парсит объект находит в нем __level___ поля и формиурет ddl для формата orm
     *
     * @param {Where} where
     * @param {string} prefix
     */
    parseWhere(where, prefix) {
        if (Array.isArray(where)) {
            return where.map((item) => this.parseWhere(item, prefix));
        }

        if (typeof where === 'object') {
            /** @type {Record<string, any>} */
            let res = {};
            for (const key in where) {
                const val = where[key];
                if (typeof val === 'object') {
                    res[key] = this.parseWhere(val, prefix);
                }

                if (key === NOT_EQUAL) {
                    res[NOT_EQUAL] = val;
                }

                if (key === EQUAL) {
                    res[EQUAL] = val;
                }

                if (key === LEVEL_KEY) {
                    res = { [`${prefix}${this.getLvl({ lvl: val })}`]: res };
                }
            }

            return res;
        }

        return where;
    }

    /**
     * @public
     *
     * @param {{ lvl?: number, isVisible?: boolean }} param
     * @returns {number}
     */
    getLvl({ lvl, isVisible }) {
        let level = typeof lvl !== 'number' ? 0 : lvl + 1;

        if (level < 0) {
            throw ApiError.BadRequest(`Передан отрицательный уровень раскрытия иерархии`);
        }

        if (!isVisible) {
            level -= 1;
            level = level > 0 ? level : 0;
        }

        return level;
    }

    /**
     * @public
     *
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
     * @public
     *
     * @param {*} where
     * @param {*} attribute
     * @returns
     */
    getFilter(where, attribute) {
        return where?.[attribute]?.__parent__ ?? where?.[attribute];
    }

    /**
     * очистить where от $eq услоавий заменив их просто на значения
     *
     * @public
     *
     * @param {*} where
     * @returns
     */
    sanitizeWhere(where) {
        if (where[EQUAL] !== undefined) return where[EQUAL];

        for (const key in where) {
            if (Array.isArray(where[key])) {
                where[key] = where[key].map((i) => this.sanitizeWhere(i));
            } else if (where[key] && typeof where[key] === 'object') {
                where[key] = this.sanitizeWhere(where[key]);
            }
        }

        return where;
    }

    /**
     * @public
     *
     * находим основной фильтра с $ne условиями
     *
     * @param {*} where
     * @param {string} attribute
     * @returns
     */
    getNeWhere(where, attribute) {
        const search = {};

        for (const prefix in where?.[attribute] ?? {}) {
            const res = this.getNeWhereRecursive(where[attribute][prefix] || {}).flat(Infinity);

            search['$and'] = res;
        }

        return isEmptyObject(search) ? search : { [attribute]: search };
    }

    /**
     * @private
     */
    getNeWhereRecursive(where) {
        if (Array.isArray(where)) {
            return where.map((item) => this.getNeWhereRecursive(item));
        }

        if (typeof where === 'object') {
            const res = [];
            for (const key in where) {
                const value = where[key];

                if (key === NOT_EQUAL) {
                    res.push({ [NOT_EQUAL]: value });
                }

                if (typeof value === 'object') {
                    res.push(this.getNeWhereRecursive(value));
                }
            }

            return res;
        }

        return [];
    }

    /**
     *
     * удалить все __level__ свойства из объекта
     *
     * @param {*} where
     * @returns
     */
    removeLevel(where) {
        if (Array.isArray(where)) {
            return where.map((item) => this.removeLevel(item));
        }

        if (typeof where === 'object') {
            const obj = {};
            for (const key in where) {
                if (key === '__level__') {
                    delete where[key];

                    continue;
                }

                obj[key] = this.removeLevel(where[key]);
            }

            return obj;
        }

        return where;
    }
}

module.exports = WhereFormater;
