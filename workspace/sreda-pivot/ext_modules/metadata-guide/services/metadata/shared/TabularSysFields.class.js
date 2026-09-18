const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const constants = require('../../../constants');

class FieldsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'TabularSysFields';

        this.id = constants[name].id;
        this.component = constants[name].component;
        this.childrenCRUD = ['u', 'rls'];

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['s'],
            routes: constants[name].routes,
        };
    }
}

module.exports = FieldsClass;
