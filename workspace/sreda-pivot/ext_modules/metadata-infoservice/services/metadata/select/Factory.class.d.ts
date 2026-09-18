export = Factory;
/**
 * @typedef {import('../../../../metadata-cmp/services/Metadata.service')} MetadataService
 * @typedef {import('../../../../metadata-cmp/services/Metadata.service').LevelClassI} LevelClassI
 * @typedef {import('./behaviour/types/index').IFactory} IFactory
 * @typedef {import('./behaviour/types/index').IFactoryInit} IFactoryInit
 * @typedef {import('./behaviour/types/index').IBehaviourOptions} IBehaviourOptions
 * @typedef {import('./behaviour/types/index').IQueryBuilerBehavior} IQueryBuilerBehavior
 */
/**
 * @class Factory
 * @implements {IFactory}
 */
declare class Factory implements IFactory {
    /**
     * @param {MetadataService} meta
     */
    constructor(meta: MetadataService);
    meta: import('../../../../metadata-cmp/services/Metadata.service');
    /**
     * Сформировать необходимый класс поведения в зависимости от переданных параметров
     *
     * @param {IFactoryInit} param0
     * @returns {Promise<IQueryBuilerBehavior>}
     */
    init({
        isBehaviour,
        refItem,
        field,
        table,
        delimeter,
        connector,
    }: IFactoryInit): Promise<IQueryBuilerBehavior>;
}
declare namespace Factory {
    export {
        MetadataService,
        LevelClassI,
        IFactory,
        IFactoryInit,
        IBehaviourOptions,
        IQueryBuilerBehavior,
    };
}
type MetadataService = import('../../../../metadata-cmp/services/Metadata.service');
type LevelClassI = import('../../../../metadata-cmp/services/Metadata.service').LevelClassI;
type IFactory = import('./behaviour/types/index').IFactory;
type IFactoryInit = import('./behaviour/types/index').IFactoryInit;
type IBehaviourOptions = import('./behaviour/types/index').IBehaviourOptions;
type IQueryBuilerBehavior = import('./behaviour/types/index').IQueryBuilerBehavior;
//# sourceMappingURL=Factory.class.d.ts.map
