const { Sequelize, DataTypes, Model } = require('sequelize');

/**
 * @typedef {import('./type/CubesRequestPriority').CubesRequestPriorityAttributes} CubesRequestPriorityAttributes
 * @typedef {import('./type/CubesRequestPriority').CubesRequestPriorityCreationAttributes} CubesRequestPriorityCreationAttributes
 */

/**
 * @class CubesRequestPriority
 * @extends {Model<CubesRequestPriorityAttributes, CubesRequestPriorityCreationAttributes>}
 */
class CubesRequestPriority extends Model {
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
     * @param {{ id: string; }} data
     */
    static DumpInstruction(data) {
        let result = {};
        if (data) {
            result = {
                before: [
                    {
                        table: 'CubesRequestPriorities',
                        where: { id: data.id },
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
 * @returns {typeof CubesRequestPriority}
 */
module.exports = (sequelize, DataTypes) => {
    CubesRequestPriority.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                allowNull: false,
                primaryKey: true,
            },
            parameters: {
                type: DataTypes.JSONB,
                allowNull: true,
                unique: true
            },
            cube_id: {
                type: DataTypes.UUID,
                allowNull: false
            },
            priority: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            }
        },
        {
            sequelize,
            tableName: 'CubesRequestPriorities',
            schema: process.env.DB_SCHEMA
        },
    );

    return CubesRequestPriority;
};
