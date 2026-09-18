const routes = 'metadata/reports';

module.exports = {
    aggrDelimeter: ':->:',

    Reports: {
        id: '04e89fcd-82f0-4d17-afab-d6ab35a10c83',
        component: 'Reports',
        routes: `${routes}`,
        name: 'Отчеты',
        description: 'Отчеты',
    },

    Fields: {
        id: '0e55a3ea-6561-4c50-a74a-7600a5246a51',
        component: 'Fields',
        routes: `${routes}/fields`,
        name: 'Виртуальные меры',
        description: 'Виртуальные меры',
    },

    FieldsList: {
        id: 'be6f67df-a0f6-4a58-8704-f7ca0ac07722',
        component: 'FieldsList',
        routes: `${routes}/fieldslist`,
        name: 'Поля',
        description: 'Поля',
    },

    FizFieldsList: {
        id: '53ae7afe-4eb7-4a81-b24a-219af342de60',
        component: 'FizFieldsList',
        routes: `${routes}/fizfieldslist`,
        name: 'Используемые поля Куба',
        description: 'Используемые поля Куба',
    },

    Measures: {
        id: '78ae908d-0737-42aa-9365-fc51c99b62a6',
        component: 'Measures',
        routes: `${routes}/measures`,
        name: 'Меры',
        description: 'Меры',
    },
    Dimensions: {
        id: '3295a7ae-2c8c-474f-9e97-00b548454830',
        component: 'Dimensions',
        routes: `${routes}/dimensions`,
        name: 'Измерения',
        description: 'Измерения',
    },

    Infoservices: {
        id: '8c71a969-e5cf-4e6e-9eb9-8e17d8b96cac',
        component: 'Infoservices',
        routes: `${routes}/infoservices`,
        name: 'Инфосервисы',
        description: 'Инфосервисы',
    },
    InfoserviseList: {
        id: '04ef8cae-65fe-4ad2-9e5f-121419c652ad',
        component: 'InfoserviseList',
        routes: `${routes}/infoserviselist`,
        name: 'Инфосервисы владельцы',
        description: 'Инфосервисы владельцы',
    },
};
