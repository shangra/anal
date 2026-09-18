const Sequelize = require('sequelize');
const { DataTypes } = Sequelize;
const connection = require('../connection');

/**
 * @import { TRlsAttributes, TRlsCreationAttributes } from './types/rls'
 */

/**
 * @class Rls
 * @extends {Sequelize.Model<TRlsAttributes, TRlsCreationAttributes>}
 */
class Rls extends Sequelize.Model {
    static associate() {
        // define association here
    }
}

Rls.init(
    {
        table_name: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        table_id: {
            type: DataTypes.UUID,
            primaryKey: true,
        },
        owner_id: DataTypes.UUID,
        type: DataTypes.STRING,
        owner: DataTypes.STRING,
        updatedAt: DataTypes.DATE,
        createdAt: DataTypes.DATE,
    },
    {
        sequelize: connection,
        modelName: 'Rls',
        schema: process.env.DB_SCHEMA,
    }
);

module.exports = { Rls };
