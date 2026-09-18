const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');

class FieldsListClass extends LevelClass {
    constructor(props) {
        super(props);

        this.id = '52a9e785-f68e-4427-b246-135620eea36f';
        this.component = 'FieldsList';
        this.owner_id = props.owner_id;

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: 'Поля',
            description: 'Поля',
            crud: ['c', 's'],
            routes: 'metadata/infoservice/fieldslist',
            parent: props.parent,
        };
    }
}

module.exports = FieldsListClass;
