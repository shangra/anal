const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const constants = require('../../../constants');
const FizFieldsListClass = require('./FizFieldsList.class');

class FieldsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Fields';
        this.id = constants[name].id;
        this.component = constants[name].component;

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c', 's', 'd'],
            routes: constants[name].routes,
            parent: props.parent,
        };
    }

    async subTree(item, options = {}) {
        const children = [];
        const FieldsList = await new FizFieldsListClass({ owner_id: item.id, parent: this.props.parent }).tree(options);
        children.push(FieldsList);

        return children;
    }
}

module.exports = FieldsClass;
