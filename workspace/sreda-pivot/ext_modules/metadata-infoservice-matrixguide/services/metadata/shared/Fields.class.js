const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const constants = require('../../../constants');

const FSCK = require('../../../../meta-fsck');
const SelectableFieldMixin = require('../../../../metadata-cmp/services/metadata/source/SelectableField.mixin');
const { ref_extract } = require('../../../../metadata-cmp/util');

class FieldsClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Fields';

        this.id = constants[name].id;
        this.component = constants[name].component;

        this.props = {
            id: this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['c', 's', 'd'],
            routes: constants[name].routes,
            parent: props.parent,
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

        const matrixField = {
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

        return matrixField;
    }

    // TODO
    //@ts-ignore
    async * fsck_self(self, opts) {
        // это ОДНО ПОЛЕ от плоского справочника инфосервиса (InfoserviceMatrixGuide)
        yield* super.fsck_self(self, opts);
        yield* SelectableFieldMixin.fsck_self.call(this, self, opts);
    }
}

module.exports = FieldsClass;
