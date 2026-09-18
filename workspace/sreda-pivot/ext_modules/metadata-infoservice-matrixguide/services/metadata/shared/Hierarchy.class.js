const LevelClass = require('../../../../metadata-cmp/services/metadata/source/LevelClass.class');
const FieldsListClass = require('./FieldsList.class');

const constants = require('../../../constants');

const ApiError = require('../../../../../core/exceptions/ApiError');

const MetadataClass = require('../../../../metadata-cmp/services/Metadata.service');

const FSCK = require('../../../../meta-fsck');
const { ref_extract } = require('../../../../metadata-cmp/util');

class HierarchyClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Hierarchy';

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
            parent: props.parent,
        };
    }


    async subTree(item, options = {}) {
        const children = [];

        const FieldsList = await new FieldsListClass({ owner_id: item.id, parent: this.props.parent }).tree(options);
        children.push(FieldsList);

        return children;
    }

    /**
     * 
     * @param {string[]} attrs 
     * @param {object} hierarchy 
     * @returns 
     */
    getAttrs(attrs, hierarchy) {
        const arr = new Set(attrs);

        for (const key in hierarchy) {
            const { fields } = hierarchy[key];

            fields.forEach((field) => arr.add(field.alias.name));
        }

        return Array.from(arr);
    }

    check(hierarchy) {
        for (const key in hierarchy) {
            if (!hierarchy[key]) {
                throw ApiError.BadRequest(`Не заполнен один из уровней иерархии плоского справочника`);
            }
            const { name, fields } = hierarchy[key];

            if (!Array.isArray(fields) || !fields?.length) {
                throw ApiError.BadRequest(`Для иерархии ${name} плоского справочника не указаны поля представления иерархии`);
            }

            fields.forEach((field) => {
                const name = field.alias.name;
                if (!name) {
                    throw ApiError.BadRequest(`Для иерархии ${name} плоского справочника не указано название поля представления иерархии`);
                }
            })
        }

        const fields = {};

        for (const key in hierarchy) {
            const keys = hierarchy[key]?.Keys?.fields || {};

            if (fields[Object.keys(keys).join('::')]) {
                throw ApiError.ServerError(`Допущенно зацикливание иерархии на уровне ${hierarchy[key]?.name}`);
            }

            fields[Object.keys(keys).join('::')] = true;
        }
    }

    // @ts-ignore
    async * fsck_self(self, opts) {
        // это ОДИН УРОВЕНЬ ИЕРАРХИИ от плоского справочника инфосервиса (InfoserviceMatrixGuide)
        yield* super.fsck_self(self, opts);

        const path = FSCK.path_meta(opts?.path, self.id, this?.constructor?.name, self.name);

        const self_settings = self.manifest.settings;
        // yield FSCK.dump(path, `self_settings`, self_settings, { self });

        // level                : self_settings.level,                // уровень
        const opt_expect_level = opts?.expect_level;
        if (null == opt_expect_level) {
            yield FSCK.check(FSCK.path_prop(path, "level"), `Уровень имеет корректное свойство level`,
                self_settings.level, FSCK.is.igt0,
                { self }
            );
        }
        else {
            yield FSCK.check(FSCK.path_prop(path, "level"), `Уровень имеет корректное свойство level`,
                self_settings.level, opt_expect_level, // FSCK.is.eq(opt_expect_level),
                { self }
            );
        }

        const Metadata = new MetadataClass();

        // keyId                : self_settings.keyId,                // ключ уровня
        yield FSCK.check(FSCK.path_prop(path, "keyId"), `Свойство keyId ссылается на существующий объект`,
            !!(self_settings.keyId && await Metadata.getItem(ref_extract(self_settings.keyId)?.value, {})), FSCK.is.true,
            { self }
        );

        // keyParent            : self_settings.keyParent,            // ключ родителя уровня
        if (self_settings.keyParent) {
            yield FSCK.check(FSCK.path_prop(path, "keyParent"), `Свойство keyParent ссылается на существующий объект`,
                !!await Metadata.getItem(ref_extract(self_settings.keyParent)?.value, {}), FSCK.is.true,
                { self }
            );
        }

        // prevLevel            : self_settings.prevLevel,            // предыдущий уровень
        if (self_settings.prevLevel) {
            yield FSCK.check(FSCK.path_prop(path, "prevLevel"), `Свойство prevLevel ссылается на существующий объект`,
                !!await Metadata.getItem(ref_extract(self_settings.prevLevel)?.value, {}), FSCK.is.true,
                { self }
            );
        }

        //FYI would it be FieldsListClass.fsck_self?

        const parent_meta = await Metadata.getParentInstance(self.owner_id, {}); // экземпляр класса-оператора объекта-родителя
        const parent_tableInfo = await parent_meta.tableInfo(parent_meta, self.owner_id, {});
        const parent_tableInfo_Fields = parent_tableInfo?.Fields; // нам нужен список полей, чтобы поискать в них то, на что ссылаемся из полей от уровня
        // yield FSCK.dump(path, `parent_tableInfo_Fields`, parent_tableInfo_Fields, { self });

        const FieldsList = await new FieldsListClass({ owner_id: self.id, parent: this.props.parent }).tree();
        const FieldsList_children = FieldsList?.children;
        // yield FSCK.dump(path, `FieldsList_children`, FieldsList_children, { self });

        for (const item of FieldsList_children) {
            const fieldref = await Metadata.getItem(item.id, {});
            const field_id = ref_extract(fieldref?.manifest?.settings?.ref)?.value;
            yield FSCK.check(FSCK.path_prop(path, `refs:${fieldref.name}`), `Поле уровня ссылается на существующий в плоском справочнике объект поля`,
                !!(field_id && await Metadata.getItem(field_id, {})), FSCK.is.true,
                { self }
            );
        }
    }
}

module.exports = HierarchyClass;
