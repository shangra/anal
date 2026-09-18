export = AccountClass;
/**
 * @typedef AccountConfigI
 * @property {string} id
 * @property {string} parent
 * @property {string} agg_func
 * @property {string} name
 * @property {string} tilda
 */
declare class AccountClass {
    /**
     * @param {{ meta: MetadataService }} param0
     */
    constructor({ meta }: { meta: MetadataService });
    meta: import('../../../../../metadata-cmp/services/Metadata.service');
    /**
     * @public
     *
     * @param {{ options: object, treeObject: object, metaClass: MetadataService }} param0
     * @returns
     */
    public matrix({
        options,
        treeObject,
    }: {
        options: object;
        treeObject: object;
        metaClass: MetadataService;
    }): Promise<{
        mappedOptions: any[];
    }>;
    /**
     * @private
     *
     * @param {{ ref: { value: string, link: string }, systemParent: object }} param0
     * @returns
     */
    private getItems;
    /**
     * @private
     *
     * @param {{ where: object, meta: LeveClassI, idGuide: string, pkName: string, parentName: string }} param0
     * @returns
     */
    private getEqIds;
    /**
     *
     * @param {{ idGuide: string, meta: LevelClassI, parentFilter: object, connector: object, pkName: string, parentName: string, ids: string[] }} param0
     * @returns
     */
    getNeEqIds({
        idGuide,
        meta,
        parentFilter,
        connector,
        pkName,
        parentName,
        ids,
    }: {
        idGuide: string;
        meta: LevelClassI;
        parentFilter: object;
        connector: object;
        pkName: string;
        parentName: string;
        ids: string[];
    }): Promise<any>;
    /**
     * @private
     *
     * @param {AccountConfigI[]} items
     * @returns {Record<string, AccountConfigI[]>}
     */
    private groupByAggField;
    /**
     * @protected
     *
     * @param {{ attributes: string[], accountDimension: { field: string }, fields: Record<string, object> }} param0
     * @returns
     */
    protected checkAccountField({
        attributes,
        accountDimension,
        fields,
    }: {
        attributes: string[];
        accountDimension: {
            field: string;
        };
        fields: Record<string, object>;
    }): any;
    getParent(where: any, attribute: any): any;
    /**
     * получить данные по pk parentKey и дефолтному фильтру из дерева метаданных
     *
     * @private
     *
     * @param {*} treeObject
     * @param {*} item
     * @returns {{ viewField: string, pkName: string, parentName: string, parentFilter: WhereOptions | { $eq: string } }}
     */
    private getRefConfig;
    /**
     * @private
     *
     * @param {Record<string, { settings: { primarykey: boolean }, fields: object }>} keys
     * @returns {{ field: string, key: string }}
     */
    private getPK;
    /**
     * парсинг parent Key из дерева метаданных
     *
     * @private
     *
     * @param {*} treeObject
     * @param {string | { value: string }} defVal
     * @returns
     */
    private getParenPk;
    /**
     * проверяем есть ли агрегативное поле ACCOUNT в атрибутах среза и есть ли функция агрегации ACCOUNT
     *
     * @private
     *
     * @param {({ field: string, func: string, alias: string })[]} attributes
     */
    private isValid;
}
declare namespace AccountClass {
    export { MetadataService, LevelClassI, LeveClassI, WhereOptions, AccountConfigI };
}
type MetadataService = import('../../../../../metadata-cmp/services/Metadata.service');
type LevelClassI = import('../../../../../metadata-cmp/services/Metadata.service').LevelClassI;
type LeveClassI = import('../../../../../metadata-cmp/services/metadata/source/type/index').default;
type WhereOptions = import('../../../../../../db/rls/types/WhereOptions').WhereOptions;
type AccountConfigI = {
    id: string;
    parent: string;
    agg_func: string;
    name: string;
    tilda: string;
};
//# sourceMappingURL=Account.class.d.ts.map
