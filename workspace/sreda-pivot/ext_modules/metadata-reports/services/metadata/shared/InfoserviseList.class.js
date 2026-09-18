const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const constants = require('../../../constants');

class InfoserviceListClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'InfoserviseList';
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
}

module.exports = InfoserviceListClass;
