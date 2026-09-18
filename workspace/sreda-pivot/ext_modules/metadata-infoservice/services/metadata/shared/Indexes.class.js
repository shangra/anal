const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const FieldsListClass = require('./FieldsList.class');

class IndexesClass extends LevelClass {
    constructor(props) {
        super(props);

        this.id = '201823bd-924f-4a4b-9a8a-658d020c5e01';
        this.component = 'Indexes';
        this.owner_id = props.owner_id;

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: 'Индексы',
            description: 'Индексы',
            crud: ['c'],
            routes: 'metadata/infoservice/indexes',
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

module.exports = IndexesClass;
