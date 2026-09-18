const routes = 'metadata/guide';

module.exports = {
    Guide: {
        id: '0ce71d7a-a5f1-4f02-9391-1677f6aff7c6',
        component: 'Guide',
        routes: `${routes}`,
        name: 'Справочники',
        description: 'Справочники',
    },

    Forms: {
        id: '0cb5c67e-6ad1-4a68-874e-b61ab4118e2a',
        component: 'Forms',
        routes: `${routes}/forms`,
        name: 'Формы',
        description: 'Формы',
    },

    SysFields: {
        id: 'ea7bc5bc-f577-480c-90e7-7c2ca4a2e6ac',
        component: 'SysFields',
        routes: `${routes}/sysfields`,
        name: 'Системные поля',
        description: 'Системные поля',
    },

    Fields: {
        id: 'a3fd698d-deb3-41ea-81e1-6f099cfe42be',
        component: 'Fields',
        routes: `${routes}/fields`,
        name: 'Поля',
        description: 'Поля',
    },

    TabularParts: {
        id: '6b67eebc-ff9a-4ba1-9003-c290c3741269',
        component: 'TabularParts',
        routes: `${routes}/tabularparts`,
        name: 'Табличные части',
        description: 'Табличные части',
    },

    TabularFieldsList: {
        id: 'fe5e0b8e-1130-4e5e-8a35-68905239a9fa',
        component: 'TabularFieldsList',
        routes: `${routes}/tabularfieldslist`,
        name: 'Поля',
        description: 'Поля',
    },

    TabularSysFields: {
        id: '9ccb7639-f2ce-4262-aefd-15feeddf13aa',
        component: 'TabularSysFields',
        routes: `${routes}/tabularsysfields`,
        name: 'Системные поля',
        description: 'Системные поля',
    },

    FieldsList: {
        id: '61bf8f82-8aed-48dc-81e3-445874ca4581',
        component: 'FieldsList',
        routes: `${routes}/fieldslist`,
        name: 'Поля',
        description: 'Поля',
    },

    Indexes: {
        id: '0c40968f-4386-42c6-bb85-fd234acd853c',
        component: 'Indexes',
        routes: `${routes}/indexes`,
        name: 'Индексы',
        description: 'Индексы',
    },

    Keys: {
        id: 'eb398267-58fc-4770-b94f-9524b9ef8efa',
        component: 'Keys',
        routes: `${routes}/keys`,
        name: 'Ключи',
        description: 'Ключи',
    },
};
