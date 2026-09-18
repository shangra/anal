const { Op } = require('sequelize');

const { PivotSchemas } = sreda.models;

class PivotSchemasModel {
    static async createPivotSchema(data) {
        return PivotSchemas.create(data);
    }

    static async updatePivotSchema(id, data) {
        return PivotSchemas.update(data, { where: { id } });
    }

    static async deletePivotSchema(id) {
        return PivotSchemas.destroy({ where: { id } });
    }

    static async getPivotSchemaById(id) {
        return PivotSchemas.findAll({ where: { id } });
    }

    static async getPivotSchemas() {
        return PivotSchemas.findAll({ raw: true });
    }

    static async getPivotSchemasByPivotId(pivotId, permissionIds) {
        return PivotSchemas.findAll({
            where: {
                pivotId,
                [Op.or]: [{ permissionRead: 'all' }, { owner: permissionIds }, { objectRead: permissionIds }],
            },
        });
    }
}

module.exports = PivotSchemasModel;
