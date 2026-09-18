/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');

/** LOCAL * */
const ConditionClass = require('./shared/Condition.class');

const constants = require('../../constants');

class RlsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Rls';
        this.id = constants[name].id;
        this.component = constants[name].component;
        this.childrenCRUD = ['u', 'd', 'rls'];

        this.props = {
            id: this.id,
            owner_id: '00000000-0000-0000-0000-000000000000',
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c', 's', 'rls'],
            routes: constants[name].routes,
        };
    }

    async subTree(item, options = {}) {
        const children = [];

        const Fields = await new ConditionClass({
            owner_id: item.id,
            parent: item,
        }).tree(undefined, options);
        children.push(Fields);

        return children;
    }

    async tableInfo(meta, id, options) {
        const children = await meta.getOwnerChildren(id, options);

        const ConditionsGUID = {};

        for (const child of children) {
            if (child.class === 'Condition') {
                const fieldInfo = child.manifest.settings;
                const off = fieldInfo.onoff ?? false;
                if (!off) {
                    ConditionsGUID[fieldInfo.id] = {
                        id: fieldInfo.id,
                        name: child.name,
                        description: child.description,
                        conditionuser: fieldInfo.conditionuser,
                        conditionobject: fieldInfo.conditionobject,
                    };
                }
            }
        }

        return {
            ConditionsGUID,
        };
    }

    async read(id, options = {}) {
        return { result: false };
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

module.exports = RlsClass;
