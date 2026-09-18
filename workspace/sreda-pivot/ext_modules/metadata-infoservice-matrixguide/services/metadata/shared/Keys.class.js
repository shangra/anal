const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const FieldsListClass = require('./FieldsList.class');
const MetadataClass = require('../../../../metadata-cmp/services/Metadata.service');

const constants = require('../../../constants');

const FSCK = require('../../../../meta-fsck');

const { ref_extract } = require('../../../../metadata-cmp/util');

class KeysClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Keys';

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
            crud: ['c', 's'],
            routes: constants[name].routes,
            parent: props.parent,
        };
    }

    async subTree(item, options = {}) {
        const children = [];

        const FieldsList = await new FieldsListClass({ owner_id: item.id, parent: this.props.parent }).tree(options);
        children.push(FieldsList);

        return children;
    }

    // @ts-ignore
    async * fsck_self(self, opts) {
        // это ОДИН "КЛЮЧ" от плоского справочника инфосервиса (InfoserviceMatrixGuide)
        yield* super.fsck_self(self, opts);

        const path = FSCK.path_meta(opts?.path, self.id, this?.constructor?.name, self.name);

        const self_settings = self.manifest.settings;
        // yield FSCK.dump(path, `self_settings`, self_settings, { self });

        const Metadata = new MetadataClass();

        const field = self_settings.fieldview && await Metadata.getItem(ref_extract(self_settings.fieldview)?.value, {});
        yield FSCK.check(FSCK.path_prop(path, "fieldview"), `У ключа уровня есть поле представления`,
            !!field, FSCK.is.true,
            { self }
        );
    }
}

module.exports = KeysClass;
