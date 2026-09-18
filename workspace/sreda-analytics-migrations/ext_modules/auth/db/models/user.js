const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/User').TUserAttributes} TUserAttributes
 * @typedef {import('./types/User').TUserCreationAttributes} TUserCreationAttributes
 */

/**
 * @class Users
 * @extends {DB<TUserAttributes, TUserCreationAttributes>}
 */
class Users extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ URules, URoles, Group, UserInfos, UserData }) {
        // define association here
        this.hasMany(UserData, { foreignKey: 'user_id' });
        this.belongsToMany(URules, {
            through: 'UserRules',
            foreignKey: 'user_id',
        });
        this.belongsToMany(URoles, {
            through: 'UserRole',
            foreignKey: 'user_id',
        });
        this.belongsToMany(Group, {
            through: 'GroupUser',
            foreignKey: 'user_id',
        });
        this.hasOne(UserInfos, { foreignKey: 'id' });
    }

    /**
     * @param {{ id: any; }} data
     */
    static DumpInstruction(data) {
        let result = {};
        if (data) {
            result = {
                before: [],
                after: [
                    {
                        table: 'UserRules',
                        where: { user_id: data.id },
                    },
                    {
                        table: 'UserRole',
                        where: { user_id: data.id },
                    },
                    {
                        table: 'GroupUser',
                        where: { user_id: data.id },
                    },
                ],
            };
        }
        return result;
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof Users}
 */
module.exports = (sequelize, DataTypes) => {
    Users.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,

            login: DataTypes.STRING,
            password: DataTypes.STRING,
            status: DataTypes.INTEGER,

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
            lastAccessDate: DataTypes.DATE,
        },
        {
            sequelize,
            modelName: 'Users',
            schema: process.env.DB_SCHEMA,
        }
    );

    return Users;
};
