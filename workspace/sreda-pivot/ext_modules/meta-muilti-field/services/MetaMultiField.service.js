const Extensions = require('../../../core/class/Extensions.class');
const ApiError = require('../../../core/exceptions/ApiError');

const { randomUUID } = require('crypto');

const WhereFormaterClass = require('./utils/WhereFormater.class');
const {
    isUuid,
    mergeDeep,
    uniqueValues,
    isNil,
    stringToUUID,
} = require('../../utils/services/index');
const WhereFormater = new WhereFormaterClass();

const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

/**
 * @typedef {import('../../metadata-cmp/services/metadata/source/LevelClass.class').IMultiRef} IMultiRef
 * @typedef {import('../../metadata-cmp/services/metadata/source/LevelClass.class').IField} IField
 * @typedef {import('../../../db/rls/types/WhereOptions').WhereOptions} WhereOptions
 */

/**
 * @import { LevelClassI } from '../../../metadata-cmp/services/Metadata.service'
 * @import { IMetadata } from '../../../metadata-cmp/db/models/metadata'
 */

const compositeName = 'composite';

const typeMapping = {
    0: 'string',
    1: 'float',
    2: 'boolean',
    3: 'datetime',
    10: 'ref',
};

class MetaMultiFieldService extends Extensions {
    /**** ПЕРЕГРУЗКИ ФУНКЦИИ  ****/

    /**
     * @public
     *
     * @param {*} innerResult
     * @param {*} functionParams
     * @returns
     */
    async formAfter(innerResult, functionParams) {
        if (innerResult.form?.length) {
            const type = innerResult.form.find((item) => item.name === 'type');
            if (type?.list) {
                type.list[compositeName] = 'COMPOSITE';
            }
            innerResult.form.push({
                name: 'multiRef',
                description: 'Мульти Ссылка',
                useParent: false,
                type: 'COMPOSITE',
            });
        }

        return innerResult;
    }

    async findAllInner(innerResult, functionParams) {
        const { connector, options, table, this: parentThis } = functionParams;

        if (typeof parentThis?.tableInfo !== 'function') {
            return innerResult;
        }

        const treeObject = await parentThis.tableInfo(
            parentThis,
            parentThis.props.id
        );

        const compositeFields = this.getFieldsByComposite(treeObject);
        const attributes = options.attributes;
        const where = options.where;
        const order = options.order;
        const group = options.group;

        const newWhere = this.mutateWhere({
            where: structuredClone(where),
            compositeFields,
        });
        const newAttributes = this.mutateAttributes({
            attributes: structuredClone(attributes),
            compositeFields,
        });
        const newOrder = this.mutateOrder({
            order: structuredClone(order),
            compositeFields,
        });
        const newGroup = this.mutateGroup({
            group: structuredClone(group),
            compositeFields,
        });

        const name2spec = this.#mk_fields_name2spec(treeObject); // нужно для Trino, который не преобразует типы автоматически (напр. ругается на сравнение varchar с uuid)

        let result = await connector.findAll(table, {
            ...options,
            attributes: newAttributes,
            where: newWhere,
            order: newOrder,
            group: newGroup,
            name2spec,
        });
        result = this.transformRows(result, compositeFields);
        return result;
    }
    async countInner(innerResult, functionParams) {
        const { connector, options, table, this: parentThis } = functionParams;

        if (typeof parentThis?.tableInfo !== 'function') {
            return innerResult;
        }

        const treeObject = await parentThis.tableInfo(
            parentThis,
            parentThis.props.id
        );

        const compositeFields = this.getFieldsByComposite(treeObject);

        const attributes = options.attributes;
        const where = options.where;
        const order = options.order;

        const newWhere = this.mutateWhere({
            where: structuredClone(where),
            compositeFields,
        });
        const newAttributes = this.mutateAttributes({
            attributes: structuredClone(attributes),
            compositeFields,
        });
        const newOrder = this.mutateOrder({
            order: structuredClone(order),
            compositeFields,
        });

        const name2spec = this.#mk_fields_name2spec(treeObject); // нужно для Trino, который не преобразует типы автоматически (напр. ругается на сравнение varchar с uuid)

        //NOTE зачем формируются и передаются attributes и order?
        //NOTE по логике они не нужны; кроме того они вообще зачищаются из опций, см. AbstractConnector.count()
        let result = await connector.count(table, {
            ...options,
            attributes: newAttributes,
            where: newWhere,
            order: newOrder,
            name2spec,
        });
        result = this.transformRows(result, compositeFields);
        return result;
    }
    async dataUpdateInner(innerResult, functionParams) {
        if (typeof functionParams?.this?.tableInfo !== 'function') {
            return innerResult;
        }
        const {
            connector,
            table,
            values,
            options,
            this: parentThis,
        } = functionParams;

        const treeObject = await parentThis.tableInfo(
            parentThis,
            parentThis.props.id
        );
        const item = await Metadata.getItem(parentThis.props.id);
        const compositeFields = this.getFieldsByComposite(treeObject);
        const parent = await Metadata.getItem(parentThis.props.owner_id);

        const where = options.where;

        const newWhere = this.mutateWhere({
            where: structuredClone(where),
            compositeFields,
        });
        const newValues = this.mutateValues({
            values: structuredClone(values),
            compositeFields,
        });

        const name2spec = this.#mk_fields_name2spec(treeObject); // нужно для Trino, который не преобразует типы автоматически (напр. ругается на сравнение varchar с uuid)

        let result = await connector.update(table, newValues, {
            ...options,
            metadata: {
                id: parentThis.props.id,
                treeObject,
                item,
                isTabularPart: parentThis.component === 'TabularParts',
                parent,
            },
            where: newWhere,
            name2spec,
        });

        return result;
    }

    async dataCreateInner(innerResult, functionParams) {
        if (typeof functionParams?.this?.tableInfo !== 'function') {
            return innerResult;
        }
        const {
            connector,
            table,
            values,
            options,
            this: parentThis,
        } = functionParams;

        const treeObject = await parentThis.tableInfo(
            parentThis,
            parentThis.props.id
        );
        const item = await Metadata.getItem(parentThis.props.id);
        const compositeFields = this.getFieldsByComposite(treeObject);
        const parent = await Metadata.getItem(parentThis.props.owner_id);

        const newValues = this.mutateValues({
            values: structuredClone(values),
            compositeFields,
        });
        const name2spec = this.#mk_fields_name2spec(treeObject);

        let result = await connector.create(table, newValues, {
            ...options,
            metadata: {
                id: parentThis.props.id,
                treeObject,
                item,
                isTabularPart: parentThis.component === 'TabularParts',
                parent,
            },
            name2spec,
        });

        return result;
    }

    async dataBulkCreateInner(innerResult, functionParams) {
        if (typeof functionParams?.this?.tableInfo !== 'function') {
            return innerResult;
        }
        const {
            connector,
            table,
            values,
            options,
            this: parentThis,
        } = functionParams;

        const treeObject = await parentThis.tableInfo(
            parentThis,
            parentThis.props.id
        );
        const item = await Metadata.getItem(parentThis.props.id);
        const compositeFields = this.getFieldsByComposite(treeObject);
        const parent = await Metadata.getItem(parentThis.props.owner_id);

        // const where = options.where;
        // const newWhere = this.mutateWhere({ where: structuredClone(where), treeObject });
        const newValues = this.mutateValues({
            values: structuredClone(values),
            compositeFields,
        });
        const name2spec = this.#mk_fields_name2spec(treeObject);

        let result = await connector.bulkCreate(table, newValues, {
            ...options,
            metadata: {
                id: parentThis.props.id,
                treeObject,
                item,
                isTabularPart: parentThis.component === 'TabularParts',
                parent,
            },
            name2spec,
        });

        return result;
    }

    async dataDeleteInner(innerResult, functionParams) {
        if (typeof functionParams?.this?.tableInfo !== 'function') {
            return innerResult;
        }
        const { connector, table, options, this: parentThis } = functionParams;

        const appendOptions = { transaction: options.transaction }; //Нужно удалить из всей

        const treeObject = await parentThis.tableInfo(
            parentThis,
            parentThis.props.id
        );
        const name2spec = this.#mk_fields_name2spec(treeObject); // нужно для Trino, который не преобразует типы автоматически (напр. ругается на сравнение varchar с uuid)

        const result = await connector.delete(
            table,
            { ...options, name2spec },
            appendOptions
        );
        return result;
    }

    async dataSynchInner(innerResult, functionParams) {
        if (typeof functionParams?.this?.tableInfo !== 'function') {
            return innerResult;
        }
        const { connector, table, options, this: parentThis } = functionParams;

        const opt = structuredClone(options);
        const treeObject = await parentThis.tableInfo(
            parentThis,
            parentThis.props.id
        );
        const fields = await this.generateSyncField(null, {
            fields: treeObject.Fields,
        });
        opt.Fields = fields;

        const result = await connector.synch(table, opt);
        return result;
    }

    /**** СЛУЖЕБНЫЕ ФУНКЦИИ  ****/
    mutateValues({ values, compositeFields }) {
        if (Array.isArray(values)) {
            return values.map((value) => {
                return this.mutateValue({ values: value, compositeFields });
            });
        } else {
            return this.mutateValue({ values, compositeFields });
        }
    }

    mutateValue({ values, compositeFields }) {
        let result = values;
        if (values) {
            const composites = Object.keys(compositeFields);

            Object.keys(values).forEach((field) => {
                if (composites.includes(field)) {
                    let value = values[field];
                    const newValue = this.transformCompositeToFields(
                        field,
                        value
                    );
                    delete result[field];
                    result = { ...result, ...newValue };
                }
            });
        }

        return result;
    }

    transformRows(rows, compositeFields) {
        let result = rows;
        if (Array.isArray(rows)) {
            result = rows.map((row) => {
                return this.addTransformCompositeField(row, compositeFields);
            });
        }
        return result;
    }

    addTransformCompositeField(row, compositeFields) {
        Object.values(compositeFields).forEach((field) => {
            const fieldType = row[`${field.field}__type`];
            if (fieldType !== undefined) {
                //обрабатываем только если такое поле есть в результате
                const newField = {
                    type: fieldType,
                    value: null,
                };

                // 0: 'string',
                // 1: 'float',
                // 2: 'boolean',
                // 3: 'datetime',
                // 10: 'composite',
                switch (fieldType) {
                    case 0: {
                        newField.value = row[`${field.field}__string`];
                        break;
                    }
                    case 1: {
                        newField.value = row[`${field.field}__float`];
                        break;
                    }
                    case 2: {
                        newField.value = row[`${field.field}__boolean`];
                        break;
                    }
                    case 3: {
                        newField.value = row[`${field.field}__datetime`];
                        break;
                    }
                    case 10: {
                        newField.link = row[`${field.field}__link`];
                        newField.value = row[`${field.field}__value`];
                        break;
                    }
                }
                row[field.field] = newField;

                field.multiRefFields.forEach((info) => {
                    delete row[info.name];
                });
            }
        });
        return row;
    }

    transformCompositeToFields(fieldName, value) {
        let result = {};
        const fieldType = value?.type;

        if (fieldType !== undefined) {
            switch (fieldType) {
                case 0: {
                    result[`${fieldName}__type`] = fieldType;
                    result[`${fieldName}__string`] = value.value;
                    break;
                }
                case 1: {
                    result[`${fieldName}__type`] = fieldType;
                    result[`${fieldName}__float`] = value.value;
                    break;
                }
                case 2: {
                    result[`${fieldName}__type`] = fieldType;
                    result[`${fieldName}__boolean`] = value.value;
                    break;
                }
                case 3: {
                    result[`${fieldName}__type`] = fieldType;
                    result[`${fieldName}__datetime`] = value.value;
                    break;
                }
                case 10: {
                    if (value.link) {
                        result[`${fieldName}__link`] = value.link;
                        result[`${fieldName}__type`] = fieldType;
                        result[`${fieldName}__value`] = value.value;
                    }
                    break;
                }
            }
        }

        return result;
    }

    getFieldsByComposite(treeObject) {
        const result = {};
        Object.keys(treeObject.Refs)
            .filter((field) => treeObject.Refs[field].type === 'composite')
            .forEach((field) => {
                result[field] = treeObject.Refs[field];
            });
        return result;
    }

    mutateGroup({ group, compositeFields }) {
        let result = group;

        if (group) {
            const newResult = [];
            group.forEach((field) => {
                const composites = Object.keys(compositeFields);
                if (composites.includes(field)) {
                    newResult.push(`${field}__link`);
                    newResult.push(`${field}__type`);
                    newResult.push(`${field}__value`);
                } else {
                    newResult.push(field);
                }
            });
            result = newResult;
        }

        return result;
    }

    mutateOrder({ order, compositeFields }) {
        let result = order;
        if (order) {
            result = order.map((orderElem) => {
                let [field, typeOrder] = orderElem;

                const composites = Object.keys(compositeFields);
                if (composites.includes(field)) {
                    field = `${field}__value`;
                }

                return [field, typeOrder];
            });
        }

        return result;
    }

    mutateAttributes({ attributes, compositeFields }) {
        const result = [];

        const cmp_fields = Object.keys(compositeFields);

        attributes.forEach((attr) => {
            const item =
                typeof attr === 'object'
                    ? Array.isArray(attr)
                        ? attr[1]
                        : attr.alias
                    : attr;

            if (!cmp_fields.includes(item)) {
                result.push(attr);
            } else {
                //Это композитное поле
                result.push(
                    ...compositeFields[item].multiRefFields.map(({ name }) => [
                        `${name}`,
                        `${name}`,
                    ])
                );
            }
        });

        return result;
    }

    mutateWhere({ where, compositeFields }) {
        // const multiFields = this.getMultiFieldsMapping(treeObject);
        const objectFields = Object.keys(compositeFields);

        if (objectFields.length > 0) {
            const whereFields = this.getWhereFields(where);
            const diffFields = this.intersection(whereFields, objectFields);

            if (diffFields.length > 0) {
                //Есть пересечения, т.е. есть условия по композитам
                let localWhere = structuredClone(where);
                diffFields.forEach((field) => {
                    localWhere = this.changeWhere(localWhere, {
                        field,
                        compositeFields,
                    }); //treeObject
                    // console.log(localWhere)
                });

                return localWhere;
            }
        }

        return where;
    }

    async getCompositeFields(innerResult, functionParams) {
        const { multiRef, field } = functionParams;
        const typeMapping = {
            0: 'string',
            1: 'float',
            2: 'boolean',
            3: 'datetime',
            10: 'ref',
        };

        if (!multiRef?.length) return [];

        /** @type {string[]} */
        const types = uniqueValues(multiRef.map(({ type }) => type));

        const result = types
            .map((type) => {
                const localType = typeMapping[type];

                if (localType === 'ref') {
                    return [
                        {
                            type: 'UUID',
                            name: `${field}__link`,
                            shortName: 'link',
                        },
                        {
                            type: 'UUID',
                            name: `${field}__value`,
                            shortName: 'value',
                        },
                    ];
                }

                return {
                    type: localType,
                    name: `${field}__${localType}`,
                    shortName: localType,
                };
            })
            .flat();

        result.push({
            type: 'INTEGER',
            name: `${field}__type`,
            shortName: 'type',
        });

        return result;
    }

    /**** ВЫЧИСТИТЬ ФУНКЦИИ ОТ МУСОРА ****/

    /**
     * @private
     *
     * пройдемся по дереву и найдем все составные филды и сделаем по ним мапу чтобы знать их структуру
     *
     * @param {object} treeObject
     * @returns {Record<string, Record<string, boolean>>}
     */
    getMultiFieldsMapping(treeObject) {
        /** @type {Record<string, Record<string, boolean>>} */
        const multiFields = {};

        for (const key in treeObject.Fields) {
            const { type, multiRef } = treeObject.Fields[key];

            if (type !== compositeName) continue;

            multiRef.map(({ type }) => {
                multiFields[key] ||= {};
                multiFields[key][type] ||= true;
            });
        }

        return multiFields;
    }

    /**
     * @public
     *
     * проходимся по телу запроса и мутируем его с учетом составных полей
     */
    async generateBodyAfter(innerResult, functionParams) {
        const { id, body, tableInfo: treeObject } = innerResult;

        const multiFields = this.getMultiFieldsMapping(treeObject);

        const newBody = {};

        const newFields = [];
        for (const field in body) {
            /** @type {{ type: number, link?: string, value: string | number | Date }} */
            const bodyValue = body[field];

            if (!multiFields[field]) {
                newBody[field] = bodyValue;
                continue;
            }

            if (bodyValue) {
                const type = bodyValue === null ? null : bodyValue.type;
                const link = bodyValue === null ? null : bodyValue.link;
                const value = bodyValue === null ? null : bodyValue.value;

                if (isNil(type)) {
                    // throw ApiError.BadRequest(`Не передан тип поля сохраняемых данных для поля ${field}`);
                    // Ну не передан - не сохраняй его, зачем крашить всё
                    // console.warn(`Не передан тип поля сохраняемых данных для поля ${field}`)
                    newBody[`${field}__type`] = null;
                    newBody[`${field}__link`] = null;
                    newBody[`${field}__value`] = null;
                } else {
                    if (type === 10) {
                        //(/ref/i.test(type)) { Непонятно в чем сокральный смысл этого regex'па ...
                        newBody[`${field}__type`] = type; //this.parseType(type);
                        newBody[`${field}__link`] = link;
                        newBody[`${field}__value`] = value;
                    } else {
                        const fieldType = this.parseType(type);
                        newBody[`${field}__type`] = type;
                        newBody[`${field}__${fieldType}`] = value;
                    }
                }
            }
        }

        newFields.forEach((field) => mergeDeep(newBody, field));

        return { id, body: newBody, treeObject };
    }

    /**
     * @public
     * проходимся по телу фильтра и мутируем его с учетом составных полей
     *
     * @param {*} innerResult
     * @param {*} functionParams
     * @returns
     */
    async generateWhereAfter(innerResult, functionParams) {
        const { id, where, tableInfo: treeObject } = innerResult;

        const result = this.mutateWhere({ where, treeObject });

        return { id, where: result, tableInfo: treeObject };
    }

    async getFieldNameFromRow(innerResult, functionParams) {
        const { row, key: field } = functionParams;

        const type = row[`${field}__type`];

        return this.getFieldName(field, type);
    }

    getFieldName(field, type) {
        const fieldType =
            typeMapping[type] === typeMapping[10] ? 'value' : typeMapping[type];

        return `${field}__${fieldType}`;
    }

    /**
     * @private
     *
     * @param {number} type
     * @returns
     */
    parseType(type) {
        const typeMapping = {
            0: 'string',
            1: 'float',
            2: 'boolean',
            3: 'datetime',
            10: 'ref',
        };
        return typeMapping[type];
    }

    async generateOptionsAfter(innerResult, functionParams) {
        const { id, options, tableInfo: treeObject } = innerResult;

        if (!options.attributes?.length)
            options.attributes = Object.keys(treeObject.Fields);
        //подумать надо ли допом группировать
        if (!options.group?.length) {
        }

        options.attributes = this.mutateAttributes({
            attributes: options.attributes,
            treeObject,
        });
        options.where = this.mutateWhere({
            where: options.where || {},
            treeObject,
        });

        return { id, options, treeObject };
    }

    /**
     * @private
     *
     * @param {{ attributes: (string | [string, string] | { func: string, field: string, alias: string })[], treeObject: { Fields: Record<string, IField> } }} param0
     */

    getWhereFields(where) {
        let fields = [];

        if (Array.isArray(where)) {
            //Это не может быть значение возможно это значение агрегата (типа OR или AND)
            where.forEach((val) => {
                const ff = this.getWhereFields(val);
                fields = [...fields, ...ff];
            });
        } else if (typeof where === 'object') {
            //Это объект возможно полезный
            Object.keys(where).forEach((key) => {
                if (key.indexOf('$') === 0) {
                    //Это OR или AND
                    const ff = this.getWhereFields(where[key]);
                    fields = [...fields, ...ff];
                } else {
                    fields.push(key);
                }
            });
        }

        return [...new Set(fields)];
    }

    isUUID(uuid) {
        const pattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return pattern.test(uuid);
    }

    changeWhere(where, { field, compositeFields }) {
        //treeObject
        let result = where;

        if (Array.isArray(where)) {
            //Это не может быть значение возможно это значение агрегата (типа OR или AND)
            result = [];
            where.forEach((val) => {
                const ff = this.changeWhere(val, { field, compositeFields });
                result = [...result, ff];
            });
        } else if (typeof where === 'object') {
            //Это объект возможно полезный
            result = {};
            Object.keys(where).forEach((key) => {
                if (key.indexOf('$') === 0) {
                    //Это OR или AND
                    const ff = this.changeWhere(where[key], {
                        field,
                        compositeFields,
                    });
                    result = mergeDeep(result, { [key]: ff });
                } else if (key === field) {
                    //
                    let val = where[key];
                    if (typeof val === 'string' && this.isUUID(val)) {
                        const link = compositeFields[field].multiRef
                            .filter((item) => item.type === 10)
                            .map((item) => item.value);

                        val = {
                            link: link,
                            type: 10,
                            value: val,
                        };
                    }

                    const operators = Object.keys(val);

                    if (
                        operators.length > 0 &&
                        operators[0].indexOf('$') === 0
                    ) {
                        let compositeTypeValue;

                        switch (val[operators[0]].type) {
                            case 0:
                                compositeTypeValue = 'string';
                                break;
                            case 1:
                                compositeTypeValue = 'float';
                                break;
                            case 2:
                                compositeTypeValue = 'boolean';
                                break;
                            case 3:
                                compositeTypeValue = 'datetime';
                                break;
                            default:
                                compositeTypeValue = 'value';
                        }

                        // let link = {};
                        let linkValue = val[operators[0]].link;
                        // if (linkValue) {
                        //     link =
                        // }
                        const $and = [];
                        linkValue &&
                            $and.push({
                                [`${field}__link`]: val[operators[0]].link,
                            });
                        $and.push({
                            [`${field}__type`]: val[operators[0]].type,
                        });
                        $and.push({
                            [`${field}__${compositeTypeValue}`]: {
                                [operators[0]]: val[operators[0]].value,
                            },
                        });

                        result = {
                            ['$and']: $and,
                        };
                    }

                    if ('value' in val && 'link' in val) {
                        const field__link = val.link;
                        const field__type = val.type;
                        const field__value = val.value;

                        const $and = {
                            ['$and']: [
                                { [`${field}__link`]: field__link },
                                { [`${field}__type`]: field__type },
                                { [`${field}__value`]: field__value },
                            ],
                        };

                        result = mergeDeep(result, $and);
                    }
                } else {
                    result = { ...result, [key]: where[key] };
                }
            });
        }

        return result;
    }

    intersection(arr1, arr2) {
        return arr1.filter((value) => arr2.includes(value));
    }

    async generateKeys(innerResult, functionParams) {
        const { keys, treeObject } = functionParams;

        for (const key in keys) {
            const keyValue = keys[key];

            const fields = keyValue.fields;

            const fieldsToDel = [];
            for (const fieldKey in fields) {
                const treeField = treeObject.Fields[fieldKey];

                if (treeField.type === compositeName) {
                    const { multiRefFields } = treeField;

                    multiRefFields.forEach(({ name }) => {
                        fields[name] = {
                            name,
                            description: name,
                            field: name,
                        };
                    });

                    fieldsToDel.push(fieldKey);
                }
            }

            fieldsToDel.forEach((field) => delete fields[field]);
        }

        return keys;
    }

    /**
     * @param {*} innerResult
     * @param {{ name: string, fields: string[], meta: Record<string, { type: string, multiRefFields: IMultiRef[] }> }} functionParams
     */
    async generateLeftoverBefore(innerResult, functionParams) {
        const { name, fields, meta } = functionParams;

        const multiFields = [];

        fields.forEach((field) => {
            const fieldMeta = meta[field];
            if (fieldMeta.type !== compositeName) {
                multiFields.push(field);

                return;
            }

            fieldMeta.multiRefFields.forEach(({ name }) =>
                multiFields.push(name)
            );
        });

        functionParams.fields = multiFields;

        return innerResult;
    }

    async generateSysKeys(innerResult, functionParams) {
        //
        const { keys, treeObject } = functionParams;
        const result = {};
        for (const key in keys) {
            const fieldsObject = {};
            keys[key].forEach(
                (name) => (fieldsObject[name] = treeObject.Fields[name])
            );
            result[key] = await this.generateSyncField(undefined, {
                fields: fieldsObject,
            });
            result[key] = Object.keys(result[key]);
        }
        return result;
    }

    /**
     * @private
     *
     * @param {*} arr
     * @param {*} field
     * @returns
     */
    convertArrayValuesToMultiValues(arr, field) {
        const result = [];

        if (!Array.isArray(arr)) return result;

        arr.forEach((searchWhere) => {
            if (
                typeof searchWhere === 'object' &&
                !Array.isArray(searchWhere) &&
                searchWhere.link &&
                searchWhere.type &&
                searchWhere.value
            ) {
                result.push({
                    ['$and']: [
                        { [`${field}__link`]: searchWhere.link },
                        { [`${field}__type`]: searchWhere.type },
                        { [`${field}__value`]: searchWhere.value },
                    ],
                });
                // return result;
            } else {
                const val = this.findFirstValue(searchWhere);
                if (isUuid(val)) {
                    this.addMultiValue(val, field, 10, 'value', result);
                } else if (typeof val === 'string') {
                    this.addMultiValue(searchWhere, field, 0, 'string', result);
                } else if (typeof val === 'number') {
                    this.addMultiValue(searchWhere, field, 1, 'float', result);
                }
            }
        });

        return result;
    }

    /**
     * @private
     *
     * @param {*} searchWhere
     * @param {*} field
     * @param {*} type
     * @param {*} prefix
     * @param {*} arr
     */
    addMultiValue(searchWhere, field, type, prefix, arr) {
        const where = {
            ['$and']: [
                { [`${field}__type`]: type },
                { [`${field}__${prefix}`]: searchWhere },
            ],
        };

        arr.push(where);
    }

    /**
     * @private
     *
     * рекурсивно пройти по дереву и найти первое ненулевое значение
     *
     * @param {object} where
     * @returns
     */
    findFirstValue(where) {
        let value = where;
        if (typeof where === 'object') {
            for (const key in where) {
                value = this.findFirstValue(where[key]);
            }
        }

        return value;
    }

    /**
     * @public
     *
     * @param {{ treeObject: { Fields: Record<string, IField>, FieldsGUID: Record<string, IField> }}} functionParams
     */
    async hydrateTreeObject(innerResult, functionParams) {
        const { treeObject } = functionParams;

        const tree = structuredClone(treeObject);

        const fields = tree.Fields;
        const keys = tree.Keys;

        tree.Fields = await this.generateSyncField(null, { fields });
        tree.Keys = await this.generateKeys(null, { keys, treeObject });

        tree.FieldsGUID = {};
        tree.KeyGUID = {};
        for (const key in tree.Fields) {
            const field = tree.Fields[key];

            tree.FieldsGUID[field.id] = field;
        }
        for (const key in tree.Keys) {
            const field = tree.Keys[key];

            tree.KeyGUID[field.id] = field;
        }

        return tree;
    }

    /**
     * @param {{ fields: Record<string, IField> }} functionParams
     */
    async generateSyncField(innerResult, functionParams) {
        const { fields } = functionParams;

        const result = {};
        for (const key in fields) {
            const field = fields[key];

            if (field.type !== compositeName) {
                result[key] = field;
                continue;
            }

            if (!field.multiRefFields?.length) {
                field.type = 'UUID';

                result[key] = field;

                continue;
            }

            field.multiRefFields.forEach(({ type, name: attr }) => {
                const multiField = structuredClone(field);

                multiField.id = stringToUUID(multiField.id + attr);
                multiField.type = type;
                multiField.field = attr;
                multiField.value = attr;
                multiField.notnull = false;
                multiField.increment = false;

                result[attr] = multiField;
            });
        }

        return result;
    }

    /**
     * собирает свойства полей из treeObject: в некоторых коннекторах для формирования запросов нужно знание о типах (и, возможно, других свойствах) полей
     * @param {object} treeObject
     */
    /* no async */ #mk_fields_name2spec(treeObject) {
        console.log({ Fields: treeObject.Fields });
        const name2spec = {};
        for (const field of Object.values(
            treeObject.AllFieldsGUID ??
                treeObject.AllFields ??
                treeObject.FieldsGUID ??
                treeObject.Fields
        )) {
            name2spec[field.field] = {
                type: field.type, // "metadata type", not "sql type"; it's connector responsibility to handle transpilation (e.g. string -> varchar)
                length: field.len, // note property name difference
                default: field.default, // default field value on insertion
                // rest props are unused for now
                // notnull: field.notnull, // "nullable" in sql terms (inverted logic)
                // ...
            };
        }

        return name2spec;
    }
}

module.exports = MetaMultiFieldService;
