const routes = 'metadata';

module.exports = {
    delimeter: ':->:',

    Statuses: {
        pending: 'pending',
        in_progress: 'in_progress',
        resolved: 'resolved',
        rejected: 'rejected'
    },

    Matrix: {
        id: '1b8b0749-ff1a-430a-9d02-81626b3ea1a4',
        component: 'ProcessingMatrix',
        routes: `${routes}/processing/matrix`,
        name: 'Просчеты',
        description: 'Просчеты',
    },

    Measures: {
        id: 'd785777b-90ad-41b7-b8f3-fbea67dc99a8',
        component: 'ProcessingMeasuresList',
        routes: `${routes}/processing/measures`,
        name: 'Меры',
        description: 'Меры',
    },

    Dimensions: {
        id: 'cafa1e2f-c9d4-40d0-b977-fbe2ebd73681',
        component: 'ProcessingDimensionsList',
        routes: `${routes}/processing/dimensions`,
        name: 'Измерения',
        description: 'Измерения',
    },

    Aggregations: {
        id: 'fde80870-413b-4c95-8ca8-204638f874d9',
        component: 'ProcessingAggregation',
        routes: `${routes}/processing/measures/aggregations`,
        name: 'Функции Агрегации',
        description: 'Функции Агрегации',
    },

    Processing: {
        id: '4141e742-995d-4c44-9f2a-13698cc54631',
        component: 'Processing',
        routes: `${routes}/processing`,
        name: 'Процессинг',
        description: 'Процессинг',
    },
};
