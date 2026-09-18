const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/GroupUser').TGroupUserAttributes} TGroupUserAttributes
 * @typedef {import('./types/GroupUser').TGroupUserCreationAttributes} TGroupUserCreationAttributes
 */

/**
 * @class GroupUser
 * @extends {DB<TGroupUserAttributes, TGroupUserCreationAttributes>}
 */
class GroupUser extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Group }) {
        // define association here
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof GroupUser}
 */
module.exports = (sequelize, DataTypes) => {
    GroupUser.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            // markdel: DataTypes.INTEGER,// баг с удалением сущностей и остаточными связями

            group_id: {
                type: DataTypes.UUID,
            },
            user_id: {
                type: DataTypes.UUID,
            },

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'GroupUser',
            schema: process.env.DB_SCHEMA,
        }
    );

    return GroupUser;
};
