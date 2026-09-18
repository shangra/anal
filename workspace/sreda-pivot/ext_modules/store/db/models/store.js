const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/Store').TStoreAttributes} TStoreAttributes
 * @typedef {import('./types/Store').TStoreCreationAttributes} TStoreCreationAttributes
 */

/**
 * @class Store
 * @extends {DB<TStoreAttributes, TStoreCreationAttributes>}
 */
class Store extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        // define association here
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof Store}
 */
module.exports = (sequelize, DataTypes) => {
    Store.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
            },

            key: {
                type: DataTypes.STRING,
                primaryKey: true,
            },
            value: DataTypes.TEXT,
            typeValue: DataTypes.STRING,

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: {
                type: DataTypes.UUID,
                primaryKey: true,
            },
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'Store',
            schema: process.env.DB_SCHEMA,
            freezeTableName: true,
        }
    );

    return Store;
};
