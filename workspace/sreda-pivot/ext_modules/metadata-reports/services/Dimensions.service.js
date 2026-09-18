const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const ReportsClass = require('./metadata/Reports.class');
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
                    template: 'test_field',
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
                        ref: 'REF',
                    },
                },
                {
                    name: 'groupTag',
                    description: 'Тег группы',
                    type: 'STRING'
                },
                {
                    name: 'dateDimension',
                    description: 'Измерение времени',
                    type: 'BOOL'
                },
                {
                    name: 'accountDimension',
                    description: 'Измерение показателей',
                    type: 'BOOL'
                },
                {
                    name: 'totalsOnoff',
                    description: 'Показывать итоги',
                    type: 'BOOL',
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
        // return await MetadataCMP.delMetadata(id);
        let result;
        if (id === this.id) {
            const parent = body.parent.id;
            const metaId = new ReportsClass({ parent });
            const treeObject = await metaId.info(metaId, parent);
            const DimensionsGUID = Object.keys(treeObject.DimensionsGUID);
            for (const guid of DimensionsGUID) {
                result = await super.deleteMetadata(guid);
            }
            // console.log(MeasuresGUID);
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
