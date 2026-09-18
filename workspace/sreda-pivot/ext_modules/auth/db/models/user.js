const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/User').TUserAttributes} TUserAttributes
 * @typedef {import('./types/User').TUserCreationAttributes} TUserCreationAttributes
 */

/**
 * @class User
 * @extends {DB<TUserAttributes, TUserCreationAttributes>}
 */
class User extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ URule, URole, Group, UserInfo, UserData }) {
        // define association here
        this.hasMany(UserData, { foreignKey: 'user_id' });
        this.belongsToMany(URule, {
            through: 'UserRule',
            foreignKey: 'user_id',
        });
        this.belongsToMany(URole, {
            through: 'UserRole',
            foreignKey: 'user_id',
        });
        this.belongsToMany(Group, {
            through: 'GroupUser',
            foreignKey: 'user_id',
        });
        this.hasOne(UserInfo, { foreignKey: 'id' });
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
                        table: 'UserRule',
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
 * @returns {typeof User}
 */
module.exports = (sequelize, DataTypes) => {
    User.init(
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
            modelName: 'User',
            schema: process.env.DB_SCHEMA,
        }
    );

    return User;
};
