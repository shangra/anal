const routes = 'metadata/infoservicematrixguide';

module.exports = {
    levelAttribute: '__level__',
    systemAttributes: ['id', 'parent', '__level__'],
    defaultOrderAttributes: ['id'],
    allAttributes: ['*'],

    PREFIX: 'lvl_',
    POSTFIX: '__lvl_',

    DELIMETER: '::',

    NOT: '$not',
    EQUAL: '$eq',
    NOT_EQUAL: '$ne',

    VIEW: '__view__',
    LEVEL: '__level__',
    PARENT: '__parent__',

    InfoserviceMatrixGuide: {
        id: 'b4478dcf-b7e6-436c-b356-1a9e3a6342e0',
        component: 'InfoserviceMatrixGuide',
        routes: `${routes}`,
        name: 'Матричный справочник инфосервисов',
        description: 'Матричный справочник инфосервисов',
    },

    Fields: {
        id: '6175d06e-b998-4d51-9b79-16926367a2f5',
        component: 'Fields',
        routes: `${routes}/fields`,
        name: 'Поля',
        description: 'Поля',
    },

    SysFields: {
        id: 'dae38e0c-af84-4729-8477-dd87a98c5e42',
        component: 'SysFields',
        routes: `${routes}/sysfields`,
        name: 'Системные поля',
        description: 'Системные поля',
    },

    FieldsList: {
        id: '25de91ee-2adb-48eb-b15f-00cff71b65f0',
        component: 'FieldsList',
        routes: `${routes}/fieldslist`,
        name: 'Поля',
        description: 'Поля',
    },

    Hierarchy: {
        id: '3c2005fc-c7de-4bcf-83bc-beaa165ea9fa',
        component: 'Hierarchy',
        routes: `${routes}/hierarchy`,
        name: 'Иерархия',
        description: 'Иерархия',
    },

    Keys: {
        id: '5b974b69-e8fe-438e-951a-333fddd48bc7',
        component: 'Keys',
        routes: `${routes}/keys`,
        name: 'Ключи',
        description: 'Ключи',
    },
};
