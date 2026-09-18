const MetadataClass = require('../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();
const ApiError = require('../../core/exceptions/ApiError');
const { isNil, mergeDeep } = require('../utils/services');
const Extensions = require('../../core/class/Extensions.class');
const { NIL } = require('uuid');

/**
 * @class  RefsClass
 */
class RefsClass extends Extensions {
    /**
     * @param {{ id: string | { link: string, value: string }, key?: string }} param0
     * @param {string[]} PKsData
     * @returns {Promise<Record<string, any>>}
     */
    async readRef({ id, key }, PKsData) {
        // TODO работает только с ключами 1 к 1, не поддерживает составные ключи
        const result = {};

        if (id?.value === NIL) return result;

        const meta = await Metadata.getParentInstance(id?.value || id, {}); // new TableClass({ id });

        if (!meta) {
            throw new ApiError(-1000, 'Ошибка типа ссылки на объект');
        }

        const idValue = typeof id === 'object' ? id.value : id;
        const treeObject = await meta.tableInfo(meta, idValue);

        let view;
        let viewAlias;
        const PKs = [];
        for (const keyName in treeObject.Keys) {
            const guidKey = treeObject.Keys[keyName];
            const findKey = !key ? guidKey.settings.primarykey : guidKey.id === key; // Если не ищем какой-то особенный ключ, то ищем только первичный
            if (findKey) {
                PKs.push(guidKey);
                if (guidKey.settings.templateview && guidKey.settings.templateview.trim() !== '') {
                    let template = guidKey.settings.templateview;
                    const reg = /\[\[\s*(?<field>[-_a-z0-9]+)\s*\]\]/gimu;
                    const array = [...guidKey.settings.templateview.matchAll(reg)];
                    array.forEach((value) => {
                        template = template.replaceAll(value[0], `'&&${value.groups.field}&&'`);
                    });
                    template = `'${template}'`.split('&&');
                    viewAlias = '__view__';
                    view = [`CONCAT(${template.join(' , ')})`, viewAlias];
                } else if (guidKey.settings.fieldview) {
                    const fieldView =
                        typeof guidKey.settings.fieldview === 'object'
                            ? guidKey.settings.fieldview.value
                            : guidKey.settings.fieldview;
                    view =
                        treeObject.AllFieldsGUID?.[fieldView]?.field ??
                        treeObject.FieldsGUID[fieldView]?.field;
                    viewAlias = view;
                }
            }
        }

        const PK = Object.keys(PKs[0].fields);
        const PKAlias = PK.join('_');
        const PKField = PK.length > 1 ? `CONCAT(${PK.join(", '::' ,")})` : PK[0];

        const PKAttribute = PK.length > 1 ? [PKField, PKAlias] : PKField;
        const PKWhere = PK.length > 1 ? `$sql(${PKField})` : PKField;
        const attributes = [];

        if (!view) view = PKField;

        attributes.push(view);

        if (attributes.length > 0) {
            const options = {
                attributes: [PKAttribute, ...attributes],
                where: {
                    [PKWhere]: PKsData,
                },
                hierarchy: false,
                withHierarchy: false,
                withOutCount: true,
                withOutOrder: true,
                withOutRefs: true,
            };

            const { rows = [] } = await meta.read(idValue, options);

            rows.forEach((item) => (result[item[PKAlias]] = item[viewAlias]));
        } else {
            PKsData.forEach((item) => (result[item] = item));
        }

        return result;
    }

    /**
     * TODO вынести
     * @param {*} ref
     * @param {object} row
     * @returns {Promise<void>}
     */
    async getRefValue(row, ref, refsData) {
        let fieldName = ref.field;

        const realValue = row[fieldName];
        let value = row[fieldName];
        if (ref.type === 'composite') {
            value = realValue.value ?? row[`${fieldName}__value`];
        }

        if (isNil(value) || value === NIL) return;

        refsData[ref.field] ||= {};
        if (ref.type === 'composite') {
            const link = realValue?.link ?? row[`${ref.field}__link`];
            if (link) {
                let meta;
                ref.multiRef.forEach((refType) => {
                    refType.value === link ? (meta = refType.link) : undefined;
                });

                refsData[ref.field][value] = {
                    link: meta,
                    value: link,
                };
            }
        } else {
            refsData[ref.field][value] = (refsData[ref.field][value] ?? 0) + 1;
        }
    }

    /**
     * @param {*} refs
     * @param {object[]} rows
     * @returns {Record<string, Record<string, number>>}
     */
    getRefValues(refs, rows) {
        /** @type {Record<string, Record<string, number>>} */
        const refsData = {};

        Object.keys(refs).forEach((key) => (refsData[key] = {}));

        const refsArray = Object.values(refs);
        rows.forEach((row) => {
            refsArray.forEach((ref) => {
                //В каких случаях он может быть Array ???
                if (Array.isArray(ref)) {
                    ref.forEach((ref) => this.getRefValue(row, ref, refsData));
                } else {
                    this.getRefValue(row, ref, refsData);
                }
            });
        });

        return refsData;
    }

    /**
     * @param {{ options: object, rows: object[], treeObject: { Fields: Record<string, IField>, Refs: object } }} param0
     * @returns
     */
    async getRefs({ options, rows, treeObject }) {
        if (options.withOutRefs || !rows.length) return { rows, refs: {} };

        const [row] = rows;
        const keys = Object.keys(row);

        const refsForLoad = {};
        // вытащим только те поля на которые нам нужны рефы
        keys.forEach(
            (field) => treeObject.Refs[field] && (refsForLoad[field] = treeObject.Refs[field])
        );

        const multiFields = {};
        //TODO вынести в отдельный модуль
        // проверим составные поля
        for (const key in treeObject.Fields) {
            const { multiRef, field, type } = treeObject.Fields[key];
            if (type !== 'composite' || !multiRef.length) continue;

            // const fieldName = `${field}__value`;
            multiFields[field] = treeObject.Fields[key]; //fieldName;

            // const arr = multiRef.filter(({ link, value }) => link && value);
            // refsForLoad[field] ||= [];
            // refsForLoad[field].push(...arr.map((item) => ({ ref: item, field: fieldName })));

            refsForLoad[field] = treeObject.Fields[key];
        }

        const refs = await this.getAllRefs(refsForLoad, rows);
        // for (const key in multiFields) {
        // const item = multiFields[key];
        // const value = refs[item];
        // if (value) {
        //     refs[key] = structuredClone(value);
        //     delete refs[multiFields[key]];
        // }

        //TODO КОСТЫЛИЩЕ!!!!!
        // refs[key] = {}
        // const value = refs[key];
        // }

        const result = rows || [];

        return { rows: result, refs };
    }

    /**
     * @param {*} refs
     * @param {*} rows
     * @returns
     */
    async getAllRefs(refs, rows) {
        const keys = Object.keys(refs);
        const refData = this.getRefValues(refs, rows);

        //TODO вынести
        //Очень хреновый код
        const promise = keys.map(async (key, i) => {
            const refItem = refs[key]; //keys[i]];

            const getRefData = async (refItem, refData) => {
                if (refItem.foreignkey) {
                    const idGuide = refItem.ref;
                    if (refData[key]) {
                        const PK = Object.keys(refData[key]).filter((val) => val !== 'null');
                        refData[key] = mergeDeep(
                            refData[key] || {},
                            await this.readRef(idGuide, PK)
                        );
                    }
                } else if (refItem.type === 'composite') {
                    //Есть особенности реализации, поэтому этот else должен быть здесь!
                    for (let value in refData[key]) {
                        // if (ref.value === refData[key].link )
                        const idGuide = refData[key][value];
                        const temp = await this.readRef({ id: idGuide }, [value]);
                        // console.log(temp);
                        refData[key] = { ...refData[key], ...temp }; // mergeDeep(refData[key] || {}, temp)
                    }
                    // console.log(refItem, refData);
                } else if (
                    refItem.ref &&
                    (typeof refItem.ref === 'string' || typeof refItem.ref === 'object')
                ) {
                    const idGuide = refItem.ref;
                    if (refData[key]) {
                        const PK = Object.keys(refData[key]).filter((val) => val !== 'null');

                        if (PK.length > 0) {
                            const temp = await this.readRef({ id: idGuide }, PK);
                            refData[key] = mergeDeep(refData[key] || {}, temp);
                        }
                    }
                }
            };

            //Опять... в каких случая он может быть array ???
            if (Array.isArray(refItem)) {
                const promise = refItem.map(async (refItem) => getRefData(refItem, refData));
                await Promise.all(promise);
            } else {
                await getRefData(refItem, refData);
            }
        });

        await Promise.all(promise);

        return refData;
    }
}

module.exports = RefsClass;
