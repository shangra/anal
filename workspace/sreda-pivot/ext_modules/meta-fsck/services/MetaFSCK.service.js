const Extensions = require('../../../core/class/Extensions.class');

const FSCK = require('../index.js');

const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

class MetaFSCKService extends Extensions {
    async postQuery(id, body) {
        const result = {
            text: '-- ... --',
        };

        const meta = await Metadata.getParentInstance(id, {}); // экземпляр класса-оператора объекта
        const self = await Metadata.getItem(id, {}); // объект
        const opts = {};

        const report = (result.report = []);
        for await (const entry of FSCK.run(meta, self, opts))
            report.push(entry);

        return result;
    }
}

module.exports = MetaFSCKService;
