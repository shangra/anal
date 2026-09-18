const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const ProcessingClass = require('./metadata/Processing.class');
const DimensionsClass = require('./metadata/shared/Dimensions.class');
class DimensionsService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'Dimensions';
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
                    name: 'type',
                    description: 'Тип поля',
                    type: 'LIST',
                    list: {
                        uuid: 'UUID',
                        text: 'TEXT',
                        string: 'STRING',
                        integer: 'INTEGER',
                        float: 'FLOAT',
                        date: 'DATE',
                        datetime: 'DATETIME',
                        boolean: 'BOOLEAN',
                    }
                },
                {
                    name: 'dimensionType',
                    description: 'Тип Измерения',
                    type: 'LIST',
                    list: {
                        date: 'Измерение времени',
                        account: 'Измерение показателей',
                    }
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL'
                },
            ]
        };
    }

    async deleteMetadata(id, body) {
        let result;
        if (id === this.id) {
            const parent = body.owner_id;

            const metaId = new ProcessingClass({ parent });
            const treeObject = await metaId.tableInfo(metaId, parent);

            for (const field in treeObject.Dimensions) {
                const guid = treeObject.Dimensions[field].id;
                result = await super.deleteMetadata(guid);
            }
        } else {
            result = await super.deleteMetadata(id);
        }

        return result;
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Dimensions.id, DimensionsClass);
    global.sreda.bottle.factory('dimensionsService', () => new DimensionsService());
}

module.exports = DimensionsService;
