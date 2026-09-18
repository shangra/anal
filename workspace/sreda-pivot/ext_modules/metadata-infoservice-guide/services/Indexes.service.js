const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');

class IndexesService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Indexes';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }
}

module.exports = IndexesService;
