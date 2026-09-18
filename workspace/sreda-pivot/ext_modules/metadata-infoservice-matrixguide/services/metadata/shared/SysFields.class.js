const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const { ref_extract } = require('../../../../metadata-cmp/util');
const constants = require('../../../constants');

class SysFieldsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'SysFields';

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
            crud: [],
            routes: constants[name].routes,
        };
    }

    /**
     * @public
     * 
     * @param {object} field
     */
    static parse(field) {
        const fieldInfo = field.manifest.settings;

        const ref = ref_extract(fieldInfo?.ref);

        const sysField = {
            field: fieldInfo.nameField,
            name: field.name,
            description: field.description,
            id: field.id,
            class_id: field.class_id,
            type: fieldInfo.type,
            onoff: fieldInfo.onoff ?? false,
            ref: ref.value ? ref : null,
            virtual: fieldInfo.virtual ?? false,
            value: fieldInfo.virtual ? fieldInfo.fnfield : fieldInfo.nameField,
        };

        return sysField;
    }
}

module.exports = SysFieldsClass;
