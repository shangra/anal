const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const ReportsMetadata = require('./metadata/Reports.class');
const constants = require('../constants');

class ReportsService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Reports';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async getClassesMetadata(innerResult, functionParams) {
        return super.getClassesMetadata(innerResult, functionParams);
    }

    /**
     * @param {string} id 
     */
    async form(id) {
        return {
            form: [],
            buttons: [],
        };
    }

    /**
     * @param {object} body
     * @returns {Promise<void>}
     */
    async create(body) {
        console.log('create', body);
    }

    /**
     * @param {string} id 
     * @param {Record<string, string | string[]>} options 
     */
    async read(id, options = {}) {
        return new ReportsMetadata({ id }).read(id, options);
    }

    /**
     * @param {string} id 
     * @param {object} body 
     * @returns {Promise<void>}
     */
    async update(id, body) {
        console.log('update', id, body);
    }

    /**
     * @param {string} id 
     * @returns {Promise<void>}
     */
    async delete(id) {
        console.log('delete', id);
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Reports.id, ReportsMetadata);
    global.sreda.bottle.factory('reportsService', () => new ReportsService());
}

module.exports = ReportsService;
