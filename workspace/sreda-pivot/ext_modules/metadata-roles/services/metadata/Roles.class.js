const crypto = require('crypto');

/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');

/** LOCAL * */
const constants = require('../../constants');
const { allFieldsGenerator } = require('./roles.fields');

/** AUTH * */
const AuthUserClass = require('../../../auth/services/Users.service');
const AuthUser = new AuthUserClass();

class RolesClass extends LevelClass {
    constructor(props) {
        super(props);

        const name = 'Roles';

        this.id = constants[name].id;
        this.component = constants[name].component;

        this.childrenCRUD = ['r', 'u', 'd', 'rls'];

        const openFunction = {
            name: 'openMetadataForm',
            props: {
                id: this.id,
                title: 'Роли',
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

        if (options.needToLoading) {
            menuItem.needToLoading = true;
        }

        return menuItem;
    }

    getFieldIds() {
        return {
            id: '6124ea9c-bc85-44ca-bc14-024b21ffd40c',
            code: '3b11d3b6-f716-4713-8dea-f06caacb9db6',
            name: '8fcaca7f-2dca-49f6-a068-1664c80bbbf6',
            details: '6abd6e29-fc53-46c6-ae0e-8700526b892f',
            pkUuid: '6abd6e29-fc53-46c6-ae0e-8700526b892f',
        };
    }

    /**
     * Генерация treeObject для Roles
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
        const pages = new RolesClass({ id });

        const treeObject = await pages.tableInfo();

        const item = await pages.getItem(id, {
            ...inputOptions,
            order: undefined,
        });
        const mitem = await pages.item(item);

        const roleId = options.where?.id;
        let roles;
        if (roleId) {
            const ids = Array.isArray(roleId) ? roleId : [roleId];
            roles = await AuthUser.getRoles(ids, options);
        } else {
            roles = await AuthUser.getAllRoles(options);
        }

        // Строим cols из treeObject.Fields (уже содержит UAttributes из tableInfo)
        const cols = Object.values(treeObject.Fields);

        // Собираем имена аттрибутов для проверки
        const attrFields = {};
        for (const field of cols) {
            attrFields[field.field] = true;
        }

        // Формируем rows
        const rows = roles.map((role) => {
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
            count: roles.length,
            offset: options.offset ?? 0,
            limit: options.limit ?? rows.length,
            options,
            metadata: { ...mitem, ...item, treeObject },
        };
    }

    async create(metaId, body, _options = {}) {
        const record = body.record || body;
        const role = await AuthUser.createRole(record);
        return { id: role.id, ...role };
    }

    async update(metaId, body, _options = {}) {
        const record = body.record || body;
        const roleId = record.id || metaId;
        if (!roleId) {
            return { error: 'Missing role id in update body' };
        }
        const role = await AuthUser.editRole(roleId, record);
        return { success: true, ...role };
    }

    async delete(metaId, body, _options = {}) {
        const ids = body?.id
            ? Array.isArray(body.id)
                ? body.id
                : [body.id]
            : [metaId];
        await Promise.all(ids.map((id) => AuthUser.delRole(id)));
        return { success: true };
    }
}

module.exports = RolesClass;
