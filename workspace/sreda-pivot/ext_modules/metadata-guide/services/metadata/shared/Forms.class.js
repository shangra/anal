/** GLOBAL * */
const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const constants = require('../../../constants');

/** LOCAL * */

class FormsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Forms';

        this.id = constants[name].id;
        this.component = constants[name].component;

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c', 's'],
            routes: constants[name].routes,
        };
    }
}

module.exports = FormsClass;
