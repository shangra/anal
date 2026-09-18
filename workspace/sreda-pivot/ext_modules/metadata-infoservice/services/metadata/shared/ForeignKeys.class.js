const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');

class ForeignKeysClass extends LevelClass {
    constructor(props) {
        super(props);

        this.id = '0f158d38-debf-4c6d-9a3a-836f20b0e22d';
        this.component = 'ForeignKeys';
        this.owner_id = props.owner_id;

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: 'Внешние ключи',
            description: 'Внешние ключи',
            crud: ['c'],
            routes: 'metadata/infoservice/foreignkeys',
            parent: props.parent,
        };
    }
}

module.exports = ForeignKeysClass;
