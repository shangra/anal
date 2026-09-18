const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');

const constants = require('../constants');
// const DimensionsService = require('./Dimensions.service');

// const ProcessingClass = require('./metadata/Processing.class');
// const DimensionsClass = require('./metadata/shared/Dimensions.class');
const MatrixClass = require('./metadata/shared/Matrix.class');
class MatrixService extends DefaultMetaObject {
    constructor() {
        super();

        const name = 'Matrix';
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
                // {
                //     name: 'nameField',
                //     description: 'Ссылка',
                //     type: 'REF',
                //     // link: {
                //     //     type: 'local', // local, global, single
                //     //     // metalink: [new DimensionsClass().id, new DimensionsService().id],
                //     //     metalink: [new DimensionsService().id],
                //     // },
                //     link: {
                //         parent: 'infoservice.manifest.settings.ref.link',
                //         field: ['Dimensions']
                //     },
                // },
                {
                    name: 'maxLevel',
                    description: 'Максимальный уровень просчета',
                    type: 'INTEGER',
                },
                {
                    name: 'onoff',
                    description: 'Отключить',
                    type: 'BOOL',
                },
            ],
        };
    }

    // async deleteMetadata(id, body) {
    //     let result;
    //     if (id === this.id) {
    //         const parent = body.parent.id;

    //         const metaId = new ProcessingClass({ parent });
    //         const treeObject = await metaId.tableInfo(metaId, parent);

    //         for (const field in treeObject.Measures) {
    //             const guid = treeObject.Measures[field].id;
    //             result = await super.deleteMetadata(guid);
    //         }
    //     } else {
    //         result = await super.deleteMetadata(id);
    //     }

    //     return result;
    // }
}

if (global.sreda.bottle) {
    global.sreda.bottle.constant(constants.Matrix.id, MatrixClass);
    global.sreda.bottle.factory('matrixService', () => new MatrixService());
}

module.exports = MatrixService;
