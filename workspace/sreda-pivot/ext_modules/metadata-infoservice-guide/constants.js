const routes = 'metadata/infoserviceguide';

module.exports = {
    InfoserviceGuide: {
        id: '48d6c82e-f78b-42f2-8c19-ba9aaf457740',
        component: 'InfoserviceGuide',
        routes: `${routes}`,
        name: 'Справочники инфосервисов',
        description: 'Справочники инфосервисов',
    },

    Fields: {
        id: '72b2b48e-d2c9-43b4-b2a0-ab85da32421f',
        component: 'Fields',
        routes: `${routes}/fields`,
        name: 'Поля',
        description: 'Поля',
    },

    FieldsList: {
        id: '3f9967fe-b86c-4e89-8fc1-e736024f8665',
        component: 'FieldsList',
        routes: `${routes}/fieldslist`,
        name: 'Поля',
        description: 'Поля',
    },

    Indexes: {
        id: 'fa9a5c62-ef90-4d23-b4c8-698737abf503',
        component: 'Indexes',
        routes: `${routes}/indexes`,
        name: 'Индексы',
        description: 'Индексы',
    },

    Keys: {
        id: '49b4fab1-e33d-444d-8c30-72ef443ba92c',
        component: 'Keys',
        routes: `${routes}/keys`,
        name: 'Ключи',
        description: 'Ключи',
    },
};
