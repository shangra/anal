const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const FieldsClass = require('./metadata/shared/Fields.class');
const constants = require('../constants');

const description = `
[?
    /**
     * список доступных функций
     * 
     * сумма по полю
     * sumByField
     *  - принимает:
     *    - массив данных
     *    - название поля
     *  - возвращает:
     *    - результат
     * 
     * среднее по полю
     * avgByField
     *  - принимает:
     *    - массив данных
     *    - название поля
     *  - возвращает:
     *    - результат
     * 
     * минимальное по полю
     * minByField
     *  - принимает:
     *    - массив данных
     *    - название поля
     *  - возвращает:
     *    - результат
     * 
     * максимальное по полю
     * maxByField
     *  - принимает:
     *    - массив данных
     *    - название поля
     *  - возвращает:
     *    - результат
     * 
     * отфильтровать массив данных по значению поля
     * filterByFieldValue
     *  - принимает:
     *    - массив данных
     *    - название поля
     *    - искомое значение поля
     *  - возвращает:
     *    - отфильтрованные данные
     * 
     * группирует значения по полю переданным полям
     * getGroupedRowsWithContext
     *  - принимает:
     *    - массив полей
     *  - возвращает:
     *    - отфильтрованные данные
     * 
     * группирует значения по всем поля кроме переданных
     * getGroupedByAllKeysExeptWithContext
     *  - принимает:
     *    - массив полей
     *  - возвращает:
     *    - отфильтрованные данные
     */

    //пример получаем сумму по r_bal_all:->:SUM
    const val = sumByField(
        getGroupedByAllKeysExeptWithContext(['r_bal_all:->:SUM']),
        'r_bal_all:->:SUM'
    );
?]
[[val]]
`;

class FieldsService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Fields';
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
                    name: 'fnfield',
                    description: 'Расчет ячеек',
                    type: 'TEXT',
                    template: description,
                    default: description,
                },
                {
                    name: 'totalFnfield',
                    description: 'Расчет итогов',
                    type: 'TEXT',
                    template: description,
                    default: description,
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
                        ACCOUNT: 'Показатели (ACCOUNT)'
                    }
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
            ],
        };
    }
}

if (global.sreda.bottle) {    
    global.sreda.bottle.constant(constants.Fields.id, FieldsClass);
    global.sreda.bottle.factory('fieldsService', () => new FieldsService());
}

module.exports = FieldsService;
