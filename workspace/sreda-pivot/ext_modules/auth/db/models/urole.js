const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/URole').TURoleAttributes} TURoleAttributes
 * @typedef {import('./types/URole').TURoleCreationAttributes} TURoleCreationAttributes
 */

/**
 * @class URole
 * @extends {DB<TURoleAttributes, TURoleCreationAttributes>}
 */
class URole extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User, URule }) {
        // define association here
        this.belongsToMany(User, {
            through: 'UserRole',
            foreignKey: 'role_id',
        });
        this.belongsToMany(URule, {
            through: 'RoleRule',
            foreignKey: 'role_id',
        });
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof URole}
 */
module.exports = (sequelize, DataTypes) => {
    URole.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,

            name: DataTypes.STRING,
            color: {
                type: DataTypes.STRING,
                defaultValue: '',
            },
            details: {
                type: DataTypes.STRING,
                defaultValue: '',
            },

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'URole',
            schema: process.env.DB_SCHEMA,
        }
    );

    return URole;
};
