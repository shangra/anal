const { Model } = require('sequelize');

/**
 * @typedef {import('./types/ExplainRequest').TExplainRequestAttributes} TExplainRequestAttributes
 * @typedef {import('./types/ExplainRequest').TExplainRequestCreationAttributes} TExplainRequestCreationAttributes
 */

/**
 * @extends {Model<TExplainRequestAttributes, TExplainRequestCreationAttributes>}
 */
class ExplainRequestModel extends Model { }

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    ExplainRequestModel.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        answerId: DataTypes.UUID,
        plan: DataTypes.TEXT,
    }, {
        sequelize,
        modelName: 'ExplainRequest',
        schema: process.env.DB_SCHEMA,
        freezeTableName: true,
        timestamps: false
    });
    return ExplainRequestModel;
};
