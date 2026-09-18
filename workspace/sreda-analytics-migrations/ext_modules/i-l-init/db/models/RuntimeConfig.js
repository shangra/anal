const { Model } = require('sequelize');

/**
 * @typedef {import('./types/RuntimeConfig').RuntimeConfigAttributes} RuntimeConfigAttributes
 * @typedef {import('./types/RuntimeConfig').RuntimeConfigCreationAttributes} RuntimeConfigCreationAttributes
 */

/**
 * @extends {Model<RuntimeConfigAttributes, RuntimeConfigCreationAttributes>}
 */
class RuntimeConfigModel extends Model { }

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    RuntimeConfigModel.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        key: DataTypes.TEXT,
        value: DataTypes.TEXT,
    }, {
        sequelize,
        modelName: 'r_cg',
        schema: process.env.DB_SCHEMA,
        freezeTableName: true,
        timestamps: false
    });
    return RuntimeConfigModel;
};
