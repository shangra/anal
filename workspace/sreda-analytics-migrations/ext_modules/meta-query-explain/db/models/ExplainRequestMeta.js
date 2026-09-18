const { Model } = require('sequelize');

/**
 * @typedef {import('./types/ExplainRequestMeta').TExplainRequestMetaAttributes} TExplainRequestMetaAttributes
 * @typedef {import('./types/ExplainRequestMeta').TExplainRequestMetaCreationAttributes} TExplainRequestMetaCreationAttributes
 */

/**
 * @extends {Model<TExplainRequestMetaAttributes, TExplainRequestMetaCreationAttributes>}
 */
class ExplainRequestMetaModel extends Model { }

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    ExplainRequestMetaModel.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        meta: DataTypes.TEXT,
    }, {
        sequelize,
        modelName: 'ExplainRequestMeta',
        schema: process.env.DB_SCHEMA,
        freezeTableName: true,
        timestamps: false
    });
    return ExplainRequestMetaModel;
};
