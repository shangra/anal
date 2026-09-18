export = BaseClass;
/**
 * Поведение без иерархий
 *
 * @class BaseClass
 * @implements {IQueryBuilerBehavior}
 */
declare class BaseClass extends DefaultClass implements IQueryBuilerBehavior {
    /**
     * @protected
     *
     * @param {{ where: WhereOptions, pkName: string, parentName?: string, hierarchy?: boolean }} where
     * @returns
     */
    protected getRows({
        where,
        pkName,
        parentName,
        hierarchy,
    }: {
        where: WhereOptions;
        pkName: string;
        parentName?: string;
        hierarchy?: boolean;
    }): Promise<{
        rows: any;
        keys: any[];
    }>;
    /**
     * получить данные по pk parentKey и дефолтному фильтру из дерева метаданных
     *
     * @protected
     *
     * @param {*} treeObject
     * @param {*} item
     * @returns {{ pkName: string, parentName: string, parentFilter: WhereOptions | { $eq: string } }}
     */
    protected getRefConfig(
        treeObject: any,
        item: any
    ): {
        pkName: string;
        parentName: string;
        parentFilter:
            | WhereOptions
            | {
                  $eq: string;
              };
    };
    /**
     * @protected
     *
     * @param {Record<string, { settings: { primarykey: boolean }, fields: object }>} keys
     * @returns {string}
     */
    protected getPK(
        keys: Record<
            string,
            {
                settings: {
                    primarykey: boolean;
                };
                fields: object;
            }
        >
    ): string;
    /**
     * парсинг parent Key из дерева метаданных
     *
     * @protected
     *
     * @param {*} treeObject
     * @param {string | { value: string }} defVal
     * @returns
     */
    protected getParent(
        treeObject: any,
        defVal:
            | string
            | {
                  value: string;
              }
    ): string;
}
declare namespace BaseClass {
    export {
        LeveClassI,
        WhereOptions,
        IQueryBuilerBehavior,
        IBehaviourQueryOptions,
        IBehaviourOptions,
    };
}
import DefaultClass = require('./Default.class');
type LeveClassI = import('../../../../../metadata-cmp/services/metadata/source/type/index').default;
type WhereOptions = import('../../../../../../db/rls/types/WhereOptions.d.ts').WhereOptions;
type IQueryBuilerBehavior = import('../behaviour/types/index').IQueryBuilerBehavior;
type IBehaviourQueryOptions = import('../behaviour/types/index').IBehaviourQueryOptions;
type IBehaviourOptions = import('../behaviour/types/index').IBehaviourOptions;
//# sourceMappingURL=Base.class.d.ts.map
