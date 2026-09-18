const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');

const UsersServiceClass = wrapper(
    'backend',
    '../../auth/services/Users.service'
);
const GroupsServiceClass = wrapper(
    'backend',
    '../../auth/services/Groups.service'
);

const Metadata = new MetadataClass();
const UsersService = new UsersServiceClass();
const GroupsService = new GroupsServiceClass();

class ConditionService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Condition';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form(id) {
        const conditionobject = {
            name: 'conditionobject',
            description: 'Условие по объекту',
            type: 'STRING',
            template: '{"where": {}}',
        };

        if (id && id !== this.id) {
            conditionobject.buttons = [
                {
                    name: 'ObjectCondition',
                    component: 'Condition',
                    type: 'after',
                    props: {
                        id: id,
                        title: 'Интерактивный режим',
                        icon: 'bi bi-cursor-fill',
                        format: 'mongodb',
                        fields: await this.getObjectConditionFields(id),
                    },
                },
            ];
        }

        return {
            form: [
                {
                    name: 'conditionuser',
                    description: 'Условие по пользователю',
                    type: 'STRING',
                    template: '{"where": {}}',
                    buttons: [
                        {
                            name: 'UserCondition',
                            component: 'Condition',
                            type: 'after',
                            props: {
                                id: id,
                                title: 'Интерактивный режим',
                                icon: 'bi bi-cursor-fill',
                                format: 'jsonlogic',
                                fields: await this.getUserConditionFields(),
                            },
                        },
                    ],
                },
                conditionobject,
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
            ],
        };
    }

    async getUserConditionFields() {
        const [roles, rules, attributes, groups] = await Promise.all([
            UsersService.getAllRoles(),
            UsersService.getAllRules(),
            UsersService.getAllAttributes(),
            GroupsService.getAllGroups(),
        ]);

        return [
            {
                key: 'roles',
                name: 'roles',
                label: 'Роли',
                valueEditorType: 'select',
                defaultValue: roles[0]?.id,
                values: roles.map((r) => ({ name: r.id, label: r.name })),
                operators: [
                    { name: 'contains', value: 'contains', label: 'содержит' },
                ],
            },
            {
                key: 'rules',
                name: 'rules',
                label: 'Правила',
                valueEditorType: 'select',
                defaultValue: rules[0]?.id,
                values: rules.map((r) => ({ name: r.id, label: r.name })),
                operators: [
                    { name: 'contains', value: 'contains', label: 'содержит' },
                ],
            },
            {
                key: 'groups',
                name: 'groups',
                label: 'Группы',
                valueEditorType: 'select',
                defaultValue: groups[0]?.id,
                values: groups.map((g) => ({ name: g.id, label: g.name })),
                operators: [
                    { name: 'contains', value: 'contains', label: 'содержит' },
                ],
            },
            {
                key: 'groupsAD',
                name: 'groupsAD',
                label: 'Группы Active Directory',
                operators: [
                    { name: 'contains', value: 'contains', label: 'содержит' },
                ],
            },
            ...attributes.map((a) => ({
                key: `attributes.${a.id}.value`,
                name: `attributes.${a.id}.value`,
                label: a.name,
            })),
        ];
    }

    async getObjectConditionFields(id) {
        const condition = await Metadata.getItem(id);
        if (!condition?.owner_id) {
            return [];
        }

        const rls = await Metadata.getItem(condition.owner_id);
        const objectId = rls?.manifest?.settings?.objectid?.value;
        if (!objectId) {
            return [];
        }

        const meta = await Metadata.getParentInstance(objectId, {});
        if (!meta?.tableInfo) {
            return [];
        }

        const treeObject = await meta.tableInfo(meta, objectId);
        const fields = treeObject?.Fields ?? {};

        return Object.keys(fields).map((f) => ({
            key: f,
            name: f,
            label: fields[f].name,
            inputType: fields[f].type == 'integer' ? 'number' : 'text',
        }));
    }
}

module.exports = ConditionService;
