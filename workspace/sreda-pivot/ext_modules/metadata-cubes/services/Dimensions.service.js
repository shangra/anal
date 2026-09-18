const ApiError = require('../../../core/exceptions/ApiError');
const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const InfoservicesClass = require('./Infoservices.service');
const CubesClass = require('./metadata/Cubes.class');
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
                        ref: 'REF'
                    }
                },
                {
                    name: 'groupTag',
                    description: 'Тег группы',
                    type: 'STRING'
                },
                {
                    name: 'dimensionType',
                    description: 'Тип измерения',
                    type: 'LIST',
                    list: {
                        dateDimension: 'Измерение времени',
                        accountDimension: 'Измерение показателей'
                    }
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL'
                },
                {
                    name: 'totalsOnoff',
                    description: 'Показывать итоги',
                    type: 'BOOL'
                }
            ]
        };
    }

    async deleteMetadata(id, body) {
        // return await MetadataCMP.delMetadata(id);
        let result;
        if (id === this.id) {
            const parent = body.parent.id;
            const metaId = new CubesClass({ parent });
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

    async updateMetadata(id, body, options) {
        if ((body?.settings?.dimensionType === constants.DATE_DIMENSION) && body?.settings?.type !== 'date') {
            throw ApiError.BadRequest(`Измерением времени может быть только измерение с типом данных DATE`);
        }

        return super.updateMetadata(id, body, options);
    }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Dimensions.id, DimensionsClass);
    global.sreda.bottle.factory('dimensionService', () => new DimensionsService());
}

module.exports = DimensionsService;
