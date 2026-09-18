const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/UserData').TUserDataAttributes} TUserDataAttributes
 * @typedef {import('./types/UserData').TUserDataCreationAttributes} TUserDataCreationAttributes
 */

/**
 * @class UserData
 * @extends {DB<TUserDataAttributes, TUserDataCreationAttributes>}
 */
class UserData extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ UAttributes }) {
        // define association here
        this.hasOne(UAttributes, {
            sourceKey: 'attribute_id',
            foreignKey: 'id',
        });
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof UserData}
 */
module.exports = (sequelize, DataTypes) => {
    UserData.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,

            user_id: {
                type: DataTypes.UUID,
            },
            attribute_id: {
                type: DataTypes.UUID,
            },
            value: DataTypes.TEXT,

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'UserData',
            schema: process.env.DB_SCHEMA,
        }
    );

    return UserData;
};
