const crypto = require('crypto');

/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');

/** LOCAL * */
const constants = require('../../constants');
const { allFieldsGenerator } = require('./user.fields');

/** AUTH * */
const AuthUserClass = require('../../../auth/services/Users.service');
const AuthUser = new AuthUserClass();
const AuthClass = require('../../../auth/services/Auth.service');
const Auth = new AuthClass();

class UsersClass extends LevelClass {
    constructor(props) {
        super(props);
        const name = 'Users';

        this.id = constants[name].id;
        this.component = constants[name].component;

        this.childrenCRUD = ['r', 'u', 'd', 'rls'];

        const openFunction = {
            name: 'openMetadataForm',
            props: {
                id: this.id,
                title: 'Пользователи',
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
            needToLoading: false,
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

    /**
     * Генерация UUID полей (однократно, не в рантайме)
     */
    getFieldIds() {
        return {
            id: '7b93e00d-b5d6-43d8-acb6-ac9a63055c86',
            login: '68bb666c-1682-456d-b907-d2df33d893ce',
            status: 'b4d38b78-4fce-49aa-b7c8-312e4d9ddcdd',
            pkUuid: 'b4d38b78-4fce-49aa-b7c8-312e4d9ddcdd',
        };
    }

    /**
     * Генерация treeObject для Users
     * Базовые поля — только id, login, status.
     * Динамические аттрибуты добавляются в read().
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

        const treeObject = {
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

        // Добавляем динамические UAttributes в Fields
        try {
            const attributes = await AuthUser.getAllAttributes();
            for (const attr of attributes) {
                const attrData = attr.dataValues || attr;
                const fieldName = attrData.name;
                Fields[fieldName] = {
                    field: fieldName,
                    name: attrData.name,
                    description: attrData.name,
                    id: attrData.id,
                    type: attrData.type || 'string',
                    show: true,
                    editing: true,
                    value: fieldName,
                    multiRef: [],
                    multiRefFields: [],
                };
                FieldsGUID[attrData.id] = Fields[fieldName];
            }
        } catch (e) {
            // Если auth сервис недоступен, работаем без аттрибутов
            console.warn(
                'Failed to load UAttributes for tableInfo:',
                e.message
            );
        }

        return treeObject;
    }

    /**
     * Читает данных пользователей.
     *
     * Формирует rows где каждый пользователь содержит базовые поля
     * (id, login, status) + все UAttributes как отдельные колонки
     * со значениями из UserData.
     */
    async read(id, inputOptions = {}) {
        const options = structuredClone(inputOptions);
        const pages = new UsersClass({ id });

        const treeObject = await pages.tableInfo();

        const item = await pages.getItem(id, {
            ...inputOptions,
            order: undefined,
        });
        const mitem = await pages.item(item);

        // Получение пользователей + аттрибутов через auth сервис
        const userId = options.where?.id;
        let users;
        if (userId) {
            const ids = Array.isArray(userId) ? userId : [userId];
            users = await AuthUser.getUsers(ids, options);
        } else {
            const result = await AuthUser.getAllUsers(options);
            users = result.items;
        }

        // Строим cols из treeObject.Fields (уже содержит UAttributes из tableInfo)
        const cols = Object.values(treeObject.Fields);

        // Собираем имена аттрибутов для проверки
        const attrFields = {};
        for (const field of cols) {
            attrFields[field.field] = true;
        }

        // Формируем rows
        const rows = users.map((user) => {
            const row = {
                id: user.id,
                login: user.login,
                status: user.status,
                name: user.name || user.UserInfo?.name || null,
                details: user.details || user.UserInfo?.details || null,
                avatar: user.avatar || user.UserInfo?.avatar || null,
                email: user.email || user.UserInfo?.email || null,
                session: user.session || user.UserInfo?.session || null,
            };

            // Заполняем значения аттрибутов из UserData
            for (const attrData of user.attributes || []) {
                const attrName = attrData.name;
                if (attrName && attrFields[attrName]) {
                    row[attrName] = attrData.value;
                }
            }

            // Убеждаемся что все аттрибуты присутствуют (даже с null)
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
            count: users.length,
            offset: options.offset ?? 0,
            limit: options.limit ?? rows.length,
            options,
            metadata: { ...mitem, ...item, treeObject },
        };
    }

    /**
     * Обновление пользователя.
     * Базовые поля обновляются через AuthUser.editUser().
     * Поля, соответствующие UAttributes, сохраняются через AuthUser.setUserAttribute().
     * @param {string} metaId - id метаданных формы
     * @param {object} body - тело: { record: { id, login, status, ...аттрибуты } }
     */
    async update(metaId, body, _options = {}) {
        const record = body.record || body;
        const userId = record.id;
        if (!userId) {
            return { error: 'Missing user id in update body' };
        }

        const attributes = await AuthUser.getAllAttributes();

        // Разделяем record на базовые поля и аттрибуты
        const basicFields = [
            'id',
            'login',
            'status',
            'createdAt',
            'updatedAt',
            'password',
        ];
        const attrNameToId = {};
        for (const attr of attributes) {
            const attrData = attr.dataValues || attr;
            attrNameToId[attrData.name] = attrData.id;
        }

        // Обновление базовых полей через AuthUser
        const baseUpdate = {};
        for (const key of Object.keys(record)) {
            if (
                basicFields.includes(key) &&
                record[key] !== null &&
                record[key] !== undefined
            ) {
                baseUpdate[key] = record[key];
            }
        }
        if (Object.keys(baseUpdate).length > 0) {
            await AuthUser.editUser(userId, baseUpdate);
        }

        // Обновление аттрибутов
        for (const key of Object.keys(record)) {
            if (!basicFields.includes(key) && attrNameToId[key]) {
                await AuthUser.setUserAttribute(
                    userId,
                    attrNameToId[key],
                    String(record[key] ?? '')
                );
            }
        }

        return { success: true };
    }

    /**
     * Создание пользователя.
     * Создаётся через AuthService + устанавливаются аттрибуты.
     */
    async create(metaId, body, _options = {}) {
        const record = body.record || body;
        const attributes = await AuthUser.getAllAttributes();

        // Создание пользователя (логин + пароль)
        // Пароль сделал как было, но теперь на стороне бека, но лучше переделать
        const user = await Auth.createUser({
            ...record,
            status: 0,
            password: '123',
        });
        if (!user || !user.id) {
            throw new Error('Failed to create user');
        }

        const userId = user.id;

        // Остальные базовые поля (status и т.д.)
        const basicFields = ['login', 'password', 'createdAt', 'updatedAt'];
        const baseUpdate = {};
        for (const key of Object.keys(record)) {
            if (!basicFields.includes(key)) {
                const isAttribute = attributes.some((a) => {
                    const attrData = a.dataValues || a;
                    return attrData.name === key;
                });
                // Пропускаем status при обновлении через baseUpdate (он уже установлен при создании)
                // Иначе работает, но пятисотит ¯\_(ツ)_/¯
                if (!isAttribute && key !== 'status') {
                    baseUpdate[key] = record[key];
                }
            }
        }
        if (Object.keys(baseUpdate).length > 0) {
            baseUpdate.id = userId;
            await AuthUser.editUser(userId, baseUpdate);
        }

        // Установка аттрибутов
        const attrNameToId = {};
        for (const attr of attributes) {
            const attrData = attr.dataValues || attr;
            attrNameToId[attrData.name] = attrData.id;
        }
        for (const key of Object.keys(record)) {
            if (attrNameToId[key]) {
                await AuthUser.setUserAttribute(
                    userId,
                    attrNameToId[key],
                    String(record[key] ?? '')
                );
            }
        }

        return { id: userId, ...user };
    }

    /**
     * Удаление пользователя через AuthUser.
     * @param {string} metaId - id метаданных
     * @param {object} body - тело: { id: string | string[] }
     */
    async delete(metaId, body, _options = {}) {
        const ids = body?.id
            ? Array.isArray(body.id)
                ? body.id
                : [body.id]
            : [metaId];
        await Promise.all(ids.map((id) => AuthUser.deleteUser(id)));
        return { success: true };
    }
}

module.exports = UsersClass;
