const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');

class FieldsClass extends LevelClass {
    constructor(props) {
        super(props);

        this.id = '1fa330a3-4b65-42e4-b12f-1fabd0c08945';
        this.component = 'Fields';

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: 'Поля',
            description: 'Поля',
            crud: ['c', 's'],
            routes: 'metadata/infoservice/fields',
            parent: props.parent,
        };
    }
}

module.exports = FieldsClass;
