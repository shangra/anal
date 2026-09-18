const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');

const constants = require('../../../constants');

class BindsClass extends LevelClass {
    constructor(props) {
        super(props);

        this.component = 'Binds';

        this.id = constants[this.component].id;
        this.owner_id = props.owner_id;

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[this.component].name,
            description: constants[this.component].description,
            crud: ['c', 's', 'd'],
            routes: constants[this.component].routes,
            parent: props.parent,
        };
    }
}

module.exports = BindsClass;
