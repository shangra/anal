const { ExplainRequest } = sreda.models;

class ExplainRequestModel {
    /**
     * @param {string} id
     */
    static async get(id) {
        const explain = await ExplainRequest.findOne({ where: { answerId: id } });

        if (explain) {
            explain.plan = JSON.parse(explain.plan || '');
        }

        return explain;
    }

    /**
     * @param {object} body
     */
    static async new(body) {
        return ExplainRequest.create(body);
    }

    /**
     * @param {string} id
     * @param {object} data
     * @returns {Promise<{result: true}>}
     */
    static async update(id, data) {
        await ExplainRequest.update(data, { where: { id } });
        return { result: true };
    }

    /**
     * @param {string} id
     * @returns {Promise<{result: true}>}
     */
    static async del(id) {
        await ExplainRequest.destroy({ where: { id } });
        return { result: true };
    }
}

module.exports = ExplainRequestModel;
