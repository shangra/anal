const { Op } = require('sequelize');
const Extensions = require('../class/Extensions.class');

/**
 * @typedef {{
 *     searchOff?: boolean,
 *     force?: boolean,
 *     order?: string[][],
 *     group?: string[],
 *     limit?: number,
 *     offset?: number,
 *     all?: boolean
 * }} QueryData
 */
/**
 * @typedef {{
 *     force?: boolean,
 *     searchOff?: boolean
 * }} Options
 */

/**
 * @class QueryDto
 * @extends {Extensions}
 */
class QueryDto extends Extensions {
    #sourceQuery;
    searchOff;

    static orderDirection = {
        desc: true,
        asc: true,
    };

    static getModel;

    /**
     * @constructor
     *
     * @param {QueryData} queryData
     * @param {Options} [options={}]
     */
    constructor(queryData, { force = false, searchOff = false } = {}) {
        super();
        this.force = queryData?.force ?? force ?? false;
        this.#sourceQuery = queryData;
        this.where = {};
        if (queryData.order !== undefined) {
            this.order = /** @type {typeof QueryDto} */ (
                this.constructor
            ).sanitizeOrderParams(queryData.order);
        }
        if (queryData.group !== undefined) {
            this.group = queryData.group;
        }
        if (queryData.limit !== undefined) {
            this.limit = queryData.limit;
        }
        if (queryData.offset !== undefined) {
            this.offset = queryData.offset;
        }
        if (queryData.all !== undefined) {
            this.all = queryData.all;
        }

        // при спреде эти свойства не попадают в результат
        Object.defineProperties(this, {
            searchOff: {
                value: queryData?.searchOff ?? searchOff ?? false,
                configurable: true,
                enumerable: false,
            },
        });
    }

    // валидация поля order
    static sanitizeOrderParams(orderOptions) {
        let order = [];

        if (!Array.isArray(orderOptions)) {
            return order;
        }

        const model = this.getModel?.();

        if (model) {
            const attributes = model.getAttributes();
            order = orderOptions.filter((opt) => {
                if (!Array.isArray(opt)) {
                    return false;
                }
                const [field, direction] = opt;
                const isValidOrderOptions = !!(
                    this.orderDirection[direction?.toLowerCase()] &&
                    attributes[field]
                );
                return isValidOrderOptions;
            });
        } else {
            console.error(
                'Не определен метод getModel в query-dto, order не добавлен',
                orderOptions
            );
        }
        return order;
    }

    async getSourceQuery() {
        return this.#sourceQuery;
    }

    async getWhereParams(queryData) {
        const whereParams = {};
        if (queryData.where?.markdel !== undefined) {
            switch (queryData.where?.markdel) {
                case '10':
                case '01':
                case 10:
                    whereParams.markdel = [0, 1];
                    break;
                case '0':
                case '1':
                case 1:
                case 0:
                    whereParams.markdel = Number(queryData.where.markdel);
                    break;
                default:
                    whereParams.markdel = 0;
            }
        }

        // фильтрация по имени и описанию
        // если параметр searchOff === true, не добавляется в объект
        if (
            !this.searchOff &&
            queryData.where?.search &&
            queryData.where?.search !== ''
        ) {
            const { search } = queryData.where;

            const currentIdOptions = queryData.where.id;
            const foundIds = await this.search(search);

            // если метод search перегружен и возвращает данные, расширяем опции where.id
            if (foundIds) {
                const mergedIdOptions = QueryDto.mergeInternalParams(
                    foundIds,
                    currentIdOptions
                );
                whereParams.id = mergedIdOptions;
            }
        }

        // фильтрация по диапазонам значений
        if (
            queryData.where?.$ranges !== undefined &&
            queryData.where?.$ranges.length > 0
        ) {
            queryData.where?.$ranges.forEach((item) => {
                if (item.type === 'date' || item.type === 'datetime') {
                    if (item?.from && item.from !== '') {
                        if (!whereParams[item.field])
                            whereParams[item.field] = {};
                        const dateFrom = new Date(item.from);
                        whereParams[item.field][Op.gte] = dateFrom;
                    }
                    if (item?.to && item.to !== '') {
                        if (!whereParams[item.field])
                            whereParams[item.field] = {};
                        const dateTo = new Date(item.to);
                        // прибавляем день, чтобы фильтровать по дате включительно
                        dateTo.setDate(dateTo.getDate() + 1);
                        whereParams[item.field][Op.lte] = dateTo;
                    }
                }
            });
        }

        return whereParams;
    }

    /**
     * @param {QueryData} query
     * @param {Options} [options={}]
     * @returns {Promise<Readonly<QueryDto>>}
     */
    static async normalizeQuery(query, { force, searchOff } = {}) {
        if (typeof query !== 'object') {
            throw Error('Неверный формат данных в query-dto');
        }
        // если данные уже проходили через dto и флаг force не поменялся возвращаем их же
        if (
            query instanceof this &&
            ((query?.force === force && query.searchOff === searchOff) ||
                (force === undefined && searchOff === undefined))
        ) {
            return query;
        }

        // если при создании dto передан экзепляр класса dto и force или searchOff поменял значение,
        // используем исходный query объект из #sourceQuery
        const queryData =
            query instanceof this
                ? await query.getSourceQuery()
                : { ...query, force: undefined, searchOff: undefined };

        const newInstance = new this(queryData, { force, searchOff });

        newInstance.where = await newInstance.getWhereParams(queryData);

        // объект нельзя изменять извне
        return Object.freeze(newInstance);
    }

    // //абстрактный метод, перегружается расширением adminpanel-search
    async search(searchQuery) {
        return null;
    }

    // приоритет при мердже имеют options2
    static mergeOptions(options1, options2) {
        if (typeof options1 !== 'object' || typeof options2 !== 'object') {
            throw new Error('Неверный формат данных');
        }

        const where = this.mergeWhereOptions(options1.where, options2.where);

        const resultOptions = {
            ...options1,
            ...options2,
            where,
        };
        // удаляем поля инстанса query если они есть, чтоб при спреде они не попали в запрос к базе данных
        // todo добавить enumerable этим параметрам (чтобы при спреде они не учитывались) и убрать удаление
        delete resultOptions.search;
        delete resultOptions.getWhereParams;
        return resultOptions;
    }

    static parseParamInto(intoData, param) {
        if (typeof intoData !== 'object') {
            throw new Error('Неверный формат данных');
        }

        let result = { ...intoData };

        // если значение строка или массив добавляем в поле [Op.in]
        if (typeof param === 'string' || Array.isArray(param)) {
            result[Op.in] =
                Array.isArray(param) && param.length === 0
                    ? []
                    : [...(result[Op.in] ?? []), param].flat();
            // если значение объект, расширяем свойство [Op.in] и спредим все остальные свойства
        } else if (param !== undefined && typeof param === 'object') {
            const opInParam = param[Op.in];

            // если значение Op.in пустой массив, значит это пустой запрос, в результате которого ничего найдено не будет
            // добавляем в результат пустой массив
            let newOpIn;
            if (opInParam?.length === 0) {
                newOpIn = {
                    [Op.in]: [],
                };
            } else {
                newOpIn = opInParam
                    ? {
                          [Op.in]: [...(result[Op.in] ?? []), ...opInParam],
                      }
                    : {};
            }

            // собираем все свойства вместе с исходными
            result = {
                ...result,
                ...param,
                ...newOpIn,
            };
        }

        return result;
    }

    // 2 параметр имеет преимущество при мердже
    static mergeInternalParams(param1, param2) {
        if (param1 === undefined && param2 === undefined) {
            return undefined;
        }

        // добавляем значение параметров по очереди, 2 параметр приоритет
        let result = {};
        result = this.parseParamInto(result, param1);
        result = this.parseParamInto(result, param2);

        // используем Reflect для учета ключей типа Symbol
        return Reflect.ownKeys(result).length === 0 ? undefined : result;
    }

    // приоритет при мердже имеют options2
    static mergeWhereOptions(options1 = {}, options2 = {}) {
        const mergedIdOptions = this.mergeInternalParams(
            options1.id,
            options2.id
        );
        const idOptions = mergedIdOptions ? { id: mergedIdOptions } : {};
        const where = {
            ...(options1 ?? {}),
            ...(options2 ?? {}),
            ...idOptions,
        };
        return where;
    }

    // расширяет входные currentOptions текущими sourceOptions из DTO и возвращает готовый объект с параметрами
    async getOptions(currentOptions = {}) {
        const resultOptions = QueryDto.mergeOptions(this, currentOptions);
        return resultOptions;
    }

    static async cleanCountOptions(options) {
        const newOptions = { ...options };
        delete newOptions.group;
        delete newOptions.limit;
        delete newOptions.offset;
        return newOptions;
    }

    static async cleanCheckOptions(options) {
        const newOptions = { ...options };
        delete newOptions.group;
        delete newOptions.limit;
        delete newOptions.offset;
        return newOptions;
    }
}

module.exports = QueryDto;
