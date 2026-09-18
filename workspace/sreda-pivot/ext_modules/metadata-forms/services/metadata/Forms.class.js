/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');

/** LOCAL * */

class FormsClass extends LevelClass {
    constructor(props) {
        super(props);

        this.id = '20901b97-d1cf-4472-a27b-b0442e436c9a';
        this.component = 'Forms';
        this.props = {
            id: this.id,
            owner_id: '00000000-0000-0000-0000-000000000000',
            class_id: this.id,
            class: this.component,
            name: 'Формы',
            description: 'Формы',
            crud: ['c', 'rls'],
            routes: 'metadata/formsmetadata',
        };
    }
}

module.exports = FormsClass;
