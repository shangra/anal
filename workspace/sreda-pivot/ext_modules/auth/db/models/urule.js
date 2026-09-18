const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/URule').TURuleAttributes} TURuleAttributes
 * @typedef {import('./types/URule').TURuleCreationAttributes} TURuleCreationAttributes
 */

/**
 * @class URule
 * @extends {DB<TURuleAttributes, TURuleCreationAttributes>}
 */
class URule extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User, URole }) {
        // define association here
        this.belongsToMany(User, {
            through: 'UserRule',
            foreignKey: 'rule_id',
        });
        this.belongsToMany(URole, {
            through: 'RoleRule',
            foreignKey: 'rule_id',
        });
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof URule}
 */
module.exports = (sequelize, DataTypes) => {
    URule.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,

            name: DataTypes.STRING,
            details: DataTypes.STRING,

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'URule',
            schema: process.env.DB_SCHEMA,
        }
    );

    return URule;
};
