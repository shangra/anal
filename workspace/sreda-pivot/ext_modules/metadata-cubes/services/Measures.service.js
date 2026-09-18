const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const CubesClass = require('./metadata/Cubes.class');
const MeasuresClass = require('./metadata/shared/Measures.class');
class MeasuresService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'Measures';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'nameField',
                    description: 'Представление поля',
                    type: 'STRING',
                    template: 'test_field',
                },
                {
                    name: 'type',
                    description: 'Тип поля',
                    type: 'LIST',
                    list: {
                        uuid: 'UUID',
                        text: 'TEXT',
                        string: 'STRING',
                        integer: 'INTEGER',
                        float: 'FLOAT',
                        date: 'DATE',
                        datetime: 'DATETIME',
                        boolean: 'BOOLEAN',
                        ref: 'REF',
                    },
                },
                {
                    name: 'groupTag',
                    description: 'Тег группы',
                    type: 'STRING'
                },
                {
                    name: 'format',
                    description: 'Формат',
                    type: 'LIST',
                    list: {
                        default: 'Общий',
                        number: 'Числовой',
                        money: 'Денежный',
                        finance: 'Финансовый',
                        date: 'Дата',
                        datetime: 'Время',
                        percent: 'Процентный',
                        fractional: 'Дробный',
                        exponential: 'Экспоненциальный',
                        text: 'Текстовый',
                        additional: 'Дополнительный',
                        // ref: 'REF',
                    },
                },
                {
                    name: 'aggrFunc',
                    description: 'Функция агрегации по-умолчанию',
                    type: 'LIST',
                    list: {
                        NONE: 'Не выбрано',
                        SUM: 'Сумма (SUM)',
                        AVG: 'Среднее (AVG)',
                        MIN: 'Минимум (MIN)',
                        MAX: 'Максимум (MAX)',
                        COUNT: 'Количество (COUNT)',
                        DISTINCT_COUNT: 'Количество уникальных (DISTINCT_COUNT)',
                        FIRST_VALUE: 'Первый дочерний (FIRST_VALUE)',
                        LAST_VALUE: 'Последний дочерний (LAST_VALUE)',
                        ACCOUNT: 'Показатели (ACCOUNT)',
                    }
                },
                {
                    name: 'onoffFilter',
                    description: 'Отключить фильтрацию по мерам',
                    type: 'BOOL'
                },
                {
                    name: 'applyUnits',
                    description: 'Применимость ед. измерения',
                    type: 'BOOL',
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
            ],
        };
    }

    async deleteMetadata(id, body) {
        // return await MetadataCMP.delMetadata(id);
        let result;
        if (id === this.id) {
            const parent = body.parent.id;
            const metaId = new CubesClass({ parent });
            const treeObject = await metaId.info(metaId, parent);
            const MeasuresGUID = Object.keys(treeObject.MeasuresGUID);
            for (const guid of MeasuresGUID) {
                result = await super.deleteMetadata(guid);
            }
            // console.log(MeasuresGUID);
        } else {
            result = await super.deleteMetadata(id);
        }

        return result;
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Measures.id, MeasuresClass);
    global.sreda.bottle.factory('measuresService', () => new MeasuresService());
}

module.exports = MeasuresService;
