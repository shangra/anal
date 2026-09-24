/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');

/** LOCAL * */
const DimensionsClass = require('./shared/Dimensions.class');
const MeasuresClass = require('./shared/Measures.class');
const FieldsClass = require('./shared/Fields.class');
const InfoservicesClass = require('./shared/Infoservices.class');
const BindsClass = require('./shared/Binds.class');
const exInfoservicesClass = require('../../../metadata-infoservice/services/metadata/Infoservice.class');

const constants = require('../../constants');
const { delimeter, aggrDelimeter, dotDelimeter } = require('../../constants');

const MetadataClass = require('../../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

const { mergeDeep, diff, iterateOverLargeArray, isEmptyObject } = require('../../../utils/services');

const ApiError = require('../../../../core/exceptions/ApiError');
const BlockedResourceError = require('../../../../core/exceptions/BlockedResource.error');

const CalcFieldAggregateClass = require('../../../meta-aggregate-calc-field');
const QueryClass = require('../../../metadata-cubes-query');
const { generateKey } = require('../../../meta-aggregate-calc-field/helper');

function isRecoverableQueryError(error) {
    const code = error?.original?.code || error?.parent?.code || error?.code;
    if (code === '42703' || code === '42P01') {
        return true;
    }
    const parts = [
        error?.message,
        error?.original?.message,
        ...(Array.isArray(error?.errors) ? error.errors : []),
    ];
    return parts.some((part) =>
        /column .* does not exist|relation .* does not exist/i.test(String(part || ''))
    );
}
const { ref_extract } = require('../../../metadata-cmp/util');

/**
 * @typedef {object} OptionI
 * @property {object[]} data
 * @property {SettingI} settings
 */

/**
 * @typedef {import('../../../metadata-cmp/db/models/metadata').IMetadata} IMetadata
 * @typedef {import('../../../meta-aggregate-calc-field/index').SettingI} SettingI
 */

/**
 * @import LevelClassI from '../../../metadata-cmp/services/metadata/source/type/index'
 */

/**
 * @implements {LevelClassI}
 */
class CubesClass extends LevelClass {

    calc = new CalcFieldAggregateClass({ aggPrefix: aggrDelimeter })

    /**
     * @param {*} props 
     */
    constructor(props) {
        super(props);

        const name = 'Cubes';
        this.id = constants[name].id;
        this.component = constants[name].component;
        this.childrenCRUD = ['r', 'u', 'd', 'rls'];

        this.props = {
            id: this.id,
            owner_id: '00000000-0000-0000-0000-000000000000',
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c', 'rls'],
            routes: constants[name].routes
        };
    }

    /**
     * @public
     * 
     * @param {*} item 
     * @param {*} options 
     */
    async subTree(item, options = {}) {
        return Promise.all([
            new MeasuresClass({ owner_id: item.id, parent: item }).tree(options),
            new DimensionsClass({ owner_id: item.id, parent: item }).tree(options),
            new FieldsClass({ owner_id: item.id, parent: item }).tree(options),
            new InfoservicesClass({ owner_id: item.id, parent: item }).tree(options),
            // new BindsClass({ owner_id: item.id, parent: item }).tree(options),
        ]);
    }

    /**
     * @public
     * 
     * @param {CubesClass} meta
     * @param {string} id
     * @param {{ transaction?: import('sequelize').Transaction, force?: boolean }} [options]
     */
    async tableInfo(meta, id, options) {
        const { transaction, force } = options ?? {};

        const { parents, children } = await meta.getFamilyTree(id, { transaction, force });

        const Processing = {};

        const Fields = {};
        const AllFields = {};
        const FieldsGUID = {};
        const AllFieldsGUID = {};

        const Measures = {};
        const AllMeasures = {};
        const MeasuresGUID = {};
        const AllMeasuresGUID = {};

        const Dimensions = {};
        const AllDimensions = {};
        const DimensionsGUID = {};
        const AllDimensionsGUID = {};

        let Keys = {};
        let KeysGUID = {};

        let ForeignKeys = {};
        let ForeignKeysGUID = {};

        let Indexes = {};

        const Infoservices = {};

        const fieldClass = new FieldsClass({ owner_id: id });
        const measureClass = new MeasuresClass({ owner_id: id });
        const dimensionClass = new DimensionsClass({ owner_id: id });

        for (const child of parents) {
            const childrenOwnerInfoservice = children[child.id] || [];

            const infoserviceOwner =
                childrenOwnerInfoservice && Array.isArray(childrenOwnerInfoservice)
                    ? childrenOwnerInfoservice
                        .filter((item) => !!item?.manifest?.settings?.infoservice)
                        .map((item) => item.manifest.settings.infoservice)
                    : [];

            if (child.class === measureClass.component) {
                const field = measureClass.parse(child, infoserviceOwner, children[child.id] || []);

                AllFields[field.field] = field;
                FieldsGUID[child.id] = /* structuredClone */(AllFields[field.field]);

                AllMeasures[field.field] = /* structuredClone */(AllFields[field.field]);
                AllMeasuresGUID[child.id] = /* structuredClone */(AllFields[field.field]);

                if (!AllFields[field.field]?.onoff) {
                    Fields[field.field] = /* structuredClone */(AllFields[field.field]);
                    FieldsGUID[child.id] = /* structuredClone */(Fields[field.field]);

                    Measures[field.field] = /* structuredClone */(Fields[field.field]);
                    MeasuresGUID[child.id] = /* structuredClone */(Fields[field.field]);
                }
            }

            if (child.class === 'Dimensions') {
                const field = dimensionClass.parse(child, infoserviceOwner, children[child.id] || []);

                AllFields[field.field] = field;
                FieldsGUID[child.id] = /* structuredClone */(AllFields[field.field]);

                AllDimensions[field.field] = /* structuredClone */(AllFields[field.field]);
                AllDimensionsGUID[child.id] = /* structuredClone */(AllFields[field.field]);

                if (!AllFields[field.field]?.onoff) {
                    Fields[field.field] = /* structuredClone */(AllFields[field.field]);
                    FieldsGUID[child.id] = /* structuredClone */(Fields[field.field]);

                    Dimensions[field.field] = /* structuredClone */(Fields[field.field]);
                    DimensionsGUID[child.id] = /* structuredClone */(Fields[field.field]);
                }
            }

            if (child.class === 'Fields') {
                const field = fieldClass.parse(child, infoserviceOwner, children[child.id] || []);

                AllFields[field.field] = field
                FieldsGUID[child.id] = /* structuredClone */(AllFields[field.field]);

                AllMeasures[field.field] = /* structuredClone */(AllFields[field.field]);
                AllMeasuresGUID[child.id] = /* structuredClone */(AllFields[field.field]);

                if (!AllFields[field.field].onoff) {
                    Fields[field.field] = /* structuredClone */(AllFields[field.field]);
                    FieldsGUID[child.id] = /* structuredClone */(Fields[field.field]);

                    Measures[field.field] = /* structuredClone */(Fields[field.field]);
                    MeasuresGUID[child.id] = /* structuredClone */(Fields[field.field]);
                }
            }

            if (child.class === 'Processing') {
                Processing[child.id] = await this.processingInfo({ parent: child, children: children[child.id], id: child.id });
            }

            for (const child of parents) {
                if (child.class === 'Infoservices') {
                    if (child.id === child.class_id) {
                        continue;
                    }
                    const fieldInfo = child.manifest?.settings || {};

                    Infoservices[child.id] = {
                        id: child.id,
                        name: child.name,
                        description: child.description,
                        class_id: child.class_id,
                        ref: fieldInfo.ref !== '0' ? (typeof fieldInfo.ref === 'object' ? fieldInfo.ref.value : fieldInfo.ref) : undefined
                    };
                }
            }
        }

        return {
            Fields,
            FieldsGUID,
            Measures,
            MeasuresGUID,
            Dimensions,
            DimensionsGUID,
            Keys,
            KeysGUID,
            ForeignKeys,
            ForeignKeysGUID,
            Indexes,

            AllFields,
            AllFieldsGUID,
            AllMeasures,
            AllMeasuresGUID,
            AllDimensions,
            AllDimensionsGUID,

            Infoservices,

            Processing
        };
    }

    /**
     * 
     * @param {{ parent: IMetadata, children: IMetadata[], id: string }} options 
     * @returns 
     */
    async processingInfo(options) {
        const { parent, children, id } = options
        return {};
    }

    /**
     * @public
     * 
     * @param {CubesClass} meta
     * @param {string} id
     * @param {{ markdel: 0 | 1 | [0, 1]; transaction?: import('sequelize').Transaction }} [options]
     */
    async info(meta, id, options) {
        const { markdel = 0, transaction } = options ?? {};

        const { parents, children } = await meta.getFamilyTree(id, { markdel, transaction });

        const Fields = {};
        const FieldsGUID = {};
        const Measures = {};
        const MeasuresGUID = {};
        const Dimensions = {};
        const DimensionsGUID = {};

        const AllMeasures = {};
        const AllMeasuresGUID = {};
        const AllDimensions = {};
        const AllDimensionsGUID = {};
        const AllFields = {};
        const AllFieldsGUID = {};

        const promise = parents.map(async (child) => {
            const childrenOwnerInfoservice = children[child.id] || [];
            const infoserviceOwner =
                childrenOwnerInfoservice && Array.isArray(childrenOwnerInfoservice)
                    ? childrenOwnerInfoservice
                        .filter((item) => !!item?.manifest?.settings?.infoservice)
                        .map((item) => item.manifest.settings.infoservice)
                    : [];

            if (child.class === 'Measures') {
                const fieldInfo = child.manifest.settings;

                AllMeasures[fieldInfo.nameField] = {
                    field: fieldInfo.nameField,
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    type: fieldInfo.type,
                    infoservice_owner: infoserviceOwner,
                    children: {},
                    onoff: fieldInfo.onoff
                };

                AllMeasuresGUID[child.id] = AllMeasures[fieldInfo.nameField];

                if (!fieldInfo.onoff) {
                    Measures[fieldInfo.nameField] = AllMeasures[fieldInfo.nameField];
                    MeasuresGUID[child.id] = Measures[fieldInfo.nameField];
                }
            }

            if (child.class === 'Dimensions') {
                const fieldInfo = child.manifest.settings;

                AllDimensions[fieldInfo.nameField] = {
                    field: fieldInfo.nameField,
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    type: fieldInfo.type,
                    infoservice_owner: infoserviceOwner,
                    children: {},
                    onoff: fieldInfo.onoff
                };

                AllDimensionsGUID[child.id] = AllDimensions[fieldInfo.nameField];

                if (!fieldInfo.onoff) {
                    Dimensions[fieldInfo.nameField] = AllDimensions[fieldInfo.nameField];
                    DimensionsGUID[child.id] = Dimensions[fieldInfo.nameField];
                }
            }

            if (child.class === 'Fields') {
                const fieldInfo = child.manifest.settings;

                AllFields[fieldInfo.nameField] = {
                    field: fieldInfo.nameField,
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    class_id: child.class_id,
                    type: fieldInfo.type,
                    value: fieldInfo.fnfield,
                    totalValue: fieldInfo.totalFnfield,
                    infoservice_owner: infoserviceOwner,
                    children: {},
                    onoff: fieldInfo.onoff
                };

                AllFieldsGUID[child.id] = AllFields[fieldInfo.nameField];

                if (!fieldInfo.onoff) {
                    Fields[fieldInfo.nameField] = AllFields[fieldInfo.nameField];
                    FieldsGUID[child.id] = Fields[fieldInfo.nameField];

                    const childKeys = (children[child.id] || []).filter((attr) => attr.class === 'FizFieldsList');
                    for (const childFizFields of childKeys) {
                        Fields[fieldInfo.nameField].children[childFizFields.id] = childFizFields.manifest.settings;
                    }
                }
            }
        });

        await Promise.all(promise);

        return {
            Fields,
            FieldsGUID,
            Measures,
            MeasuresGUID,
            Dimensions,
            DimensionsGUID,
            AllMeasures,
            AllMeasuresGUID,
            AllDimensions,
            AllDimensionsGUID,
            AllFields,
            AllFieldsGUID
        };
    }

    /**
     * @public
     * 
     * @param {string} id
     * @param {object} options
     * @returns
     */
    async read(id, options = {}) {
        const meta = new CubesClass({ id });
        const treeObject = await this.tableInfo(meta, id);
        for (const { ref } of Object.values(treeObject?.Infoservices || {})) {
            if (!ref) continue;

            const metaId = await Metadata.getParentInstance(ref, {}, exInfoservicesClass);
            return metaId.read(ref, options);
        }
    }

    /**
     * @public
     * 
     * @param {string} id 
     * @param {object} body 
     * @returns {Promise<{ result: boolean }>}
     */
    async update(id, body) {
        return { result: false };
    }

    /**
     * @public
     * 
     * @param {string} id 
     * @param {object} body 
     * @returns {Promise<{ result: boolean }>}
     */
    async create(id, body) {
        return { result: false };
    }

    /**
     * Логгер
     * @private
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
     * Основной метод формирования куба.
     *
     * @param {string} id - ID куба
     * @param {object} inputOptions - Входные опции используемые при формировании
     * @param {boolean} saveRequest - Флаг для декоратора, указывающий сохранять данные запроса или нет
     *
     * @returns
     */
    async cube(id, inputOptions = {}, saveRequest = true) {
        const options = structuredClone(inputOptions);
        const meta = new CubesClass({ id });

        await this.console(`Получаем метаданные куба`);

        //TODO В этом месте лог на 1-2 секунды, пока он собирает деревья
        const [cubeInfo, treeObject] = await Promise.all([this.info(meta, id), this.tableInfo(meta, id)]);

        await this.console(`Разбираем условия среза`);

        //TODO перенести эту логику на фронт
        if (options?.settings?.where && !options.settings.systemWhere) {
            const { userWhere, systemWhere } = await this.splitWhere(options.settings.where);
            options.settings.where = userWhere;
            options.settings.systemWhere = systemWhere;
        }

        /**
         * если в запросе есть виртуальные меры то вынесем каждую вертуальную меру в отдельный запрос
         */
        const matrix = this.calc.matrix(options.settings, cubeInfo.Fields);

        const qb = new QueryClass({ id, isProcessing: options.processing });

        const promise = matrix.map(
            async (settings) =>
                this.readInfoservice({ qb, treeObject, settings, cubeInfo, inputOptions })
        );

        const results = await Promise.all(promise);

        return this.structuredMerge(...results);
    }

    /**
     * @private
     * 
     * @param {Object} param0 
     * @param {QueryClass} param0.qb - сущность отвечающая за выполнение запроса
     * @param {SettingI} param0.settings - настройки построения куба
     * @param {object} param0.treeObject - tableInfo куба
     * @param {object} param0.cubeInfo - info куба
     * @param {object} param0.inputOptions - опции запроса
     */
    async readInfoservice({ qb, settings, treeObject, cubeInfo, inputOptions }) {
        const { workInfoservice, options, Values, Fields, mapValues, calculatedFields } = await this.prepareInfoservice({ settings, treeObject, cubeInfo });

        const res = [];
        for (const InfoserviceGUID of workInfoservice) {
            try {
                const meta = await Metadata.getParentInstance(InfoserviceGUID, {});
                const tableInfo = await meta.tableInfo(meta, InfoserviceGUID);

                    const check = this.check({ InfoserviceFields: Object.keys(tableInfo?.Fields || {}), Fields, Values });

                if (check) {
                    // TODO: должен быть выбор на фронте
                    if (!options.settings.dateDimension) {
                        options.settings.dateDimension = Object.values(treeObject.AllFields || treeObject.Fields || {}).find((field) => field.dateDimension);
                    }

                    // TODO: должен быть выбор на фронте
                    if (!options.settings.accountDimension) {
                        options.settings.accountDimension = Object.values(treeObject.AllFields || treeObject.Fields || {}).find((field) => field.accountDimension);
                    }

                    // const infoserviceMeta = Object.values(treeObject.Infoservices).find(i => i.ref === InfoserviceGUID);

                    let result = await this.getInfoservicesData(
                        {
                            qb,
                            options: structuredClone(options),
                            layerId: InfoserviceGUID,
                            layer: tableInfo,
                            cube: cubeInfo
                        }
                    );

                    // FYI: This is deprecated logic. Sometimes using top level class Infoservice id, sometimes Cubes subclass InfoserviceList.
                    // FYI: Best practice must be Cubes subclass InfoserviceList. Will change it later.
                    // TODO: UI must use Cubes subclass InfoserviceList.
                    const [layerId] = Object.entries(treeObject.Infoservices || {}).find(([, { ref }]) => ref == InfoserviceGUID) ?? [];

                    await this.console(`Обрабатываем итоги`);
                    result.totals = await this.parseTotals({ data: result, cubeInfo, id: layerId, options });
                    await this.console(`Закончили обработку итоги`);

                    await this.console(`Обрабатываем сортировки`);
                    result.order = await this.setOrder(result.viewField, tableInfo, cubeInfo, Values, options.settings.aggfunc, options.settings.initialOrder);
                    await this.console(`Закончили обработку сортировок`);

                    if (result) {
                        const now = new Date();

                        await this.console(`Обрабатываем виртуальные меры`);

                        result = await this.calc.convertData({
                            inputOptions,
                            options,
                            //@ts-ignore
                            fields: calculatedFields,
                            data: result,
                            layerId,
                            mapValues: mapValues[InfoserviceGUID]
                        });

                        await this.console(`Закончили обработку виртуальных мер (затраченное время: ${(+new Date() - +now) / 1_000})`);

                        res.push(result);
                    }
                }
            } catch (error) {
                if (isRecoverableQueryError(error)) {
                    continue;
                }
                if (error instanceof BlockedResourceError) {
                    const infoserviceMeta = Object.values(treeObject?.Infoservices || {}).find((i) => i.ref === InfoserviceGUID);

                    error.message = `Слой "${infoserviceMeta?.name || ''}" отключен для обслуживания. ${error.message}`;
                }

                throw error;
            }
        }

        return this.structuredMerge(...res);
    }

    /**
     * программно формируем данные для сортировки дата фрейма
     * 
     * TODO: выделить в отдельные типы
     *
     * @param {string[]} [order=[]] 
     * @param {Record<string, string>} pks 
     * @param {object} tree 
     * @param {object} cubeInfo
     * @param {Array<string>} Values
     * @param {Record<string, any>} aggfunc
     * @returns 
     */
    async setOrder(pks, tree, cubeInfo, Values, aggfunc, order = []) {
        // if (isEmptyObject(pks)) return [];

        const keys = {};
        for (const [infoserviceField, orderDirection] of order) {
            if (cubeInfo.AllMeasures[infoserviceField]?.id && Values.includes(infoserviceField)) {
                // Если сортировка по мере, добавляем сортировку для всех её агрегаций
                const measureAggFuncs = aggfunc?.[infoserviceField];
                if (measureAggFuncs && Array.isArray(measureAggFuncs)) {
                    for (const aggfuncItem of measureAggFuncs) {
                        const aggName = aggfuncItem?.name ? aggfuncItem.name.toUpperCase() : 'SUM';
                        const aggField = `${infoserviceField}${aggrDelimeter}${aggName}`;
                        if (!keys[aggField]) {
                            keys[aggField] = {
                                orderDirection,
                                type: cubeInfo.AllMeasures[infoserviceField].type,
                                infoserviceField: aggField,
                                fieldName: pks[aggField] || pks[infoserviceField] || aggField
                            };
                        }
                    };
                }

                continue;
            }

            const [baseField, agg] = infoserviceField.includes(dotDelimeter)
                ? [infoserviceField.split(dotDelimeter)[0], infoserviceField.split(dotDelimeter)[1].toUpperCase()]
                : [infoserviceField, null];

            const field = tree.AllFields?.[baseField] ?? tree.Fields?.[baseField];
            if (!field) continue;

            const alias = agg ? `${baseField}${aggrDelimeter}${agg}` : baseField;

            keys[infoserviceField] = {
                orderDirection,
                type: field.type,
                infoserviceField: alias,
                fieldName: pks[infoserviceField] || pks[baseField] || alias
            };
        }

        //выставим дефолтные сортировки
        for (const infoserviceField in tree.AllFields ?? tree.Fields ?? {}) {
            if (!!keys[infoserviceField]) continue;

            const field = tree.AllFields?.[infoserviceField] ?? tree.Fields?.[infoserviceField];

            if (field?.isOrderOn) {
                if (field?.refOrderField) {
                    const { value: refOrderField } = ref_extract(field.refOrderField || {});

                    if (refOrderField) {
                        const { value: refId } = ref_extract(field?.ref);

                        if (refId) {
                            const meta = await Metadata.getInstance(field?.ref, {}, exInfoservicesClass);
                            const tableInfo = await meta.tableInfo(meta, refId);

                            const rfield = tableInfo.AllFieldsGUID?.[refOrderField] ?? tableInfo.FieldsGUID?.[refOrderField];
                            if (rfield) {
                                keys[infoserviceField] = { orderDirection: field.refOrderDirection, type: rfield.type, infoserviceField, fieldName: rfield.field };

                                continue;
                            }
                        }
                    }
                }

                keys[infoserviceField] = { orderDirection: field.refOrderDirection, type: field.type, infoserviceField, fieldName: pks[infoserviceField] };
            }
        }

        return Object.values(keys);
    }

    /**
     * @param {Object} param0
     * @param {string} param0.id
     * @param {object} param0.options
     * @param {{ AllMeasures: Record<string, { id: string }>, AllDimensions: Record<string, { id: string }> }} param0.cubeInfo
     * @param {{ totals: { index: object[], column: object[], total: object[] } }} param0.data
     */
    async parseTotals({ data, cubeInfo, id, options }) {
        const { settings } = options;

        const mapping = {
            indexes: (settings.index || [])[0],
            columns: (settings.columns || [])[0],
        };

        // костыль чтобы фронт мог разобрать что есть что для остатков
        const frontMapping = {
            indexes: 'columns',
            columns: 'indexes',
            totals: 'totals',
        };

        const { totals } = data;

        /** @type {Record<string, Record<string, number>>} */
        const result = {};

        for (const key in options?.settings?.totals || {}) {
            result[key] = {};
        }

        for (const key in totals) {
            const _ = await iterateOverLargeArray(totals[key] || [], (value) => {
                //значение измерения
                const totalValue = value[mapping[key]];

                for (const field in settings.aggfunc) {
                    const aggField = settings.aggfunc[field];

                    let fieldId = cubeInfo.AllMeasures[field]?.id;
                    if (!fieldId) fieldId = cubeInfo.AllDimensions[field]?.id;

                    aggField.forEach((agg) => {
                        const genKey = generateKey({ fieldId, layer: id, value: totalValue, aggfn: agg.name.toLowerCase() });

                        result[frontMapping[key]] ||= {};
                        result[frontMapping[key]][genKey] = value[`${field}:->:${agg.name.toUpperCase()}`];
                    });
                }
            });
        }

        return result;
    }

    /**
     * @param {object} param0 
     * @param {string[]} param0.InfoserviceFields
     * @param {string[]} param0.Values
     * @param {string[]} param0.Fields
     * @returns {boolean}
     */
    check({ InfoserviceFields, Fields, Values }) {
        const diffFields = diff(Fields, InfoserviceFields);
        const diffValues = diff(Values, InfoserviceFields);

        return diffFields.length === 0 && diffValues.length <= Values.length;
    }

    /**
     * @private
     * 
     * @param {Object} param0 
     * @param {SettingI} param0.settings 
     * @param {object} param0.treeObject 
     * @param {object} param0.cubeInfo 
     */
    async prepareInfoservice({ settings, treeObject, cubeInfo }) {
        const options = { data: [], settings };

        const {
            values,
            aggFunc,
            columns,
            indexes,
            calculatedFields,
        } = this.calc.get(
            settings,
            cubeInfo.AllFields,
            treeObject.AllMeasuresGUID,
            treeObject.AllDimensionsGUID
        );

        settings.viewColumns = structuredClone(settings.columns);
        settings.viewIndex = structuredClone(settings.index);
        settings.columns = columns;
        settings.index = indexes;
        settings.aggfunc = aggFunc;
        settings.values = values;

        const calcFields = Object.values(calculatedFields).map((item) => item.field);

        const { workInfoservice, mapValues } = this.parseLayers([...options.settings.values, ...Object.values(calcFields)], options);

        calcFields.forEach((field) => delete options.settings.aggfunc[field]);

        const Fields = this.transformFields([...options.settings.columns, ...options.settings.index]);
        const Values = [...options.settings.values];

        /** изначальная сортировка до того как  */
        options.settings.initialOrder = options.settings.order;
        options.settings.order = options.settings.order.filter((order) => Fields.includes(order[0]));

        return {
            Fields,
            Values,
            options,
            mapValues,
            workInfoservice,
            calculatedFields,
        }
    }

    /**
     * @public
     * 
     * @param {string} id 
     * @param {object} body 
     * @returns 
     */
    async delete(id, body) {
        return { result: false };
    }

    /**
     * @private
     * 
     * @param {object} param0
     * @param {QueryClass} param0.qb
     * @param {object} param0.options
     * @param {string} param0.layerId
     * @param {object} param0.layer
     * @param {object} param0.cube
     * @returns
     */
    async getInfoservicesData({ qb, options, layerId, layer, cube }) {
        let dataTable;

        const localOptions = structuredClone(options);
        const settings = localOptions.settings ||= {};
        const index = settings.index || [];
        const columns = settings.columns || [];
        const fieldsMap = layer?.AllFields || layer?.Fields || {};
        const layerFields = layer?.Fields || {};

        const attributes = [...index, ...columns];
        const group = [...attributes];

        // проверяет что в переданных полях есть поля на которые выставленна сортировка по умолчанию
        // если такие есть то он докидывет в список подколей измерения поля которые участвуют в сортровке
        for (const field in layerFields) {
            // проверяем что поле находится в списке выбранных измерений в колонках или строках
            if (!(index.includes(field) || columns.includes(field))) continue;

            const { isOrderOn, refOrderField, ref } = fieldsMap[field] || {};

            // проверяем что сортировка включена и выставленно поле сортировки
            if (!(isOrderOn && refOrderField)) continue;

            // Проверяем, что есть ссылка
            if (!ref) continue;

            const refId = typeof ref === 'object' ? ref.value : ref;
            const meta = await Metadata.getParentInstance(refId, undefined, exInfoservicesClass);
            const treeObject = await meta.tableInfo(meta, refId);

            const orderRefKey = typeof refOrderField === 'object' ? refOrderField.value : refOrderField;
            const orderRefFieldMeta = treeObject?.AllFieldsGUID?.[orderRefKey] || treeObject?.FieldsGUID?.[orderRefKey];

            // проверяем что такое поле существует
            if (!orderRefFieldMeta) continue;

            const orderField = orderRefFieldMeta.field;

            // проверяем что такого поле еще нет в списке
            if ((settings.fields?.[field]?.children || []).includes(orderField)) continue;

            settings.fields ||= {};
            settings.fields[field] ||= {};
            settings.fields[field].children ||= [];
            settings.fields[field].children.push(orderRefFieldMeta.field);
        }

        const filteredAttr = this.transformFields(attributes).filter((column) => layerFields[column]);

        if (filteredAttr.length !== attributes.length) {
            return dataTable;
        }

        let boundToThisLayer = false;
        let addedLayerMeasure = false;
        for (const fieldName in (settings.aggfunc || {})) {
            const func = settings.aggfunc[fieldName];
            (Array.isArray(func) ? func : [func]).forEach((val) => {
                if (!val) return;
                const res = this.parseAggregateFunc({
                    fieldName,
                    func: val,
                    layer: layerId
                });
                if (!res) return;
                boundToThisLayer = true;
                const physical = typeof res === 'object' ? res.field || fieldName : fieldName;
                if (!layerFields[physical]) {
                    return;
                }
                addedLayerMeasure = true;
                attributes.push(res);
            });
        }

        if (boundToThisLayer && !addedLayerMeasure) {
            return { rows: [], count: 0, totals: {} };
        }

        const newOptions = {
            hierarchy: true,
            ...localOptions,
            attributes,
            group,
            isMask: settings.isMask,
            totals: settings.totals,
            where: settings.where,
            systemWhere: settings.systemWhere ?? {},
            order: settings.order,
            withOutCount: localOptions.withOutCount ?? true,
            withOutOrder: true,
        };

        try {
            dataTable = await qb.read(layerId, newOptions, layer, cube);
        } catch (error) {
            if (isRecoverableQueryError(error)) {
                return { rows: [], count: 0, totals: {} };
            }
            throw error;
        }

        if (!dataTable) {
            return dataTable;
        }

        dataTable.hierarchyFields = newOptions.group.reduce((acc, groupName) => {
            acc[groupName] = layerFields[groupName] || {};

            return acc;
        }, {});

        return dataTable;
    }

    /**
     * @private
     * 
     * @param {Object} param0
     * @param {string} param0.fieldName
     * @param {object} param0.func
     * @param {string} param0.layer
     * @returns
     */
    parseAggregateFunc({ fieldName, func, layer }) {
        const field = func?.field ?? fieldName;
        const sqlVal = func?.name ?? func;
        /** @deprecated Spaghetti while UI can't use other */
        const layerRef = func?.layer;
        const layerId = layerRef?.manifest?.settings?.ref ?? layerRef?.ref;
        const windowFunc = func?.windowFunc;
        const aggrFields = func?.aggrFields?.map(i => i.replace("\"\"", '"'));

        if (!layerId || !(layer === layerId || layer === layerId.value)) return null;

        if (typeof fieldName === 'string' && fieldName.trim() !== '') {
            const name = `${fieldName}${aggrDelimeter}${sqlVal.toUpperCase()}`;
            return {
                func: sqlVal.toUpperCase(),
                field,
                alias: name,
                windowFunc,
                aggrFields
            };
        }

        return `${sqlVal.toUpperCase()}(${fieldName})`;
    }

    /**
     * @private
     * 
     * @param  {...any} attrs 
     * @returns 
     */
    structuredMerge(...attrs) {
        const result = { ...attrs[0] };
        delete result.rows;
        delete result.refs;
        delete result.refFields;
        result.hierarchyFields = {};
        result.rows = [];
        result.refs = {};
        result.refFields = {};
        result.totals = {};
        result.order = [];
        attrs.forEach((res) => {
            result.rows = [...result.rows, ...res.rows];

            result.totals = mergeDeep({}, result.totals, res.totals || {});

            Object.keys(res?.refs || {}).forEach((fieldName) => {
                if (result.refs[fieldName]) {
                    result.refs[fieldName] = { ...result.refs[fieldName], ...res.refs[fieldName] };
                    result.refFields[fieldName] = { ...result.refFields[fieldName], ...res.refFields[fieldName] };
                } else {
                    result.refs[fieldName] = { ...res.refs[fieldName] };
                    result.refFields[fieldName] = { ...res.refFields[fieldName] };
                }
            });

            result.order = result.order.concat(
                res.order.filter(i =>
                    !result.order.some(j => JSON.stringify(j) == JSON.stringify(i))
                )
            )

            result.hierarchyFields && mergeDeep(result.hierarchyFields, res.hierarchyFields);
        });

        return result;
    }

    /**
     * @private
     * 
     * @param {*} where 
     * @returns 
     */
    async splitWhere(where) {
        let userWhere = {};
        let systemWhere = {};
        Object.keys(where).forEach((name) => {
            if (name.charAt(0) === '$') userWhere[name] = where[name];
            else systemWhere[name] = where[name];
        });
        return { userWhere, systemWhere };
    }

    /**
     * @private
     * 
     * @param {string[]} arr 
     * @returns {string[]}
     */
    transformFields(arr) {
        return arr.map((i) => i.split(delimeter)[0]);
    }

    /**
     * проходится по функциям агрегации
     * собирает все id инфосервисов
     * формирует мапу преобразований 
     * 
     * @private
     *
     * @param {string[]} calcFields
     * @param {OptionI} options
     * @returns {{ workInfoservice: Set<string>, mapValues: Record<string, object> }}
     */
    parseLayers(calcFields, options) {
        /** @type {Record<string, object>} */
        const mapValues = {};
        const workInfoservice = new Set();

        calcFields.forEach((value) => {
            options.settings?.aggfunc?.[value].forEach((aggfunc) => {
                /** @deprecated Spaghetti while UI can't use other */
                const { value: layerId } = ref_extract(aggfunc.layer.manifest?.settings?.ref ?? aggfunc.layer.ref);

                if (!aggfunc?.name) {
                    throw ApiError.BadRequest(`Не переданна функция агрегации для меры ${JSON.stringify(aggfunc || '{}')}`);
                }

                const aggrFunc = aggfunc.name.toUpperCase();

                workInfoservice.add(layerId);

                mapValues[layerId] ||= {};
                mapValues[layerId][`${value}${aggrDelimeter}${aggrFunc}`] = `${value}${aggrDelimeter}${aggfunc.layer.name}${aggrDelimeter}${aggrFunc}`
            });
        });

        return { mapValues, workInfoservice };
    }
}

CubesClass.isRecoverableQueryError = isRecoverableQueryError;

module.exports = CubesClass;
