const httpContext = require('../../core/services/http-context');
const { uniqueValues } = require('../utils/services');

/** GLOBAL * */
const LevelClass = require('../metadata-cmp/services/metadata/source/LevelClass.class');

/** LOCAL * */
const MetadataClass = require('../metadata-cmp/services/Metadata.service');

const ConnectorClass = require('../metadata-connector/services/metadata/Connector.class');

const ApiError = require('../../core/exceptions/ApiError');

const WhereFormaterClass = require('../meta-where-formatter');
const WhereFormater = new WhereFormaterClass();

const Metadata = new MetadataClass();

const RefClass = require('./ref/QueryRef.class');
const BuilderClass = require('./query/Builder.class');
const { ref_extract } = require('../metadata-cmp/util');

/**
 * @typedef {string | { link: string, value: string }} Link
 * @typedef {import('../metadata-cmp/services/metadata/source/type').default} LevelClassI
 * @typedef {import('../metadata-connector/services/metadata/Connector.class').Ifrom} Ifrom
 * @typedef {import('../metadata-connector/services/metadata/Connector.class').IConnector} IConnector
 */

/**
 * TODO подчистить класс
 */

class CubeQueryBuilderClass extends LevelClass {
    constructor({ id, isProcessing }) {
        super();

        this.cubeId = id;
        this.isProcessing = isProcessing;
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
     * Достает срез данных.
     *
     * @param {string} id - ID инфосервиса.
     * @param {Object} inputOptions - Пользовательские опции.
     * @param {object} treeObject - treeObject куба
     * @param {object} cubeObject - treeObject инфосервиса
     *
     * @returns {Promise<Object>}  - Данные из БД.
     */
    async read(id, inputOptions, treeObject, cubeObject) {
        const { options, connector, table, item } = await this.get(id, inputOptions);

        const { entity } = await this.getEntity(id);

        const { cols, options: localOptions } = await this.prepare({ options, treeObject, cubeObject, item });

        const builder = new BuilderClass();

        const query = await builder.build({ isProcessing: this.isProcessing, options, table, connector, treeObject, logger: this });

        const now = +new Date();

        const { rows, count, totals, refsToParse } = await query.read({ isProcessing: this.isProcessing, entity, options: localOptions, treeObject, id });

        await this.console(`Получаем данные по запросу (количество строк: ${rows?.length}, время выполнения: ${(+new Date() - now) / 1_000}), id: ${id}`);

        //очистим запрошенные атрибуты от технических полей
        options.attributes = options.attributes.filter((i) => !options.attributesForDel?.includes(i));

        // ссылки на спрочники полученные в заросе (deprecated)
        let refs = {};
        // ссылки на спрочники полученные в заросе (новая версия апи - более подробное описание)
        let refFields = {};
        // ссылки на поля представления 
        let viewField = {};

        if (!options.withOutRefs) {
            const Ref = new RefClass(this);

            await this.console(`Находим рефы`);
            ({ refFields, refs, viewField } = await Ref.getLayerRefs({ rows, options, treeObject, refsToParse, id }));
            await this.console(`Закончили искать рефы`);
        }

        await this.console(`Возвращаем результат`);

        return {
            rows,
            totals,
            cols,
            refs,
            refFields,
            viewField,
            count,
            offset: options.offset ?? 0,
            limit: options.limit,
            options,
            metadata: { ...item, treeObject },
        };
    }

    /**
     * неподходящее название но не могу придумать какое либо другое
     * суть метода в том чтобы
     * найти запись
     * проверить что она доступна для работы
     * создать копию опций
     * создать коннектор
     * найти название таблицы
     * 
     * @private
     * 
     * @param {string} id 
     * @param {object} inputOptions 
     * 
     * @returns {Promise<{
     *     item: object,
     *     table: string,
     *     options: object,
     *     sqlalias: string,
     *     connector: IConnector,
     * }>}
     */
    async get(id, inputOptions) {
        // Возможно это преобразование стоит переместить на уровень мидлваров или контроллеров
        const options = structuredClone(inputOptions);

        await this.console(`Получаем данные по id: ${id}`);

        const item = await this.getItem(id);

        const { table, onoff, sqlalias, blockMessage = '' } = item.manifest.settings;
        if (onoff && !httpContext.get('cube-cache-preload')) {
            throw ApiError.ResourseBlocked(blockMessage || `Таблица ${table} заблокирована для запросов в инфосервисе ${item?.name}`);
        }

        const { connector } = await this.getConnector(item);

        return { item, table, options, sqlalias, connector }
    }

    /**
     * @private
     * 
     * @param {string} id 
     * @returns {Promise<{ entity: LevelClassI }>}
     */
    async getEntity(id) {
        const entity = await Metadata.getParentInstance(id);

        return { entity };
    }

    /**
     * @private
     * 
     * @param {{ options: object, treeObject: object, cubeObject: object }} param0 
     * @returns {Promise<{ cols: string[], options: object, calculatedField: Record<string, string> }>}
     */
    async prepare({ options, treeObject, cubeObject }) {
        /** @type {Record<string, string>} */
        const calculatedField = {};
        const cols = [];

        //Отделим фильтры для справочников и для агрегатов
        const { dictionaryParams, whereParams } = WhereFormater.getDictionaryParams(options.where);

        // фильтры установленные пользователем
        options.where = whereParams;
        // фильтры по подполям (внутренние фильтры спрвочников)
        options.dictionaryWhere = WhereFormater.dictionary(dictionaryParams ?? {});

        // банальная проверка по рефам - проверяет что systemWhere переданно по полю которое является рефом
        for (const key in options.systemWhere ?? {}) {
            const { value: foreignkey } = ref_extract(treeObject.Fields[key]?.foreignkey);
            const { value: ref } = ref_extract(treeObject.Fields[key]?.ref);

            if (!foreignkey && !ref && options.systemWhere[key]?.__parent__ !== undefined) {
                options.systemWhere[key] = options.systemWhere[key]?.__parent__;
            }
        }

        await this.console(`Получили ограничение доступов`, { query: options?.metaAccessWhere });

        // получим все агрегируемые меры
        const attrs = Object.keys(cubeObject?.AllMeasures);

        const flatWhere = WhereFormater.flat({
            ...options.systemWhere,
            ...options.where,
            ...options.dictionaryWhere,
        }).filter(where => Object.keys(where).every(attr => !attrs.includes(attr)));

        if (!options.attributes?.length) {
            //Для открытия витрины
            options.attributes = [];

            for (const fieldName in treeObject.Fields) {
                const field = treeObject.Fields[fieldName];

                cols.push(field);

                if (field.calculated) {
                    calculatedField[field.name] = field;

                    continue;
                }

                //TODO Нужно разобраться как работают внешние ключи
                // const foreignkey = typeof field.foreignkey === 'object' ? field.foreignkey.value : field.foreignkey;
                // const fkey = treeObject.ForeignKeysGUID[foreignkey];
                // options.attributes.push([fkey.field, fieldName]);
                options.attributes.push(fieldName);
            }
        }

        if (sreda.env.DATE_FILTER_ACTIVE === true) {
            let _where = flatWhere.flatMap(w => Object.keys(w));
            const checkDate = _where.some(attr => ['DATE', 'DATETIME'].includes(treeObject.AllFields[attr]?.type?.toUpperCase()));
            if (!checkDate) {
                throw ApiError.BadRequest(`В запросе отсутствует фильтр по измерению времени`);
            }
        }

        // получим все задействованные атрибуты
        let whereAttributes = [...options.rlsFields || [], ...options.maskFields || []];
        for (let i = 0; i < flatWhere.length; i++) {
            whereAttributes = [...whereAttributes, ...Object.keys(flatWhere[i])];
        }

        // найдем те что не были указанны в запросе
        options.attributesForDel = uniqueValues(whereAttributes.filter((attr) => !options.attributes.includes(attr)));
        // соберем общих массив уникальных атрибутов вместе с атибутами фильтров
        options.attributes = uniqueValues([...options.attributes, ...whereAttributes]);

        // Создаем окружение
        const fields = [];
        for (let i = 0; i < options.attributes.length; i++) {
            const attribute = options.attributes[i];
            if (treeObject.Fields[attribute]?.calculated) {
                const field = treeObject.Fields[attribute];
                calculatedField[field.name] = field;

                continue;
            }

            attribute.field
                ? fields.push(attribute.field)
                : fields.push(Array.isArray(attribute) ? attribute[1] : attribute);
        }

        options.fields = uniqueValues(fields);

        const localOptions = await this.prepareOptions(options);

        return {
            cols,
            options: localOptions,
            calculatedField
        }
    }

    /**
     * @private
     * 
     * метод для перегрузок
     * 
     * @param {object} options
     */
    async prepareOptions(options) {
        options = structuredClone(options);
        options.where = WhereFormater.normalize(options.where);
        return options;
    }

    /**
     * @private
     * 
     * получить коннектор
     *
     * @param {object} item
     */
    async getConnector(item) {
        let connectorId = item.manifest.settings.connector;
        connectorId = typeof connectorId === 'object' ? connectorId.value : connectorId;

        const Connector = new ConnectorClass();
        const { connector, connectorData } = await Connector.getConnector(connectorId);

        return { connector, connectorData };
    }
}

module.exports = CubeQueryBuilderClass;
