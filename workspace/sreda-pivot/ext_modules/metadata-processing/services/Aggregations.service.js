const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const AggregationsClassPath = require('./metadata/shared/Aggregations.class');
class AggregationsService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'Aggregations';
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
    global.sreda.bottle.constant(constants.Aggregations.id, AggregationsClassPath);
    global.sreda.bottle.factory('aggregationsService', () => new AggregationsService());
}

module.exports = AggregationsService;
