const { Processing } = sreda.models;

class ProcessingModel {
    static attributes() {
        return Object.keys(Processing.rawAttributes);
    }

    /**
     * @param {object} body 
     * @param {object} options 
     */
    static create(body, options) {
        return Processing.create(body, options);
    }

    /**
     * @param {object} body 
     * @param {object} where 
     * @param {object} options 
     */
    static async update(body, where, options) {
        return Processing.update(body, where, options);
    }

    /**
     * @param {object} where 
     * @param {object} options 
     */
    static async findOne(where, options) {
        return Processing.findOne(where, options);
    }

    /**
     * @param {object} where 
     * @param {object} options 
     */
    static async findAll(where, options) {
        return Processing.findAll(where, options);
    }

    /**
     * @param {object} where 
     * @param {object} options 
     */
    static async count(where, options) {
        return Processing.count(where, options)
    }
}

module.exports = ProcessingModel;
