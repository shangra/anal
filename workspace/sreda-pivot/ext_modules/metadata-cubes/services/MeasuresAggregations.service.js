const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const MeasuresAggregationsClass = require('./metadata/shared/MeasuresAggregations.class');
class MeasuresAggregations extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'MeasuresAggregations';
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
                    name: 'onoffFilter',
                    description: 'Отключить фильтрацию по мерам',
                    type: 'BOOL'
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
    global.sreda.bottle.constant(constants.MeasuresAggregations.id, MeasuresAggregationsClass);
    global.sreda.bottle.factory('measuresAggregations', () => new MeasuresAggregations());
}

module.exports = MeasuresAggregations;
