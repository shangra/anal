const { Sequelize, DataTypes } = require('sequelize');
const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/RoleRule').TRoleRuleAttributes} TRoleRuleAttributes
 * @typedef {import('./types/RoleRule').TRoleRuleCreationAttributes} TRoleRuleCreationAttributes
 */

/**
 * @class RoleRule
 * @extends {DB<TRoleRuleAttributes, TRoleRuleCreationAttributes>}
 */
class RoleRule extends DB {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     * @param {any} models
     */
    static associate(models) {
        // define association here
    }

    /**
     * @param {{ rule_id: any; }} data
     */
    static DumpInstruction(data) {
        let result = {};
        if (data) {
            result = {
                before: [
                    {
                        table: 'URule',
                        where: { id: data.rule_id },
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
 * @returns {typeof RoleRule}
 */
module.exports = (sequelize, DataTypes) => {
    RoleRule.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            // markdel: DataTypes.INTEGER,// баг с удалением сущностей и остаточными связями

            role_id: {
                type: DataTypes.UUID,
            },
            rule_id: {
                type: DataTypes.UUID,
            },

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'RoleRule',
            schema: process.env.DB_SCHEMA,
        }
    );

    return RoleRule;
};
