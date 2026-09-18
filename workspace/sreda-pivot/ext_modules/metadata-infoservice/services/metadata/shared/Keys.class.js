const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const FieldsListClass = require('./FieldsList.class');

class KeysClass extends LevelClass {
    constructor(props) {
        super(props);

        this.id = '7827a8a5-4f92-443a-bb73-1dfcca358abf';
        this.component = 'Keys';
        this.owner_id = props.owner_id;

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: 'Ключи',
            description: 'Ключи',
            crud: ['c'],
            routes: 'metadata/infoservice/keys',
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
