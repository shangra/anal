export = WhereFormater;
/**
 * @import { IConnector } from '../../../../../metadata-connector/services/metadata/Connector.class'
 * @import { Ifrom } from './QueryBuilder.class'
 */
declare class WhereFormater {
    getDictionaryParams(whereObj: any): {
        dictionaryParams: {};
        whereParams: {};
    };
    getHavingParams(
        whereObj: any,
        params: any,
        conditions: any
    ): {
        $and: {
            [x: string]: any;
        }[];
    };
    delHavingParams(whereObj: any, params: any): {};
    replaceHavingParams(
        whereObj: any,
        attributesAggr: any,
        flatWhere: any
    ): {
        having: {
            $and: {
                [x: string]: any;
            }[];
        };
        where: {};
    };
    compressFlat(whereObj: any): {};
    normalize(where: any): {};
    flat(whereObj: any): any;
    /**
     * Очистка условий WHERE (Имеет рекурсию).
     *
     * @param { Object } whereObj - Объект с WHERE условиями для sequelize ORM.
     * @param { Array } listFields - Список для фильтрации параметров WHERE.
     *
     * @returns - Мутированный объект с отфильтрованными для WHERE условиями.
     */
    clear(whereObj: any, listFields: any[]): any;
    dictionary(whereObj: any): {};
    replace(whereObj: any, params: any): {};
    /**
     * Извлечение пользовательских фильтров.
     *
     * @param { Object } options - параметры.
     *
     * @returns { string[] } - Массив пользовательских фильтров.
     */
    extractUserFilters(options: any): string[];
    /**
     * Формировщик фильтров для логики представления.
     *
     * @param {{ filters: Array, usedFilters: Array }} usersFilters - Отборные пользовательские фильтры.
     *
     * @returns {Array<Object>} - Сформированные фильтры для логики представления.
     */
    formatFiltersForView(usersFilters: { filters: any[]; usedFilters: any[] }): Array<any>;
    /**
     * Очистка полей первого аргумента.
     *
     * @param {Object} whereObj - Объект с WHERE условиями.
     * @param {Object} params
     *
     */
    delete(whereObj: any, params: any): {};
}
//# sourceMappingURL=WhereFormater.class.d.ts.map
