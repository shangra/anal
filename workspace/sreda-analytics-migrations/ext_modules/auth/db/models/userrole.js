const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/UserRole').TUserRoleAttributes} TUserRoleAttributes
 * @typedef {import('./types/UserRole').TUserRoleCreationAttributes} TUserRoleCreationAttributes
 */

/**
 * @class UserRole
 * @extends {DB<TUserRoleAttributes, TUserRoleCreationAttributes>}
 */
class UserRole extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     * @param {any} models
     */
    static associate(models) {
        // define association here
    }

    static DumpInstruction(data) {
        let result = {};
        if (data) {
            result = {
                before: [
                    {
                        table: 'RoleRules',
                        where: { role_id: data.role_id },
                    },
                ],
                after: [],
            };
        }
        return result;
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof UserRole}
 */
module.exports = (sequelize, DataTypes) => {
    UserRole.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            // markdel: DataTypes.INTEGER,// баг с удалением сущностей и остаточными связями

            user_id: {
                type: DataTypes.UUID,
            },
            role_id: {
                type: DataTypes.UUID,
            },

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'UserRole',
            schema: process.env.DB_SCHEMA,
        }
    );

    return UserRole;
};
