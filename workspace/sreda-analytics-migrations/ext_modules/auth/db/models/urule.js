const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/URule').TURulesAttributes} TURulesAttributes
 * @typedef {import('./types/URule').TURulesCreationAttributes} TURulesCreationAttributes
 */

/**
 * @class URules
 * @extends {DB<TURulesAttributes, TURulesCreationAttributes>}
 */
class URules extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Users, URoles }) {
        // define association here
        this.belongsToMany(Users, {
            through: 'UserRules',
            foreignKey: 'rule_id',
        });
        this.belongsToMany(URoles, {
            through: 'RoleRules',
            foreignKey: 'rule_id',
        });
    }
}

/**
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns {typeof URules}
 */
module.exports = (sequelize, DataTypes) => {
    URules.init(
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
            modelName: 'URules',
            schema: process.env.DB_SCHEMA,
        }
    );

    return URules;
};
