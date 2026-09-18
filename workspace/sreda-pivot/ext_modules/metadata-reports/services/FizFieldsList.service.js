const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const MeasuresService = require('./Measures.service');
const DimensionsService = require('./Dimensions.service');
const FizFieldsListClass = require('./metadata/shared/FizFieldsList.class');
class FizFieldsListService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'FizFieldsList';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'measures',
                    description: 'Мера',
                    type: 'REF',
                    useParent: true,
                    link: {
                        type: 'local', // local, global, single
                        metalink: [new MeasuresService().id, new DimensionsService().id],
                    },
                },
                {
                    name: 'aggfunc',
                    description: 'Тип агрегата',
                    type: 'LIST',
                    list: {
                        parent: 'Родительский',
                        sum: 'Сумма (SUM)',
                        mean: 'Среднее (AVG)',
                        min: 'Минимум (MIN)',
                        max: 'Максимум (MAX)',
                        len: 'Количество (COUNT)',
                        DISTINCT_COUNT: 'Количество уникальных (DISTINCT_COUNT)',
                        FIRST_VALUE: 'Первый дочерний (First Child)',
                        LAST_VALUE: 'Последний дочерний (Last Child)',
                        ACCOUNT: 'Показатели (ACCOUNT)',
                        nonagg: 'Не агрегировать',
                    },
                },
            ],
        };
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.FizFieldsList.id, FizFieldsListClass);
    global.sreda.bottle.factory('fizFieldsListService', () => new FizFieldsListService());
}


module.exports = FizFieldsListService;
