export = InfoserviceClass;
/**
 * @typedef {string | { link: string, value: string }} Link
 * @typedef {{ table: string, alias: string }} Ifrom
 * @typedef {import('../../../metadata-cmp/services/metadata/source/type').default} LevelClassI
 */
declare class InfoserviceClass extends LevelClass<
    any,
    import('../../../metadata-cmp/db/models/metadata').IMetadata
> {
    constructor(props: any);
    id: string;
    props: {
        id: string;
        owner_id: string;
        class_id: string;
        class: string;
        name: string;
        description: string;
        crud: string[];
        routes: string;
    };
    /**
     * @public
     *
     * @param {*} item
     * @param {*} options
     * @returns
     */
    public subTree(item: any, options: any): Promise<[any, any, any, any]>;
    /**
     * @public
     *
     * @param {LevelClassI} meta
     * @param {string} id
     * @returns
     */
    public tableInfo(
        meta: LevelClassI,
        id: string
    ): Promise<{
        Fields: {};
        FieldsGUID: {};
        Keys: {};
        KeysGUID: {};
        ForeignKeys: {};
        ForeignKeysGUID: {};
        Indexes: {};
        Refs: {
            useWith: any;
            useView: any;
        };
    }>;
    /**
     * @private
     *
     * @param {{ id: Link, key?: Link }} param0
     * @param {string[]} PKsData
     * @param {string[]} [fieldList]
     * @returns
     */
    private readRef;
    /**
     * @private
     *
     * Собирает значения из rows в refs.
     *
     * @param {Object} refs - Ссылки.
     * @param {Object} rows - Строки.
     */
    private getRefValues;
    /**
     * @private
     *
     * из массива данных вытаскиваем уже имеющиеся записи полей
     * маркером поля является __
     * в результате формируются ref и refFields
     *
     * @param {Record<string, any>} refsToParse
     * @param {object[]} rows
     * @returns
     */
    private getAllLocalRefs;
    /**
     * @private
     *
     * Формирование refs из данных rows.
     *
     * @param {unknown} refs - Ссылки.
     * @param {unknown} rows - Строки.
     *
     * @returns {Promise<Object>}
     */
    private getAllRefs;
    /**
     * @private
     *
     * Формирует самый нижний подзапрос на основе пользовательских фильтров.
     * Если первый параметр не проходит по внутренему условию возвращает только второй.
     *
     * @param {string | any } sqlalias - Алиасы SQL.
     * @param {Object} table - Табличные данные.
     *
     * @returns {Object} - Обхект с пользовательским запросом.
     */
    private getUserQuery;
    /**
     * Предикат/парсер для JSON строки
     * (Проверка может пропустить такую строку: '12345')
     *
     * @param {string} data - данные для проверки.
     *
     * @returns {Object} - Предположительно объект после парсинга.
     */
    toJSON(data: string): any;
    /**
     * @private
     *
     * @param {*} fieldName
     * @param {*} treeObject
     * @returns
     */
    private getLinkForForeignKeys;
    /**
     * Логгер
     *
     * @private
     *
     */
    private console;
    /**
     * Достает срез данных.
     *
     * @param {string} id - ID инфосервиса.
     * @param {Object} inputOptions - Пользовательские опции.
     *
     * @returns {Promise<Object>}  - Данные из БД.
     */
    read(id: string, inputOptions: any): Promise<any>;
    /**
     * получить коннектор
     *
     * @param {any} item
     */
    getConnector(item: any): Promise<{
        connector: any;
        connectorData: import('../../../metadata-cmp/db/models/metadata').IMetadata;
    }>;
    /**
     * Метод для перегрузки выборки из бд
     *
     * @param {Object} from - Запрос для orm
     *
     * @private
     */
    private getData;
    /**
     * метод для перегрузки выборки из бд
     * @private
     */
    private countData;
}
declare namespace InfoserviceClass {
    export { Link, Ifrom, LevelClassI };
}
import LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');
type Link =
    | string
    | {
          link: string;
          value: string;
      };
type Ifrom = {
    table: string;
    alias: string;
};
type LevelClassI = import('../../../metadata-cmp/services/metadata/source/type').default;
//# sourceMappingURL=Infoservice.class.d.ts.map
