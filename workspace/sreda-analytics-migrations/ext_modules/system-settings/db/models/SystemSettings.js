const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./type/SystemSettings').TSystemSettingsAttributes} TSystemSettingsAttributes
 * @typedef {import('./type/SystemSettings').TSystemSettingsCreationAttributes} TSystemSettingsCreationAttributes
 */

/**
 * @class SystemSettings
 * @extends {DB<TSystemSettingsAttributes, TSystemSettingsCreationAttributes>}
 */
class SystemSettings extends DB {
    // eslint-disable-next-line no-unused-vars
    static associate(models) {
        //
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof SystemSettings}
 */
module.exports = (sequelize, DataTypes) => {
    SystemSettings.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,

            parent: DataTypes.UUID,
            name: DataTypes.STRING,
            description: DataTypes.STRING,
            type: DataTypes.UUID,
            value: DataTypes.TEXT,

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'SystemSettings',
            schema: process.env.DB_SCHEMA,
            freezeTableName: true,
        },
    );

    return SystemSettings;
};
