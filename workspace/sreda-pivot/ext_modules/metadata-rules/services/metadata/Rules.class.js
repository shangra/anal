const crypto = require('crypto');

/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');

/** LOCAL * */
const constants = require('../../constants');
const { allFieldsGenerator } = require('./rules.fields');

/** AUTH * */
const AuthUserClass = require('../../../auth/services/Users.service');
const AuthUser = new AuthUserClass();

class RulesClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Rules';

        this.id = constants[name].id;
        this.component = constants[name].component;

        this.childrenCRUD = ['r', 'u', 'd', 'rls'];

        const openFunction = {
            name: 'openMetadataForm',
            props: {
                id: this.id,
                title: 'Правила',
                component: constants[name].routes,
                server: 'backend',
            },
        };

        this.props = {
            id: props?.id ?? this.id,
            owner_id: this.owner_id,
            class_id: this.id,
            class: this.component,
            name: constants[name].name,
            description: constants[name].description,
            crud: ['u', 'rls'],
            routes: constants[name].routes,
            parent: props.parent,
            events: {
                // onClick: openFunction,
                onDoubleClick: openFunction,
            },
        };
        this.props.icon = constants[name].icon ?? null;
    }

    async item(item, options = {}) {
        const menuItem = await super.item(item, options);

        if (this.props.events) {
            menuItem.events = this.props.events;
        }

        menuItem.needToLoading = false;
        if (options.needToLoading) {
            menuItem.needToLoading = true;
        }

        return menuItem;
    }

    getFieldIds() {
        return {
            id: 'e5797f66-e425-47a8-8250-40326c5f1370',
            name: 'd4ba71e5-0a25-4808-9fcd-8d9cce63ac5e',
            details: '5de90083-e0c3-4ed0-b881-c9237ab92ab7',
            pkUuid: '5de90083-e0c3-4ed0-b881-c9237ab92ab7',
        };
    }

    /**
     * Генерация treeObject для Rules
     */
    async tableInfo() {
        const fieldIds = this.getFieldIds();
        const allFields = allFieldsGenerator(fieldIds);
        const Fields = {};
        const FieldsGUID = {};
        const SysFields = {};
        const SysFieldsGUID = {};
        const Keys = {};
        const KeysGUID = {};
        const Refs = {};

        // Обработка полей
        allFields.forEach((field) => {
            const fieldName = field.settings.nameField;
            Fields[fieldName] = {
                field: fieldName,
                name: field.name,
                description: field.description,
                id: field.id,
                increment: field.settings.increment ?? false,
                notnull: field.settings.notnull ?? false,
                type: field.settings.type,
                len: field.settings.len,
                unique: field.settings.unique,
                default: field.settings.default,
                show: field.settings.showfield,
                value: fieldName,
                multiRef: [],
                multiRefFields: [],
                editing: field.settings.editing ?? true,
            };
            FieldsGUID[field.id] = Fields[fieldName];

            // Добавление в SysFields для системных полей
            if (
                [
                    'id',
                    'code',
                    'name',
                    'createdAt',
                    'updatedAt',
                    'createdUser',
                    'updatedUser',
                    'markdel',
                ].includes(fieldName)
            ) {
                SysFields[fieldName] = Fields[fieldName];
                SysFieldsGUID[field.id] = SysFields[fieldName];
            }

            // id - это первичный ключ
            if (['id'].includes(fieldName)) {
                Refs[fieldName] = Fields[fieldName];
            }
        });

        // Первичный ключ
        const pkUuid = fieldIds.pkUuid || crypto.randomUUID();
        Keys['PK'] = {
            name: 'PK',
            description: 'Первичный ключ',
            id: pkUuid,
            fields: {
                id: {
                    field: 'id',
                    name: 'Идентификатор',
                    description: 'Идентификатор',
                    value: {
                        link: this.id,
                        value: fieldIds.id,
                    },
                },
            },
            settings: {
                primarykey: true,
            },
        };
        KeysGUID[Keys['PK'].id] = Keys['PK'];

        return {
            Fields,
            FieldsGUID,
            SysFields,
            SysFieldsGUID,
            Keys,
            KeysGUID,
            Indexes: {},
            TabularParts: {},
            TabularPartsGUID: {},
            Refs,
        };
    }

    async subTree() {
        return [];
    }

    async read(id, inputOptions = {}) {
        const options = structuredClone(inputOptions);
        const pages = new RulesClass({ id });

        const treeObject = await pages.tableInfo();

        const item = await pages.getItem(id, {
            ...inputOptions,
            order: undefined,
        });
        const mitem = await pages.item(item);

        const ruleId = options.where?.id;
        let rules;
        if (ruleId) {
            const ids = Array.isArray(ruleId) ? ruleId : [ruleId];
            rules = await AuthUser.getRules(ids, options);
        } else {
            rules = await AuthUser.getAllRules(options);
        }

        // Строим cols из treeObject.Fields (уже содержит UAttributes из tableInfo)
        const cols = Object.values(treeObject.Fields);

        // Собираем имена аттрибутов для проверки
        const attrFields = {};
        for (const field of cols) {
            attrFields[field.field] = true;
        }

        const rows = rules.map((role) => {
            const row = {
                ...role,
            };

            for (const field of cols) {
                if (!(field.field in row)) {
                    row[field.field] = null;
                }
            }

            return row;
        });
        return {
            rows,
            cols,
            refs: {},
            refFields: {},
            count: rules.length,
            offset: options.offset ?? 0,
            limit: options.limit ?? rows.length,
            options,
            metadata: { ...mitem, ...item, treeObject },
        };
    }

    async create(metaId, body, _options = {}) {
        const record = body.record || body;
        const rule = await AuthUser.createRule(record);
        return { id: rule.id, ...rule };
    }

    async update(metaId, body, _options = {}) {
        const record = body.record || body;
        const ruleId = record.id || metaId;
        if (!ruleId) {
            return { error: 'Missing rule id in update body' };
        }
        const rule = await AuthUser.editRule(ruleId, record);
        return { success: true, rule };
    }

    async delete(metaId, body, _options = {}) {
        const ids = body?.id
            ? Array.isArray(body.id)
                ? body.id
                : [body.id]
            : [metaId];
        await Promise.all(ids.map((id) => AuthUser.delRule(id)));
        return { success: true };
    }
}

module.exports = RulesClass;
