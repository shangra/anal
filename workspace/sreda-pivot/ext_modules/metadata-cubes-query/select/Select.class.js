const { uniqueValues, getLast, isEmptyObject } = require("../../utils/services");

const ApiError = require("../../../core/exceptions/ApiError");

const BaseConverterClass = require("./converter/Base.converter.class");

const DataLayerClass = require("./layer/Data.layer.class");
const LogicalLayerClass = require("./layer/Logic.layer.class");

const DataLayer = new DataLayerClass();
const LogicalLayer = new LogicalLayerClass();

const constants = require("../constants");

/**
 * @typedef {import("../totals/dialects/base/Total.class")} TotalClass
 * @typedef {import("../totals/dialects/grouping/Total.grouping.class")} TotalClickClass
 */

/**
 * @typedef {import("../../metadata-connector/services/metadata/Connector.class").IConnector} IConnector
 * @typedef {import("../../metadata-connector/services/metadata/Connector.class").Ifrom} Ifrom
 * @typedef {import("../../metadata-cmp/services/metadata/source/type").default} LevelClassI
 * @typedef {import("./types/index").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("./factory/Field.factory.class").IFactoryInit} IFactoryInit
 * @typedef {import("./types/index").IFactory<IQueryBuilerBehavior>} IFactory
 * @typedef {import("./types/index").IBehaviourOptions} IBehaviourOptions
 * @typedef {import("../../../core/db/types").TAggField} TAggField
 * @typedef {import("../../../core/db/types").TField} TField
 * @typedef {import("./types/index").ISettings} ISettings
 * @typedef {import("./types/index").ILevel} ILevel
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
     * @param {{ totals: TotalClass | TotalClickClass, subFieldBuilder: IFactory, behaviourBuilder: IFactory, treeObject: object, table: string, connector: IConnector, logger: { console(msg: string, meta: any): Promise<void> } }} param0 
     */
    constructor({ totals, subFieldBuilder, behaviourBuilder, treeObject, table, connector, logger }) {
        /** @type {IFactory} */
        this.subFieldBuilder = subFieldBuilder;
        /** фабрика поведений */
        /** @type {IFactory} */
        this.behaviourBuilder = behaviourBuilder;
        /** метаданные по которым строится срез */
        // TODO: добавить типы
        /** @type {object} */
        this.treeObject = treeObject;
        /** название таблицы над которой будет строиться срез */
        /** @type {string} */
        this.table = table;
        /** разделитель системных атрибутов по типу scode_2023/name - такое поле является внутренней абстракцией по которой срез будет строиться особым образом */
        /** @type {string} */
        this.delimeter = constants.subDimensionDelimeter;
        /** @type {string} */
        this.aggregateDelimeter = constants.aggregateDelimeter;
        /** коннект к источнику данных */
        /** @type {IConnector} */
        this.connector = connector
        /** конвертер Ilevel к формату используемому ORM */
        this.converter = BaseConverterClass

        this.totals = totals;

        this.logger = logger;
    }

    /**
     * Костыль
     * 
     * @private
     * 
     * @param {TField[]} arr 
     * @returns {boolean} 
     */
    isSemiAddititve(arr) {
        return !!arr.find((i) => constants.SEMI_ADDITIVE.includes(/** @type {object} */(i)?.func?.toUpperCase()))
    }

    /**
     * 
     * @private
     * 
     * @param {TField[]} arr 
     * @returns {boolean} 
     */
    isCount(arr) {
        return !!arr.some(i => constants.COUNT.includes(/** @type {object} */(i)?.func));
    }

    /**
     * @public
     * Основной метод формирования запроса (Формирует массив объектов опций для ORM с которого формируется запрос)
     * 
     * TODO: добавить типы к options
     * @param {string} id 
     * @param {ISettings} options - Опции
     * @param {LevelClassI} entity 
     */
    async query(id, options, entity) {
        /** @type {string[]} */
        let attributes = uniqueValues([...options.attributes]);
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

        const isSemi = this.isSemiAddititve(attributes);
        this.mappedAggregateFunctions = options.attributes.reduce((acc, /** @type {object} */ i) => {
            if (i.func) acc[i.alias] = i.func;
            return acc;
        }, {});

        /** если есть расчет полуаддитивных мер но в запросе нет измерения времени докинем его но пометим на удаление из финального запроса */
        if (isSemi && this.dateDimension && !attributes.includes(this.dateDimension.field)) {
            options.attributesForDel.push(this.dateDimension.field);
            attributes.push(this.dateDimension.field);
        }

        const { attributesForDel } = options;

        options.techAttributes ||= [];

        attributes = this.addAttributes(attributes, options);

        /**
         * cлой подготовки аттрибутов
         * 
         * здесь выполняются все сложные запросы
         * происходят подмены названий
         * и выставление простейших фильтров
         */
        /** @type {ILevel[][]} */
        const subLayer = await this.dataLayer({ attributes, attributesForDel, options, builder: this.subFieldBuilder });

        /** аттрибуты без под полей и объектов агрегации */
        /** @type {TField[]} */
        const sanitizedAttrs = this.sanitizeAttributes(attributes, attributesForDel);

        const dataLayer = this.generateLevels(subLayer, sanitizedAttrs);

        const from = await this.getLayerSql({ layer: dataLayer, entity, id });

        /**
         * слой построения иерархий
         * 
         * здесь собирается иерархия и поверх нее выставляются фильтры
         */
        /** @type {ILevel[][]} */
        const fieldLayers = await this.logicLayer({ attributes, attributesForDel, options, builder: this.behaviourBuilder, previousLevels: from });

        // начинаем шаманство
        const { layers: fizLayer, aggFields: fizAttrs, attributesForDel: fizAttrsForDel } = DataLayer.mutate(dataLayer, attributes);

        const logicalLayer = LogicalLayer.mutate(this.generateLevels(fieldLayers, sanitizedAttrs), fizAttrs, fizAttrsForDel);

        const aggrLevels = this.aggregate(options, attributes, sanitizedAttrs.filter(i => !fizAttrsForDel.includes(i)));

        const totals = this.totals.totals({
            options,
            levels: aggrLevels,
            isSemi,
            mappedFuncs: this.mappedAggregateFunctions,
        });

        this.setRefs(totals, options.withOutRefs);

        //TODO костыль
        if (Object.keys(options.metaAccessWhere ?? {}).length > 0) {
            fizLayer[0].where ??= {};
            fizLayer[0].where['$and'] ??= [];
            fizLayer[0].where['$and'].push({}, options.metaAccessWhere);
        }

        const order = this.filterOrder(options.order || [], attributes);

        /** @deprecated */
        /** @type {Record<string, string>} */
        const refsToParse = {};

        return {
            refsToParse,
            fizLayer,
            logicalLayer,
            totals,
            limit: options.limit,
            offset: options.offset,
            order,
        };
    }

    /**
     * @private
     * 
     * @param {TField[]} attributes 
     * @param {ISettings} options
     * @returns {TField[]}
     */
    addAttributes(attributes, options) {
        const attrs = new Set();

        attributes.forEach((attr) => {
            if (typeof attr !== 'object') {
                const refFields = this.treeObject.Fields[this.getAttribute(attr)]?.refFields;

                if (refFields?.length) {
                    for (const { field } of refFields) {
                        const key = this.treeObject.FieldsGUID[field.value].field;
                        attrs.add(key);

                        if (!attributes.includes(key)) {
                            options.techAttributes.push(key);
                        }
                    }
                }
            }

            attrs.add(attr);
        });

        return Array.from(attrs);
    }

    /**
     * @private
     * 
     * @param {string} attr 
     * @returns {boolean}
     */
    isSubDiv(attr) {
        return attr.split(this.delimeter).length > 1;
    }

    /**
     * @private
     * 
     * @param {string} attribute 
     * @returns {string}
     */
    getAttribute(attribute) {
        const [attr] = attribute.split(this.delimeter);

        return attr;
    }

    /**
     * @private
     * 
     * @param {Object} param0 
     * @param {TField[]} param0.attributes 
     * @param {(string| [string, string])[]} param0.attributesForDel 
     * @param {ISettings} param0.options 
     * @param {IFactory} param0.builder 
     * @param {Ifrom} [param0.previousLevels] 
     * 
     * @returns {Promise<ILevel[][]>}
     */
    async dataLayer({ attributes, attributesForDel, options, builder }) {
        const promise = attributes.map(async (key) => {
            let viewName = null;
            let field = key;
            if (typeof key !== 'object' || key?.field.includes(this.delimeter)) {
                key = key?.field || key;
                ([field, viewName] = key.split(this.delimeter));
                if (viewName) attributesForDel.push([key, field]);
            }

            // Предикат - является ли это поведением
            const isBehaviour = !!viewName
                // || !!options.where[key]
                || options.attributesForDel?.includes(/** @type {string} */(key))
                || options.settings?.index?.includes(/** @type {string} */(key))
                || options.settings?.columns?.includes(/** @type {string} */(key));

            /** @type {IFactoryInit} */
            const data = {
                viewName,
                isBehaviour,
                treeObject: this.treeObject,
                isProcessing: options.processing,
                field: this.treeObject.Fields[/** @type {object} */(field)?.field || field],
                table: this.table,
                delimeter: this.delimeter,
                connector: this.connector,
                logger: this.logger,
            };

            // Фабрика поведений для обработки иерархий
            const behaviour = await builder.init(data);

            return await behaviour.query(options, field, viewName);
        });

        const layerArr = await Promise.all(promise);

        /** @type {ILevel[]} */
        const beforeSub = [];
        /** @type {ILevel[]} */
        const currentSub = [];
        /** @type {ILevel[]} */
        const afterSub = [];

        layerArr.forEach((item) => {
            if (!item) {
                return;
            }
            const { before, current, after } = item;
            before && beforeSub.push(...before);
            current && currentSub.push(...current);
            after && afterSub.push(...after);
        });

        return [beforeSub, currentSub, afterSub];
    }

    /**
     * @private
     * 
     * @param {Object} param0 
     * @param {TField[]} param0.attributes 
     * @param {(string| [string, string])[]} param0.attributesForDel 
     * @param {ISettings} param0.options 
     * @param {IFactory} param0.builder 
     * @param {Ifrom} param0.previousLevels 
     * 
     * @returns {Promise<ILevel[][]>}
     */
    async logicLayer({ attributes, options, builder, previousLevels }) {
        const promise = attributes.map(async (key) => {
            let viewName = null;
            let field = key;
            if (typeof key !== 'object') {
                ([field, viewName] = key.split(this.delimeter));
            }

            // Предикат - является ли это поведением
            const isBehaviour =
                !options.techAttributes.includes(/** @type {string} */(key)) && (
                    !!viewName
                    || options.attributesForDel?.includes(/** @type {string} */(key))
                    || options.settings?.index?.includes(/** @type {string} */(key))
                    || options.settings?.columns?.includes(/** @type {string} */(key))
                );

            /** @type {IFactoryInit} */
            const data = {
                viewName,
                isBehaviour,
                isProcessing: options.processing,
                field: this.treeObject.Fields[/** @type {object} */(field)?.field || field],
                table: this.table,
                delimeter: this.delimeter,
                connector: this.connector,
                logger: this.logger,
            };

            /**
             * если это вычисляемая мера (по типу суммы) то смысла дальше идти нет
             */
            if (typeof field === 'object') return {};

            // Фабрика поведений для обработки иерархий
            const behaviour = await builder.init(data);
            if (!behaviour || typeof behaviour.query !== 'function') {
                return {};
            }

            return await behaviour.query({ ...options, previousLevels }, field, viewName);
        });

        const layerArr = await Promise.all(promise);

        /** @type {ILevel[]} */
        const beforeSub = [];
        /** @type {ILevel[]} */
        const currentSub = [];
        /** @type {ILevel[]} */
        const afterSub = [];

        layerArr.forEach((item) => {
            if (!item) {
                return;
            }
            const { before, current, after } = item;
            before && beforeSub.push(...before);
            current && currentSub.push(...current);
            after && afterSub.push(...after);
        });

        return [beforeSub, currentSub, afterSub];
    }

    /**
     * @private
     * 
     * @param {*} options 
     * @param {*} attributes 
     * @param {*} localAttributes 
     * @returns 
     */
    aggregate(options, attributes, localAttributes) {
        const { before, current, after } = this.aggregateAttr({ ...options, attributes });

        const where = {
            $and: options.attributes.reduce((acc, attr) => {
                if (!attr || !attr?.func) return acc;

                const [field, func] = attr.field.replace(/"/g, '').split(this.aggregateDelimeter);
                const normalizedFunc = constants.SQLNames?.[func];
                const dictWhere = options.dictionaryWhere[field]?.[normalizedFunc];

                if (dictWhere) {
                    acc.push({
                        [attr.alias]: dictWhere
                    });
                };

                return acc;
            }, [])
        };

        !where.$and?.length && delete where.$and;

        /**
         * слой агрегации
         * 
         * здесь происходит формирование функций агрегаций
         * выставление оконных функций
         * группировки
         */
        const aggregationLayers = [
            this.generateLevels([before], localAttributes),
            this.generateLevels([current], localAttributes),
            this.generateLevels([after], localAttributes)
        ];

        const [_, currentAgg, __] = aggregationLayers;

        if (!isEmptyObject(where)) {
            const [option] = structuredClone(currentAgg);

            option.attributes = this.getAliases(option.attributes);
            option.where = { ['$and']: [option.where, where].filter(i => !isEmptyObject(i)) };

            currentAgg.push(option);
        }

        return aggregationLayers.flat();
    }

    /**
     * @private
     * 
     * @param {TField[]} attributes 
     */
    getAliases(attributes) {
        return attributes.map((attr) => {
            if (Array.isArray(attr)) return attr[1];
            if (typeof attr === 'object') return attr.alias;
            return attr;
        })
    }

    /**
     * @private
     * 
     * @param {Record<string, object[]>} totals 
     * @param {boolean} withOutRefs 
     * 
     * @returns {void}
     */
    setRefs(totals, withOutRefs) {
        const skip = +Boolean(withOutRefs);

        for (const key in totals) {
            const arr = totals[key];

            const layer = getLast(arr);

            layer.attributes.unshift([skip, constants.noRefName]);
        }
    }

    /**
     * @private
     * 
     * @param {ILevel[][]} layers 
     * @param {TField[]} attrs 
     */
    generateLevels(layers, attrs) {
        return layers.map((i, index) => this.converter.convert(i, attrs, index)).filter((i) => !!i);
    }

    /**
     * @private
     * 
     * отфильтровать все сортировки запроса исключив поля которые не были указанные в запросе
     * 
     * @param {[string, string][]} optionsOrder
     * @param {TField[]} attributes 
     * @returns {[string, string][]}
     */
    filterOrder(optionsOrder, attributes) {
        /** @type {[string, string][]} */
        const order = [];

        optionsOrder.map((item) => {
            const [key, dir] = item;

            const attr = attributes.find(i => i === key || /** @type {object} */(i)?.field === key);

            if (!attr) return;

            order.push([/** @type {object} */(attr).alias || attr, dir]);
        });

        return order;
    }

    /**
     * Формирование агрегирующих функций
     * 
     * @private
     * 
     * @param {ISettings} options - Опции
     * 
     * @returns {IBehaviourOptions}
     */
    aggregateAttr(options) {
        const arr = options.attributes.map((i) => this.parseFunc(structuredClone(i), options)).filter(Boolean);

        /** @type {ILevel[]} */
        const before = [];
        /** @type {ILevel[]} */
        const current = [];
        /** @type {ILevel[]} */
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
     * @param {TField} finallAttribute 
     * @param {ISettings} options
     * @returns {IBehaviourOptions}
     */
    parseFunc(finallAttribute, options) {
        const { settings, attributesForDel, techAttributes } = options;

        const isIgnored = attributesForDel.includes(/** @type {string} */(finallAttribute)) || techAttributes.includes(/** @type {string} */(finallAttribute));

        if (isIgnored) {
            const level = [{ ignoreAttribute: finallAttribute }];

            if (typeof finallAttribute === 'string' && ~finallAttribute.indexOf(this.delimeter)) {
                const [field] = finallAttribute.split(this.delimeter);

                level.push({ ignoreAttribute: field })
            }

            return { before: level, current: level, after: level };
        }

        if (typeof finallAttribute !== 'object' || Array.isArray(finallAttribute)) {
            const isArray = Array.isArray(finallAttribute);
            let [field, attribute] = isArray ? finallAttribute : [finallAttribute, finallAttribute];

            let isSubDiv = false;
            if (typeof finallAttribute === 'string' && ~finallAttribute.indexOf(this.delimeter)) {
                ([field] = finallAttribute.split(this.delimeter));

                isSubDiv = true;
            }

            /** @type {ILevel[]} */
            const level = [
                {
                    field: isArray ? attribute : finallAttribute,
                    attribute: finallAttribute,
                    ignoreAttribute: isSubDiv ? field : null,
                    additionalAttributes: !isSubDiv ? [attribute] : null
                }
            ];

            return {
                before: level,
                current: level,
                after: level
            }
        }

        if (this.isCount([finallAttribute])) {
            const isGroup = true;

            /** @type {ILevel} */
            const levelData = {
                isGroup: false,
                field: finallAttribute.alias,
                attribute: finallAttribute.alias,
                ignoreAttribute: finallAttribute.field,
            };

            /** @type {IBehaviourOptions} */
            const result = {
                before: [
                    {
                        isGroup,
                        attribute: finallAttribute,
                        ignoreGroup: finallAttribute.field,
                        ignoreAttribute: finallAttribute.field,
                    }
                ],
                current: [{ ...levelData }],
                after: [
                    { ...levelData },
                    { isGroup },
                    { attribute: finallAttribute.alias },
                    { ignoreAttribute: finallAttribute.field },
                ]
            };

            return result;
        }

        //обработка простых агрегаций
        if (!this.isSemiAddititve([finallAttribute])) {
            const isGroup = true;

            /** @type {ILevel} */
            const levelData = {
                isGroup: false,
                field: finallAttribute.alias,
                attribute: finallAttribute.alias,
                ignoreAttribute: finallAttribute.field,
            };

            const newAgg = structuredClone(finallAttribute);
            newAgg.field = `"${newAgg.alias}"`;

            /** @type {IBehaviourOptions} */
            const result = {
                before: [
                    {
                        isGroup,
                        attribute: finallAttribute,
                        ignoreGroup: finallAttribute.field,
                        ignoreAttribute: finallAttribute.field,
                    }
                ],
                current: [{ ...levelData }],
                after: [
                    { ...levelData },
                    // { attribute: finallAttribute.alias },
                    { attribute: newAgg },
                    { isGroup: true },
                    { ignoreAttribute: finallAttribute.field },
                    { ignoreGroup: finallAttribute.field },
                    { ignoreGroup: finallAttribute.alias }
                ]
            };

            return result;
        }

        if (!this.dateDimension) {
            throw ApiError.BadRequest('Не задано измерение времени для расчета полуаддитивных мер');
        }

        const attribute = structuredClone(finallAttribute);

        const originalField = attribute.field;

        attribute.field = attribute.alias;

        if ('LAST_VALUE' === finallAttribute.func) {
            attribute.bounds = `rows between current row and unbounded following`;
        }

        const isReport = options.isReport || options?.settings?.isReport;

        const index = !isReport ? [settings?.index[0]] : settings?.index || [];
        const column = !isReport ? [settings?.columns[0]] : settings?.columns || [];

        finallAttribute.func = 'SUM';

        attribute.windowFunc = 'OVER';
        attribute.aggrFields ||= uniqueValues([...index, ...column].filter(Boolean));
        attribute.order ||= [this.dateDimension.field];

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
                    ignoreGroup: originalField,
                    ignoreAttribute: originalField,
                }
            ],
            after: [
                {
                    isGroup: true,
                    attribute: attribute.alias,
                    // ignoreGroup: originalField,
                    ignoreAttribute: originalField,
                    additionalAttributes: [attribute.alias],
                }
            ]
        }

        return result;
    }

    async getLayerSql({ layer, entity, id }) {
        const [base, ...levels] = layer;

        const query = await this.resolveBaseQuery({ entity, id, base });

        const { sql, withs, volatile } = await this.connector.generateCte(query, levels);

        /** @type {{ sql: string, name: string }[]} */
        let volatileOptions = [];
        /** @type {{ sql: string, name: string }[]} */
        let withOptions = [];
        if (!isEmptyObject(volatile)) {
            volatileOptions = Object.entries(volatile || {}).map(([name, sql]) => ({ sql, name }));
        } else {
            withOptions = Object.entries(withs || {}).map(([name, sql]) => ({ sql, name }));
        }

        const table = this.connector.union({ withOptions, volatileOptions, sqls: [sql] })
        const alias = 'cte';

        return { table, alias };
    }

    /**
     * Базовый FROM: Guide/Matrix query() если умеет, иначе таблица слоя через this.connector.findSQL.
     */
    async resolveBaseQuery({ entity, id, base }) {
        if (typeof entity?.query === 'function') {
            try {
                const out = await entity.query(id, base);
                const query = out?.query ?? out;
                if (typeof query === 'string' && query) {
                    return { table: query, alias: this.table || 't' };
                }
                if (query && typeof query === 'object' && (query.table || query.raw)) {
                    return query;
                }
            } catch {
                // плоский Infoservice / AST-коннектор — собираем FROM сами
            }
        }

        if (typeof this.connector?.findSQL !== 'function') {
            throw new Error(
                'Коннектор не реализует findSQL. Нужен metadata/connectors/Postgres, не AST PostgresConnector.'
            );
        }

        const from =
            this.table && typeof this.table === 'object'
                ? this.table
                : { table: this.table, alias: this.table };
        const SQL = await this.connector.findSQL(from, base || {});
        return { table: SQL, alias: from.alias || this.table || 't' };
    }

    sanitizeAttributes(attributes, attributesForDel) {
        return attributes.map(attribute => typeof attribute === 'object' ? attribute.field : attribute);
    }
}

module.exports = SelectClass;