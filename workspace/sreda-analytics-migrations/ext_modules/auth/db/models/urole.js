const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/URoles').TURolesAttributes} TURolesAttributes
 * @typedef {import('./types/URoles').TURolesCreationAttributes} TURolesCreationAttributes
 */

/**
 * @class URoles
 * @extends {DB<TURolesAttributes, TURolesCreationAttributes>}
 */
class URoles extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User, URules }) {
        // define association here
        this.belongsToMany(User, {
            through: 'UserRole',
            foreignKey: 'role_id',
        });
        this.belongsToMany(URules, {
            through: 'RoleRules',
            foreignKey: 'role_id',
        });
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof URoles}
 */
module.exports = (sequelize, DataTypes) => {
    URoles.init(
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
            modelName: 'URoles',
            schema: process.env.DB_SCHEMA,
        }
    );

    return URoles;
};
