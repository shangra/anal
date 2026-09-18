const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const MetadataCMPClass = require('../../metadata-cmp/services/Metadata.service');
const MetadataCMP = new MetadataCMPClass();

class IndexesService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        this.id = '201823bd-924f-4a4b-9a8a-658d020c5e01';
        this.component = 'Indexes';
    }
}

module.exports = IndexesService;
