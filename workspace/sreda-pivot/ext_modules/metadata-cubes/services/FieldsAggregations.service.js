const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const FieldsAggregationsClass = require('./metadata/shared/FieldsAggregations.class');
const constants = require('../constants');

class FieldsAggregationsService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'FieldsAggregations';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'aggrFunc',
                    description: 'Функция агрегации по-умолчанию',
                    type: 'LIST',
                    list: {
                        SUM: 'Сумма (SUM)',
                        AVG: 'Среднее (AVG)',
                        MIN: 'Минимум (MIN)',
                        MAX: 'Максимум (MAX)',
                        COUNT: 'Количество (COUNT)',
                        DISTINCT_COUNT: 'Количество уникальных (DISTINCT_COUNT)',
                        FIRST_VALUE: 'Первый дочерний (FIRST_VALUE)',
                        LAST_VALUE: 'Последний дочерний (LAST_VALUE)',
                        ACCOUNT: 'Показатели (ACCOUNT)'
                    }
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL'
                },
            ]
        };
    }
}

if (global.sreda.bottle) {  
    global.sreda.bottle.constant(constants.FieldsAggregations.id, FieldsAggregationsClass);
    global.sreda.bottle.factory('fieldsAggregationsService', () => new FieldsAggregationsService());
}

module.exports = FieldsAggregationsService;
