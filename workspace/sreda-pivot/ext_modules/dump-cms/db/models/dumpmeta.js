const { Sequelize, DataTypes } = require('sequelize');
const { Model } = require('sequelize');

/**
 * @typedef {import('./types/DumpMeta').TDumpMetaAttributes} TDumpMetaAttributes
 * @typedef {import('./types/DumpMeta').TDumpMetaCreationAttributes} TDumpMetaCreationAttributes
 */

/**
 * @class DumpMeta
 * @extends {Model<TDumpMetaAttributes, TDumpMetaCreationAttributes>}
 */
class DumpMeta extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate() {
        // define association here
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof DumpMeta}
 */
module.exports = (sequelize, DataTypes) => {
    DumpMeta.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            hash: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING,
            },
            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
        },
        {
            sequelize,
            modelName: 'DumpMeta',
            schema: process.env.DB_SCHEMA,
        }
    );
    return DumpMeta;
};
