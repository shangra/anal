const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const ProcessingClass = require('./metadata/Processing.class');
const MeasuresClass = require('./metadata/shared/Measures.class');
class MeasuresService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'Measures';
        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
        return {
            form: [
                {
                    name: 'nameField',
                    description: 'Представление поля',
                    type: 'STRING',
                    template: 'test_field'
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
            ],
        };
    }

    async deleteMetadata(id, body) {
        let result;
        if (id === this.id) {
            const parent = body.parent.id;

            const metaId = new ProcessingClass({ parent });
            const treeObject = await metaId.tableInfo(metaId, parent);

            for (const field in treeObject.Measures) {
                const guid = treeObject.Measures[field].id;
                result = await super.deleteMetadata(guid);
            }
        } else {
            result = await super.deleteMetadata(id);
        }

        return result;
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Measures.id, MeasuresClass);
    global.sreda.bottle.factory('measuresService', () => new MeasuresService());
}

module.exports = MeasuresService;
