/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');

/** LOCAL * */
// const MetadataClass = require('../../../metadata-cmp/services/Metadata.service');
const FieldsClass = require('./shared/Fields.class');
// const ConnectorClass = require('../../../metadata-connector/services/metadata/Connector.class');

// const InfoserviceClass = require('../../../metadata-infoservice/services/metadata/Infoservice.class');
// const Refs = new InfoserviceClass();

const constants = require('../../constants');
const MeasuresClass = require("./shared/Measures.class");
const DimensionsClass = require("./shared/Dimensions.class");
const InfoservicesClass = require("./shared/Infoservices.class");
const exInfoservicesClass = require("../../../metadata-infoservice/services/metadata/Infoservice.class");
// const workerClass = require("../../../worker_code/services/worker_code.service");

const CubeQueryBuilderClass = require('../../../metadata-cubes-query');
const CalcFieldAggregateClass = require('../../../meta-aggregate-calc-field');

const { uniqueValues } = require('../../../utils/services');
const { ref_extract } = require('../../../metadata-cmp/util');

const ApiError = require('../../../../core/exceptions/ApiError');
const { aggrDelimeter } = require('../../constants');

const AGGREGATE_PREFIX = ':->:';

/**
 * @typedef {import('../../../../core/db/types').TField} TField
 * @typedef {import('../../../../core/db/types').TAggField} TAggField
 * @typedef {import('../../../metadata-cmp/services/Metadata.service').IRef} IRef
 * @typedef {import('../../../metadata-cmp/services/metadata/source/type/index').default} LevelClassI
 */


/**
 * @class ReportsClass
 * @extends {LevelClass}
 */
class ReportsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Reports';

        this.id = constants[name].id;
        this.component = constants[name].component;
        this.childrenCRUD = ['r', 'u', 'd', 'rls'];

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c', 'rls'],
            routes: constants[name].routes,
        };
    }

    async subTree(item, options = {}) {
        return Promise.all([
            new MeasuresClass({ owner_id: item.id, parent: item }).tree(options),
            new DimensionsClass({ owner_id: item.id, parent: item }).tree(options),
            new InfoservicesClass({ owner_id: item.id, parent: item }).tree(options),
            new FieldsClass({ owner_id: item.id, parent: item }).tree(options),
        ]);
    }

    /**
     * @param {ReportsClass} meta
     * @param {string} id
     * @param {{ transaction?: import('sequelize').Transaction }} [options]
     */
    async tableInfo(meta, id, options) {
        const { transaction } = options ?? {};

        const { parents, children } = await meta.getFamilyTree(id, { transaction });

        const Fields = {};
        const AllFields = {};
        const FieldsGUID = {};
        const AllFieldsGUID = {};
        let IFields = {};
        let IFieldsGUID = {};
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

        for (const child of parents) {
            const childrenOwnerInfoservice = children[child.id] || [];

            const infoserviceOwner =
                childrenOwnerInfoservice && Array.isArray(childrenOwnerInfoservice)
                    ? childrenOwnerInfoservice
                        .filter((item) => !!item?.manifest?.settings?.infoservice)
                        .map((item) => item.manifest.settings.infoservice)
                    : [];

            if (child.class === 'Measures') {
                const fieldInfo = child.manifest.settings;

                AllFields[fieldInfo.nameField] = {
                    field: fieldInfo.nameField,
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    class_id: child.class_id,
                    type: fieldInfo.type,
                    groupTag: fieldInfo.groupTag,
                    onoff: fieldInfo.onoff ?? false,
                    infoservice_owner: infoserviceOwner,
                    format: fieldInfo.format,
                    aggrFunc: fieldInfo.aggrFunc
                };
                FieldsGUID[child.id] = /* structuredClone */(AllFields[fieldInfo.nameField]);

                AllMeasures[fieldInfo.nameField] = /* structuredClone */(AllFields[fieldInfo.nameField]);
                AllMeasuresGUID[child.id] = /* structuredClone */(AllFields[fieldInfo.nameField]);

                if (!AllFields[fieldInfo.nameField]?.onoff) {
                    Fields[fieldInfo.nameField] = /* structuredClone */(AllFields[fieldInfo.nameField]);
                    FieldsGUID[child.id] = /* structuredClone */(Fields[fieldInfo.nameField]);

                    Measures[fieldInfo.nameField] = /* structuredClone */(Fields[fieldInfo.nameField]);
                    MeasuresGUID[child.id] = /* structuredClone */(Fields[fieldInfo.nameField]);
                }
            }

            if (child.class === 'Dimensions') {
                const fieldInfo = child.manifest.settings;

                AllFields[fieldInfo.nameField] = {
                    field: fieldInfo.nameField,
                    name: child.name,
                    description: child.description,
                    id: child.id,
                    class_id: child.class_id,
                    type: fieldInfo.type,
                    groupTag: fieldInfo.groupTag,
                    onoff: fieldInfo.onoff ?? false,
                    totalsOnoff: fieldInfo.totalsOnoff ?? true,
                    infoservice_owner: infoserviceOwner,
                    dateDimension: fieldInfo.dateDimension,
                    accountDimension: fieldInfo.accountDimension
                };
                FieldsGUID[child.id] = /* structuredClone */(AllFields[fieldInfo.nameField]);

                AllDimensions[fieldInfo.nameField] = /* structuredClone */(AllFields[fieldInfo.nameField]);
                AllDimensionsGUID[child.id] = /* structuredClone */(AllFields[fieldInfo.nameField]);

                if (!AllFields[fieldInfo.nameField]?.onoff) {
                    Fields[fieldInfo.nameField] = /* structuredClone */(AllFields[fieldInfo.nameField]);
                    FieldsGUID[child.id] = /* structuredClone */(Fields[fieldInfo.nameField]);

                    Dimensions[fieldInfo.nameField] = /* structuredClone */(Fields[fieldInfo.nameField]);
                    DimensionsGUID[child.id] = /* structuredClone */(Fields[fieldInfo.nameField]);
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
                    groupTag: fieldInfo.groupTag,
                    onoff: fieldInfo.onoff ?? false,
                    infoservice_owner: infoserviceOwner,
                    format: fieldInfo.format
                };
                FieldsGUID[child.id] = /* structuredClone */(AllFields[fieldInfo.nameField]);

                AllMeasures[fieldInfo.nameField] = /* structuredClone */(AllFields[fieldInfo.nameField]);
                AllMeasuresGUID[child.id] = /* structuredClone */(AllFields[fieldInfo.nameField]);

                if (!AllFields[fieldInfo.nameField].onoff) {
                    Fields[fieldInfo.nameField] = /* structuredClone */(AllFields[fieldInfo.nameField]);
                    FieldsGUID[child.id] = /* structuredClone */(Fields[fieldInfo.nameField]);

                    Measures[fieldInfo.nameField] = /* structuredClone */(Fields[fieldInfo.nameField]);
                    MeasuresGUID[child.id] = /* structuredClone */(Fields[fieldInfo.nameField]);
                }
            }

            for (const child of parents) {
                if (child.class === 'Infoservices') {
                    const fieldInfo = child.manifest.settings;

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
            IFields,
            IFieldsGUID,
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

            Infoservices
        };
    }


    /**
     * @param {ReportsClass} meta
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
                    infoservice_owner: infoserviceOwner,
                    children: {},
                    onoff: fieldInfo.onoff
                };

                AllFieldsGUID[child.id] = AllFields[fieldInfo.nameField];

                if (!fieldInfo.onoff) {
                    Fields[fieldInfo.nameField] = AllFields[fieldInfo.nameField];
                    FieldsGUID[child.id] = Fields[fieldInfo.nameField];

                    const childKeys = children[child.id] || [];
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
     * @param {string} id 
     * @param {Record<string, string | string[] | object>} options 
     */
    async read(id, options = {}) {
        const meta = new ReportsClass({ id });

        const [
            treeObject,
            info
        ] = await Promise.all([
            this.tableInfo(meta, id),
            this.info(meta, id)
        ]);

        const CalcFieldAggregate = new CalcFieldAggregateClass({ aggPrefix: AGGREGATE_PREFIX });

        const results = Object.values(options.layers).map(async (layer) => {
            const { value: InfoserviceGUID } = ref_extract(layer.ref);

            if (!InfoserviceGUID) {
                throw ApiError.NotFound(`Не передан слой для построения среза`);
            }

            if (!layer.id) {
                // FYI: This is deprecated logic. Sometimes using top level class Infoservice id, sometimes Cubes subclass InfoserviceList.
                // FYI: Best practice must be Cubes subclass InfoserviceList. Will change it later.
                // TODO: UI must use Cubes subclass InfoserviceList.
                const [layerId] = Object.entries(treeObject.Infoservices).find(([, { ref }]) => ref == InfoserviceGUID) ?? [];
                layer.id = layerId
            }

            if (treeObject.Infoservices[layer.id]?.ref != InfoserviceGUID) {
                throw ApiError.BadRequest(`Неизвестный слой ${layer.id}`);
            }

            const localOptions = structuredClone(options);

            const option = this.prepare(localOptions, layer);

            const {
                values,
                columns,
                indexes,
                aggFunc,
                calculatedFields,
            } = CalcFieldAggregate.get(
                //@ts-ignore
                option,
                info.Fields,
                treeObject.AllMeasuresGUID,
                treeObject.AllDimensionsGUID
            );

            localOptions.attributes = [...columns, ...this.parseValues(values, aggFunc)]
            localOptions.settings ||= {};
            localOptions.totals = {};

            localOptions.viewColumns = structuredClone(option.columns);
            localOptions.viewIndex = structuredClone(option.index);

            localOptions.settings.fields = localOptions.fields;
            localOptions.settings.columns = columns;
            localOptions.settings.index = indexes;
            localOptions.settings.values = values;
            localOptions.settings.aggfunc = aggFunc;
            localOptions.settings.isReport = true;
            localOptions.settings.isMask = options.isMask;

            localOptions.settings.disableHierarchy = true;

            // TODO: должен быть выбор на фронте
            if (!localOptions.settings.dateDimension) {
                localOptions.settings.dateDimension = Object.values(treeObject.AllFields || treeObject.Fields).find((field) => field.dateDimension);
            }

            // TODO: должен быть выбор на фронте
            if (!localOptions.settings.accountDimension) {
                localOptions.settings.accountDimension = Object.values(treeObject.AllFields || treeObject.Fields).find((field) => field.accountDimension);
            }

            const funcs = Object.entries(aggFunc).map(([key, values]) => {

                return values.map((value) => {
                    if (!value.name || !value.field) return;

                    return {
                        ...value,
                        alias: `${key}:->:${value.name.toUpperCase()}`,
                        func: value.name
                    }
                })
            })
                .flat()
                .filter(Boolean);

            localOptions.attributes = uniqueValues([...(localOptions.attributes || []), ...columns, ...indexes, ...funcs]);

            const Infoservice = new exInfoservicesClass({ id: InfoserviceGUID });
            const layerTableInfo = await Infoservice.tableInfo(Infoservice, InfoserviceGUID);

            localOptions.order = this.setOrder(layerTableInfo.Fields, localOptions.attributes, localOptions.order);

            const qb = new CubeQueryBuilderClass({ id: InfoserviceGUID, isProcessing: options.processing });

            let data = await qb.read(InfoserviceGUID, localOptions, layerTableInfo, treeObject);

            const { mapValues } = this.parseLayers(calculatedFields, localOptions);

            data = await CalcFieldAggregate.convertData({
                layerId: layer.id,
                options: localOptions,
                inputOptions: localOptions,
                fields: calculatedFields,
                data,
                mapValues,
                withoutTotal: true
            });

            data.rows.forEach(row => { row.layer = layer.name })

            return data;
        });

        const result = await Promise.all(results);

        return { result, treeObject };
    }

    /**
     * @private
     * 
     * @param {Record<string, Partial<{ isOrderOn: boolean, refOrderDirection: string, refOrderField: IRef }>>} fields 
     * @param {TField[]} attributes 
     * @param {[string, string][]} order 
     */
    setOrder(fields, attributes, order) {
        const mappedOrders = {};
        order.forEach(([key]) => mappedOrders[key]);

        /** @type {[string, string][]} */
        const defaultOrders = [];
        /** @type {[string, string][]} */
        const generatedOrders = []

        for (const attr of attributes) {
            if (typeof attr === 'object' || mappedOrders[attr]) continue;

            const field = fields[this.getFizField(attr)];

            if (field?.isOrderOn && field?.refOrderDirection && !field?.refOrderField) {
                defaultOrders.push([attr, field.refOrderDirection]);
            } else {
                generatedOrders.push([attr, 'DESC']);
            }
        }

        let finalOrder = this.uniqueOrders([...order, ...defaultOrders, ...generatedOrders]);

        finalOrder = finalOrder.map(([field, dir]) => {
            const [orderField, func] = field.split('.');
            const attrField = /**  @type {TAggField} */(attributes.find((attr) => this.getFizField(attr) === orderField));

            if (!attrField?.func) return [field, dir];

            return [`${orderField}${aggrDelimeter}${(func || attrField.func).toUpperCase()}`, dir];
        });

        return finalOrder;
    }

    /**
     * 
     * @param {[string, string][]} order 
     */
    uniqueOrders(order) {
        const mapping = {};

        for (const [field, dir] of order) {
            if (mapping[field]) continue;
            mapping[field] = dir;
        }

        return Object.entries(mapping);
    }

    /**
     * @private
     * 
     * @param {*} values 
     * @param {*} aggfunc 
     * @returns 
     */
    parseValues(values, aggfunc) {
        return values.map((val) => {
            const funcs = aggfunc[val];

            return funcs.map(func => this.parseAggregateFunc({ fieldName: val, func: func.name }))
        }).flat();
    }

    /**
     * @private
     * 
     * @param {*} options 
     * @param {*} layer 
     * @returns 
     */
    prepare(options, layer) {
        const columns = []
        const values = [];
        const aggfunc = [];

        options.attributes.forEach(attr => {
            if (!attr) return;

            if (typeof attr !== 'object') columns.push(attr);

            if (attr.field) values.push(attr.field);

            if (attr.field) {
                aggfunc[attr.field] ||= [];
                aggfunc[attr.field].push({
                    name: attr.func,
                    layer: {
                        id: layer.ref.value,
                        name: layer.name,
                        layer
                    }
                });
            }
        });

        return {
            columns,
            values,
            aggfunc,
            index: []
        }
    }

    /**
     * 
     * @private
     *
     * @param {*} calcFields
     * @param {*} options
     * @returns {{ mapValues: Record<string, object>}}
     */
    parseLayers(calcFields, options) {
        /** @type {Record<string, object>} */
        const mapValues = {};

        const aggfunc = options.settings?.aggfunc

        for (const key in calcFields) {
            const value = calcFields[key].field;

            aggfunc?.[value].forEach((aggfunc) => {
                /** @deprecated Spaghetti while UI can't use other */
                const layerId = aggfunc.layer.manifest?.settings?.ref ?? aggfunc.layer.ref;

                const aggrFunc = aggfunc.name.toUpperCase();

                mapValues[layerId] ||= {};
                mapValues[layerId] = {
                    ...mapValues[layerId],
                    [`${value}${AGGREGATE_PREFIX}${aggrFunc}`]: `${value}${AGGREGATE_PREFIX}${aggfunc.layer.name}${AGGREGATE_PREFIX}${aggrFunc}`
                };
            });
        }

        return { mapValues };
    }

    /**
     * @private
     * 
     * @param {Object} param0
     * @param {string} param0.fieldName
     * @param {object} param0.func
     * @returns
     */
    parseAggregateFunc({ fieldName, func }) {
        const sqlVal = func?.name ?? func;

        if (typeof fieldName === 'string' && fieldName.trim() !== '') {
            const name = `${fieldName}${AGGREGATE_PREFIX}${sqlVal.toUpperCase()}`;
            return {
                func: sqlVal.toUpperCase(),
                field: fieldName,
                alias: name
            };
        }

        return `${sqlVal.toUpperCase()}(${fieldName})`;
    }
}

module.exports = ReportsClass;
