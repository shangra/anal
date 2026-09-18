const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const FieldsListClass = require('./FieldsList.class');
const constants = require('../../../constants');

class KeysClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Keys';

        this.id = constants[name].id;
        this.component = constants[name].component;
        this.owner_id = props.owner_id;

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c'],
            routes: constants[name].routes,
            parent: props.parent,
        };
    }

    async subTree(item, options = {}) {
        const children = [];

        const FieldsList = await new FieldsListClass({
            owner_id: item.id,
            parent: this.props.parent,
        }).tree(options);
        children.push(FieldsList);

        return children;
    }
}

module.exports = KeysClass;
