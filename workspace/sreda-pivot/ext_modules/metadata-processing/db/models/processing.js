const { Model } = require('sequelize');

/**
 * @typedef {import('./types/processing').TProcessingAttributes} TProcessingAttributes
 * @typedef {import('./types/processing').TProcessingCreationAttributes} TProcessingCreationAttributes
 */

/**
 * @extends {Model<TProcessingAttributes, TProcessingCreationAttributes>}
 */
class Processing extends Model { }

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {import('sequelize').DataTypes} DataTypes
 * @returns {typeof Processing}
 */
module.exports = (sequelize, DataTypes) => {
    Processing.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            cube_id: DataTypes.UUID,
            layer_id: DataTypes.UUID,
            processing_id: DataTypes.UUID,
            date: DataTypes.DATE,
            status: DataTypes.STRING,
        },
        {
            sequelize,
            schema: process.env.DB_SCHEMA,
            timestamps: false,
            tableName: 'processing_meta',
        },
    );

    return Processing;
};
