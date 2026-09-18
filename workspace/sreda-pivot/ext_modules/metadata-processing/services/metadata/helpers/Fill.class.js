const Extensions = require("../../../../../core/class/Extensions.class");
const connection = require("../../../../../core/db/connection")

const ProcessingClass = require("../Processing.class");

const CubesClass = require("../../../../metadata-cubes/services/metadata/Cubes.class");

const MeasuresServiceClass = require("../../Measures.service");
const MeasuresService = new MeasuresServiceClass();

const DimensionsServiceClass = require("../../Dimensions.service");
const DimensionsService = new DimensionsServiceClass();

/**
 * @typedef {import('../../../../../db/rls/types/WhereOptions').WhereOptions} WhereOptions
 * @typedef {import("../../../../../db/rls/types/WhereOptions").TAggField} TAggField
 * @typedef {import("../Processing.class").ProcessingOptionsI} ProcessingOptionsI
 * @typedef {import("../../../../../db/rls/types/WhereOptions").TField} TField
 * @typedef {import('sequelize').Transaction} Transaction
 * @typedef {import("../Processing.class").RefI} RefI
 */

class FillProcessingClass extends Extensions {
    /**
     * @param {string} id 
     */
    async fill(id) {
        const meta = new ProcessingClass({ id });

        const item = await meta.getItem(id);

        const cubeId = item.owner_id;

        const cube = new CubesClass();

        const tableInfo = await cube.tableInfo(cube, cubeId);

        const dimensions = Object.values(tableInfo.Dimensions);

        const transaction = await connection.transaction();

        try {
            const values = dimensions.map((dimension) => {
                const field = tableInfo.Fields[dimension.field];

                return {
                    name: dimension.name,
                    description: dimension.name,
                    owner_id: id,
                    class_id: DimensionsService.id,
                    class: DimensionsService.component,
                    settings: {
                        nameField: field.field,
                        field: field.field,
                        type: field.type,
                        onoff: false
                    }
                }
            });

            await Promise.all(values.map(async (val) => MeasuresService.createMetadata(val, { transaction })));

            await transaction.commit();
        } catch (e) {
            await transaction.rollback();

            throw e;
        }

        return { result: true }
    }
}

module.exports = FillProcessingClass;
