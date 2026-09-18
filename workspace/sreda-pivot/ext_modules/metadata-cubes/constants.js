const routes = 'metadata/cubes';

module.exports = {
    delimeter: '/',
    dotDelimeter: '.',
    aggrDelimeter: ':->:',

    DATE_DIMENSION: 'dateDimension',
    ACCOUNT_DIMENSION: 'accountDimension',

    Cubes: {
        id: '4d0cb622-60fc-40db-97d6-be103b26051e',
        component: 'Cubes',
        routes: `${routes}`,
        name: 'Кубы',
        description: 'Кубы',
    },

    Infoservices: {
        id: '75960867-7c8d-486a-ad15-94d387cda86e',
        component: 'Infoservices',
        routes: `${routes}/infoservices`,
        name: 'Инфосервисы',
        description: 'Инфосервисы',
    },

    Measures: {
        id: 'b8e2b31f-f36d-4b77-b13d-f391bd96c60a',
        component: 'Measures',
        routes: `${routes}/measures`,
        name: 'Меры',
        description: 'Меры',
    },
    Dimensions: {
        id: '00234649-8eaa-4a3d-9adb-280b01fa8437',
        component: 'Dimensions',
        routes: `${routes}/dimensions`,
        name: 'Измерения',
        description: 'Измерения',
    },
    InfoserviseList: {
        id: '4bc0bfd0-6fb5-4f85-8668-117a42604ddc',
        component: 'InfoserviseList',
        routes: `${routes}/infoserviselist`,
        name: 'Инфосервисы владельцы',
        description: 'Инфосервисы владельцы',
    },

    Fields: {
        id: '14eb1a4e-64cd-4f65-9af6-b64e7b5f90af',
        component: 'Fields',
        routes: `${routes}/fields`,
        name: 'Виртуальные меры',
        description: 'Виртуальные меры',
    },

    FieldsList: {
        id: '8a68fd09-5ecc-4d88-b965-d8a7ff2d9092',
        component: 'FieldsList',
        routes: `${routes}/fieldslist`,
        name: 'Поля',
        description: 'Поля',
    },

    FizFieldsList: {
        id: '8a68fd09-5ecc-4d98-b965-d8a7ff2d9092',
        component: 'FizFieldsList',
        routes: `${routes}/fizfieldslist`,
        name: 'Используемые поля Куба',
        description: 'Используемые поля Куба',
    },

    Binds: {
        id: '619f7cc8-8185-470a-9ca1-eed47b0f363d',
        component: 'Binds',
        routes: `${routes}/binds`,
        name: 'Связи',
        description: 'Связи',
    },

    MeasuresAggregations: {
        id: '0e71dd74-a34b-4a8a-a5f0-e730901e0e82',
        component: 'MeasuresAggregations',
        routes: `${routes}/measures/aggregations`,
        name: 'Функции Агрегации',
        description: 'Функции Агрегации',
    },

    FieldsAggregations: {
        id: 'b86e899b-b467-4dfd-bd80-93d2bfec9591',
        component: 'FieldsAggregations',
        routes: `${routes}/fields/aggregations`,
        name: 'Функции Агрегации',
        description: 'Функции Агрегации',
    },
};
