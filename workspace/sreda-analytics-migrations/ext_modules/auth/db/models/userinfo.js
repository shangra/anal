const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/UserInfo').TUserInfoAttributes} TUserInfoAttributes
 * @typedef {import('./types/UserInfo').TUserInfoCreationAttributes} TUserInfoCreationAttributes
 */

/**
 * @class UserInfos
 * @extends {DB<TUserInfoAttributes, TUserInfoCreationAttributes>}
 */
class UserInfos extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Users }) {
        // define association here
        this.belongsTo(Users, { foreignKey: 'id' });
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof UserInfos}
 */
module.exports = (sequelize, DataTypes) => {
    UserInfos.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,

            name: DataTypes.STRING,
            email: DataTypes.STRING,
            details: DataTypes.STRING,
            avatar: DataTypes.STRING,
            session: DataTypes.STRING,

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'UserInfos',
            schema: process.env.DB_SCHEMA,
        }
    );

    return UserInfos;
};
