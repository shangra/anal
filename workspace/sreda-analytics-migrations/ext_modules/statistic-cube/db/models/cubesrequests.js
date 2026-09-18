const { Sequelize, DataTypes, Model } = require('sequelize');


/**
 * @typedef {import('./type/CubeRequest').CubeRequestAttributes} CubeRequestAttributes
 * @typedef {import('./type/CubeRequest').CubeRequestCreationAttributes} CubeRequestCreationAttributes
 */

/**
 * @class CubesRequests
 * @extends {Model<CubeRequestAttributes, CubeRequestCreationAttributes>}
 */
class CubesRequests extends Model {
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
                        table: 'CubesRequests',
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
 * @returns {typeof CubesRequests}
 */
module.exports = (sequelize, DataTypes) => {
    CubesRequests.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                allowNull: false,
                primaryKey: true,
            },
            cube_id: {
                type: DataTypes.UUID,
                allowNull: false
            },
            response_time: {
                type: DataTypes.FLOAT,
                allowNull: false
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            createdUser: {
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: '00000000-0000-0000-0000-000000000000'
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            parameters: {
                type: DataTypes.JSONB,
                allowNull: true,
            },
            status: {
                type: DataTypes.STRING(32),
                allowNull: false
            },
            errorMessage: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            extra: {
                type: DataTypes.JSONB,
                allowNull: true
            }
        },
        {
            sequelize,
            modelName: 'CubesRequests',
            schema: process.env.DB_SCHEMA
        },
    );

    return CubesRequests;
};
