/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');

/** LOCAL * */
const ValuesClass = require('./shared/Values.class');

const constants = require('../../constants');

class EnumsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Enums';
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
            routes: constants[name].routes,
        };
    }

    async subTree(item, options = {}) {
        const children = [];

        const Fields = await new ValuesClass({ owner_id: item.id, parent: item }).tree(options);
        children.push(Fields);

        return children;
    }

    async tableInfo(meta, id) {
        const children = await meta.getOwnerChildren(id);

        const Keys = {};
        const KeysGUID = {};
        const Fields = {};
        const FieldsGUID = {};
        const Values = {};
        const ValuesGUID = {};

        for (const child of children) {
            if (child.class === 'Values') {
                const fieldInfo = child.manifest.settings;

                Values[fieldInfo.key] = {
                    key: fieldInfo.key,
                    value: fieldInfo.value,
                    name: child.name,
                    description: child.description,
                    id: child.id,
                };
                ValuesGUID[child.id] = Values[fieldInfo.key];
            }
        }

        // Псевдоописание таблицы, чтобы правильно собрать REF
        const fieldKeyID = '402c8bc8-3998-426a-85a5-235ab1d71f33';
        Fields.key = {
            field: 'key',
            name: 'Key',
            description: 'Key',
            id: fieldKeyID,
            type: 'text',
            off: false,
            virtual: false,
            value: 'key',
        };
        FieldsGUID[fieldKeyID] = Fields.key;

        const fieldValueID = 'f89e3178-bb55-4df7-86b5-122285941c74';
        Fields.value = {
            field: 'value',
            name: 'Values',
            description: 'Values',
            id: fieldValueID,
            type: 'text',
            off: false,
            virtual: false,
            value: 'value',
        };
        FieldsGUID[fieldValueID] = Fields.value;

        const keyID = id;
        Keys.Key = {
            name: 'Key',
            description: 'Key',
            id: keyID,
            fields: {
                key: {
                    field: 'key',
                    name: 'Key',
                    description: 'key',
                    value: keyID,
                },
            },
            settings: {
                id: keyID,
                primarykey: true,
                fieldview: fieldValueID,
                templateview: '',
            },
        };
        KeysGUID[keyID] = Keys.Key;

        return {
            Keys,
            KeysGUID,
            Fields,
            FieldsGUID,
            AllFields: Fields,
            AllFieldsGUID: FieldsGUID,
            Values,
            ValuesGUID,
        };
    }

    /**
     * @param {string} id
     * @param {object} options
     */
    async read(id, options = {}) {
        const meta = new EnumsClass({ id });
        const treeObject = await this.tableInfo(meta, id);

        const offset = options.offset ?? 0;

        const result = {
            rows:
                offset === 0
                    ? Object.values(treeObject.Values).map((data) => ({
                          key: data.key,
                          value: data.value,
                      }))
                    : [],
            cols: Object.values(treeObject.Fields),
            refs: {},
            options,
            hierarchy: {},
            metadata: {
                ...meta,
                treeObject,
            },
        };

        return result;
    }

    async update(id, body) {
        return { result: false };
    }

    async create(id, body) {
        return { result: false };
    }

    async delete(id, body) {
        return { result: false };
    }
}

module.exports = EnumsClass;
