const { r_cg } = sreda.models;

/**
 * @typedef {import("../../db/models/types/RuntimeConfig").RuntimeConfigAttributes} RuntimeConfigAttributes
 * @typedef {import("../../db/models/types/RuntimeConfig").RuntimeConfigCreationAttributes} RuntimeConfigCreationAttributes
 */

class RuntimeConfigRepository {
    /**
     * @param {string} id
     * 
     * @returns {Promise<RuntimeConfigAttributes>}
     */
    static async getByPk(id) {
        return r_cg.findOne({ where: { id }, raw: true });
    }

    /**
     * @param {string} key 
     * @returns {Promise<RuntimeConfigAttributes>}
     */
    static async getByKey(key) {
        return r_cg.findOne({ where: { key }, raw: true });
    }

    /**
     * @param {RuntimeConfigCreationAttributes} body
     */
    static async create(body) {
        return r_cg.create(body)
    }
}

module.exports = RuntimeConfigRepository;
