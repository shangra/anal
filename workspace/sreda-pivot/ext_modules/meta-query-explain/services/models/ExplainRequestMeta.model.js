const { ExplainRequestMeta } = sreda.models;

class ExplainRequestMetaModel {
    /**
     * @param {string} id
     */
    static async get(id) {
        const expl = await ExplainRequestMeta.findOne({ where: { id: id } });

        if (expl) {
            expl.meta = JSON.parse(expl.meta || '');
        }

        return expl;
    }

    /**
     * @param {object} body
     * @param {object} options
     * @returns {Promise<{ id: string }>}
     */
    static async new(body, options) {
        return ExplainRequestMeta.create(body, options);
    }

    /**
     * @param {string} id
     * @param {object} data
     * @returns {Promise<{ result: true }>}
     */
    static async update(id, data) {
        await ExplainRequestMeta.update(data, { where: { id } });
        return { result: true };
    }

    static async del(id) {
        await ExplainRequestMeta.destroy({ where: { id } });
        return { result: true };
    }
}

module.exports = ExplainRequestMetaModel;
