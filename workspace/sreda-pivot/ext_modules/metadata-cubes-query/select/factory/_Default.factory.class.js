/**
 * @typedef {import("../types").IRefItem} IRefItem
 * @typedef {import("../types").IFactoryInit} IFactoryInit
 * @typedef {import("../types").IQueryBuilerBehavior} IQueryBuilerBehavior
 * @typedef {import('../../../metadata-cmp/services/Metadata.service').IRef} IRef
 * @typedef {import("../types").IFactoryEntity<IQueryBuilerBehavior>} IFactoryEntity
 * @typedef {import("../../../metadata-cmp/services/metadata/source/type").default} LevelClassI
*/

const ApiError = require("../../../../core/exceptions/ApiError");
const MetadataService = require("../../../metadata-cmp/services/Metadata.service");
const Metadata = new MetadataService();

const { ref_extract } = require("../../../metadata-cmp/util");

class DefaultFactoryClass {
    constructor() {
        this.entities.sort((a, b) => a.rank() - b.rank());
    }

    /** @type {IFactoryEntity[]} */
    entities = [];

    /**
     * @param {IFactoryInit} data 
     * @returns {Promise<IQueryBuilerBehavior>}
     */
    async init(data) {
        const { value: idGuide } = ref_extract(data.field);

        const meta = idGuide
            ? await Metadata.getInstance(idGuide, {})
            : null;

        const entity = await this.getValidEntity(meta, idGuide);

        const { table, field, delimeter } = data;

        return new entity({ meta, table, field, delimeter });
    }

    /**
     * @protected
     * 
     * @param {LevelClassI} meta 
     * @param {string} idGuide 
     * @returns 
     */
    async getValidEntity(meta, idGuide) {
        const guideConnector = await (
            meta?.getConnector
                ? this.getConnector(meta, idGuide)
                : null
        );

        for (const entitiy of this.entities) {

            const check = await entitiy.isValid({ guideConnector });
            if (!check) continue;

            return entitiy;
        }

        throw ApiError.ServerError(`Не найден обработчик`);
    }

    /**
     * @protected
     * 
     * @param {LevelClassI} meta 
     * @param {string} idGuide 
     */
    async getConnector(meta, idGuide) {
        const item = await meta.getItem(idGuide);

        const { connector: hierarchyConnector } = await meta.getConnector(item);

        return hierarchyConnector;
    }
}

module.exports = DefaultFactoryClass;