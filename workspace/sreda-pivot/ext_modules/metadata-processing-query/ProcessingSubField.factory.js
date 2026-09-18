const BaseSubFieldClass = require("./subField/BaseSubFieldClass.class");

/**
 * @typedef {import('../metadata-cmp/services/Metadata.service')} MetadataService
 * @typedef {import('../metadata-cmp/services/Metadata.service').LevelClassI} LevelClassI
 * @typedef {import("../metadata-cubes-query/select/types").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import("../metadata-cubes-query/select/types").IFactory<IQueryBuilerBehavior>} IFactory
 */

/**
 * @implements {IFactory}
 */
class ProcessingSubFieldFactory {
    /**
     * @param {MetadataService} meta 
     * @param {{ console(msg: string, meta: any): Promise<void> }} logger 
     */
    constructor(meta, logger) {
        this.meta = meta;
        this.logger = logger;
    }

    behaviours = [BaseSubFieldClass];

    /**
     * Сформировать необходимый класс поведения в зависимости от переданных параметров
     */
    async init({ refItem, field }) {
        return new BaseSubFieldClass({ field, refItem });
    }
}

module.exports = ProcessingSubFieldFactory;