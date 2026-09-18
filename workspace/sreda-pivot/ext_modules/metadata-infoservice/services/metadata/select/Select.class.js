const { mergeDeep, uniqueValues } = require('../../../../utils/services');
const ApiError = require('../../../../../core/exceptions/ApiError');

/**
 * @typedef {import("./Factory.class")} Factory
 * @typedef {import("../../../../../db/rls/types/WhereOptions.d.ts").WhereOptions} WhereOptions
 * @typedef {import("./behaviour/types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("./behaviour/types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../../../../../db/rls/types/WhereOptions").Where} Where
 * @typedef {import("./behaviour/types/index").ILevel} ILevel
 * @typedef {import("../../../../metadata-connector/services/metadata/Connector.class").IConnector} IConnector
 */

/**
 * класс обертка на фабрикой поведений
 * используется для формирования массива опций для orm для дальнейщей генерации запроса
 * его основная функция собрать IBehaviourOptions структуры и привести их к виду который может переворить orm
 * + выставить дополнительные обработки для агрегирующий функций
 * (скорее всего этот функционал нужно вынести в отдельный класс по примеру поведений)
 */

//TODO подчистить класс
class SelectClass {
    /**
     * @param {{ behaviourBuilder: Factory, treeObject: object, table: string, connector: IConnector }} param0
     */
    constructor({ behaviourBuilder, treeObject, table, connector }) {
        /** фабрика поведений */
        /** @type {Factory} */
        this.behaviourBuilder = behaviourBuilder;
        /** метаданные по которым строится срез */
        // TODO: добавить типы
        /** @type {object} */
        this.treeObject = treeObject;
        /** название таблицы над которой будет строиться срез */
        /** @type {string} */
        this.table = table;
        /** зарделитель системных атрибутов по типу scode_2023/name - такое поле является внутренней абстракцией по которой срез будет строиться особым образом */
        /** @type{string} */
        this.delimeter = '/';
        /** коннект к истоычнику данных */
        /** @type {IConnector} */
        this.connector = connector;
    }

    /**
     * @private
     *
     * @param {{ func: string }[]} arr
     * @returns {boolean}
     */
    isSemiAddtitive(arr) {
        return !!arr.find((i) => ['LAST_VALUE', 'FIRST_VALUE'].includes(i?.func));
    }

    /**
     * @public
     * Основной метод формирования запроса (Формирует массив объектов опций для ORM с которого формируется запрос)
     *
     * TODO: добавить типы к options
     * @param {object} options - Опции
     *
     * @returns {Promise<Object>}
     */
    async query(options) {
        const attributes = [...options.attributes];
        //TODO нужно хоть какое-то минимальное описание полей/аргументов и происходящего
        // options.attributes       // измерения и меры
        // options.hierarchy        // bool
        // options.settings         // { columns index values aggfunc aggfuncPython where order fields systemWhere initialOrder }
        // options.fields           // ?
        // options.data             // ?
        // options.where            // ?
        // options.systemWhere      // ?
        // options.metaAccessWhere  // условия собранные из "Доступы" -> "Условия"
        // options.dictionaryWhere  // условия из блока "Фильтры"
        // options.group            // ?
        // options.order            // ?
        // options.withOutCount     // отключает запрос на количество записей для витрин
        // options.attributesForDel // атрибуты, которые учавствуют в агрегации, но не выдаются в срез

        this.dateDimension = options?.settings?.dateDimension;

        if (this.isSemiAddtitive(attributes) && this.dateDimension) {
            if (!attributes.includes(this.dateDimension.field)) {
                options.attributesForDel.push(this.dateDimension.field);
            }
            attributes.push(this.dateDimension.field);
        }

        /**
         * TODO - избавиться от всех этих массивов
         */
        const subQuery = [];
        const afterSubQuery = [];
        const beforeOptions = [];
        const currentOptions = [];
        const afterOptions = [];

        const attributesForDel = [];

        const localAttributes = [];

        const refsToParse = {};

        const promise = attributes.map(async (key) => {
            let viewName = null;
            let field = key;
            if (typeof key !== 'object') {
                [field, viewName] = key.split(this.delimeter);
                attributesForDel.push([key, field]);
            }

            // Предикат - является ли это поведением
            const isBehaviour =
                !!viewName ||
                // || !!options.where[key]
                options.attributesForDel?.includes(key) ||
                options.settings?.index?.includes(key) ||
                options.settings?.columns?.includes(key);

            // Фабрика поведений для обработки иерархий
            const behaviour = await this.behaviourBuilder.init({
                isBehaviour,
                refItem: this.treeObject.Refs[field],
                field: this.treeObject.Fields[field?.field || field],
                table: this.table,
                delimeter: this.delimeter,
                connector: this.connector,
            });

            const { current: sub, after: subAfter } = await behaviour.getSubQuery(
                options,
                field,
                viewName
            );

            sub && subQuery.push(...sub);
            subAfter && afterSubQuery.push(...subAfter);

            /**
             * если это вычисляемая мера (по типу суммы) то смысла дальше идти нет
             */
            if (typeof field === 'object') return;

            const { before, current, after, viewAlias } = await behaviour.query(
                options,
                field,
                viewName
            );

            viewAlias && (refsToParse[key] = viewAlias);

            before && beforeOptions.push(...before);
            current && currentOptions.push(...current);
            after && afterOptions.push(...after);
        });

        await Promise.all(promise);

        attributes.forEach((attribute) => {
            if (typeof attribute === 'object') {
                localAttributes.push(attribute.field);

                return;
            }

            // Ищем подполе как измерение
            const check = attributesForDel.find((i) => i[0] === attribute);
            localAttributes.push(check ? check[1] : attribute);
        });

        const { before, current, after } = this.formatAttributes(options);

        const levels = [
            subQuery,
            afterSubQuery,
            beforeOptions,
            currentOptions,
            afterOptions,
            before,
            current,
            after,
        ]
            .map((i) => this.generateWhere(i, localAttributes))
            .filter(Boolean);

        if (Object.keys(options.metaAccessWhere ?? {}).length > 0) {
            levels[0].where ??= {};
            levels[0].where['$and'] ??= [];
            levels[0].where['$and'].push({}, options.metaAccessWhere);
        }

        return {
            refsToParse,
            levels: this.compressLevels(levels),
            limit: options.limit,
            offset: options.offset,
            order: this.filterOrder(options, attributes),
        };
    }

    filterOrder(options, attributes) {
        const order = [];

        options.order?.map((item) => {
            const [key, dir] = item;

            const attr = attributes.find((i) => i === key || i?.field === key);

            if (!attr) return;

            order.push([attr.alias || attr, dir]);
        });

        return order;
    }

    /**
     * @private
     *
     * @param {WhereOptions[]} levels
     * @returns {WhereOptions[]}
     */
    compressLevels(levels) {
        const arr = [];

        let lastValue = null;
        levels.forEach((level) => {
            const key = JSON.stringify(level);

            if (lastValue !== key) {
                arr.push(level);
            }

            lastValue = key;
        });

        return arr;
    }

    /**
     * Формирование агрегирующих функций
     *
     * @private
     *
     * @param {object} options - Опции
     *
     * @returns {object}
     */
    formatAttributes(options) {
        const arr = options.attributes
            .map((i) => this.parseFunc(i, options.settings, options.attributesForDel || []))
            .filter(Boolean);

        const before = [];
        const current = [];
        const after = [];

        arr.forEach((i) => {
            i.before && before.push(...i.before);
            i.current && current.push(...i.current);
            i.after && after.push(...i.after);
        });

        return { before, current, after };
    }

    /**
     * TODO: переписать - получается какой-то неподдерживаемый блоб
     *
     * @private
     *
     * @param {string | { field: string, func: string, alias: string, aggrFunc: string, aggrFields: string[], order: [string, string][], bounds: string }} finallAttribute
     * @param {*} settings
     * @param {string[]} attributesForDel
     * @returns {IBehaviourOptions}
     */
    parseFunc(finallAttribute, settings, attributesForDel) {
        if (attributesForDel.includes(/** @type {string} */ (finallAttribute))) {
            const level = [{ ignoreAttribute: finallAttribute }];

            if (typeof finallAttribute === 'string' && ~finallAttribute.indexOf(this.delimeter)) {
                const [field] = finallAttribute.split(this.delimeter);

                level.push({ ignoreAttribute: field });
            }

            return { before: level, current: level, after: level };
        }

        if (typeof finallAttribute !== 'object' || Array.isArray(finallAttribute)) {
            const isArray = Array.isArray(finallAttribute);
            let [field, attribute] = isArray ? finallAttribute : [finallAttribute, finallAttribute];

            let isSubDiv = false;
            if (typeof finallAttribute === 'string' && ~finallAttribute.indexOf(this.delimeter)) {
                [field] = finallAttribute.split(this.delimeter);

                isSubDiv = true;
            }

            /** @type {ILevel[]} */
            const level = [
                {
                    field: isArray ? attribute : finallAttribute,
                    attribute: finallAttribute,
                    ignoreAttribute: isSubDiv ? field : null,
                    additionalAttributes: !isSubDiv ? [attribute] : null,
                },
            ];

            return {
                before: level,
                current: level,
                after: level,
            };
        }

        if (!this.isSemiAddtitive([finallAttribute]) || !finallAttribute.func) {
            const levelData = {
                isGroup: false,
                field: finallAttribute.alias,
                attribute: finallAttribute.alias,
                ignoreAttribute: finallAttribute.field,
            };

            return {
                before: [
                    {
                        isGroup: true,
                        attribute: finallAttribute,
                        ignoreGroup: finallAttribute.field,
                        ignoreAttribute: finallAttribute.field,
                    },
                ],
                current: [{ ...levelData }],
                after: [{ ...levelData }],
            };
        }

        if (!this.dateDimension) {
            throw ApiError.BadRequest(
                'не заданно измерение времени для расчета полуаддитивных мер'
            );
        }

        const attribute = structuredClone(finallAttribute);

        const originalField = attribute.field;

        attribute.field = attribute.alias;

        if ('LAST_VALUE' === finallAttribute.func) {
            attribute.bounds = `rows between current row and unbounded following`;
        }
        finallAttribute.func = 'SUM';

        const [index] = settings?.index;
        const [column] = settings?.columns;

        attribute.aggrFunc = 'OVER';
        attribute.aggrFields = [index, column];
        attribute.order = [this.dateDimension.field];

        /**
         * для формирования полуаддитивных мер используется алгоритм
         *   сформируем сумму по искомому полю
         *   применим к ней функцию LAST_VALUE FIRST_VALUE
         *   группируем полученные значение
         */
        /** @type {IBehaviourOptions} */
        const result = {
            before: [
                {
                    isGroup: true,
                    attribute: finallAttribute,
                    ignoreGroup: originalField,
                    ignoreAttribute: originalField,
                    additionalAttributes: [this.dateDimension.field],
                },
            ],
            current: [
                {
                    attribute,
                    isGroup: false,
                    ignoreGroup: originalField,
                    ignoreAttribute: originalField,
                },
            ],
            after: [
                {
                    attribute: attribute.alias,
                    isGroup: true,
                    ignoreGroup: originalField,
                    ignoreAttribute: originalField,
                    additionalAttributes: [attribute.alias],
                },
            ],
        };

        return result;
    }

    /**
     * Формирование финального объекта для ORM
     *
     * @private
     *
     * @param {ILevel[]} arr
     * @param {(string | { field: string })[]} optionsAttributes
     * @returns
     */
    generateWhere(arr, optionsAttributes) {
        if (!arr?.length) return null;

        const genAttributes = [];
        /** @type {{ query: string, viewName?: string }[]} */
        const withOptions = [];
        const attributes = {};
        const where = {};
        const genGroup = [];
        const ignoreGroupArr = [];
        const ignoreAttrMap = {};
        const localAdditionalAttributes = [];
        let isGroup = false;

        arr.forEach(
            ({
                additionalAttributes,
                ignoreGroup,
                ignoreAttribute,
                isGroup: needGroup,
                withOption,
                attribute,
                group,
                field,
                where: localWhere,
            }) => {
                isGroup ||= needGroup;
                localWhere !== undefined && mergeDeep(where, localWhere);

                field && genAttributes.push([field, attribute]);

                withOption && withOptions.push(withOption);

                ignoreGroup && ignoreGroupArr.push(ignoreGroup);

                ignoreAttribute && (ignoreAttrMap[ignoreAttribute] = true);

                additionalAttributes?.length && optionsAttributes.push(...additionalAttributes);
                additionalAttributes?.length &&
                    localAdditionalAttributes.push(...additionalAttributes);

                if (attribute && !Array.isArray(attribute) && typeof attribute === 'object') {
                    attributes[attribute.alias] ||= [];
                    attributes[attribute.alias].push(attribute);

                    group && genGroup.push(attribute.field);
                }
            }
        );

        genAttributes.forEach(([attribute, field]) => (attributes[field] ||= attribute));

        optionsAttributes.forEach((attr) => (attributes[attr] ||= attr));

        let attrs = [];
        Object.entries(attributes).map(([key, value]) => {
            if (Array.isArray(value)) {
                const check = value.some((i) => typeof i === 'object');

                if (check) {
                    attrs.push(...value);

                    return;
                }
            }

            if (typeof value === 'object') {
                attrs.push(value);

                return;
            }

            attrs.push(value === key ? value : [value, key]);
        });

        attrs = attrs.filter((i) => !ignoreAttrMap[i] || localAdditionalAttributes.includes(i));

        let group = [];
        if (isGroup) {
            group = [...genGroup, ...attrs]
                .map((i) => {
                    if (Array.isArray(i)) {
                        return i[1];
                    }

                    if (typeof i === 'object') {
                        return i.field;
                    }

                    return i;
                })
                .filter((i) => !ignoreGroupArr.includes(i));
        }

        return {
            withOptions,
            attributes: attrs,
            where,
            group: uniqueValues(group),
        };
    }
}

module.exports = SelectClass;
