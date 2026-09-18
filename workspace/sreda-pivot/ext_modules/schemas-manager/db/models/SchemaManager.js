const DB = require('../../../../core/db/rls/DB');
const METADATA_WRITE_RULE = '232a43fb-ed52-414e-8562-75a814a1e8d1';
const ALL_READ_RULE = '90499885-ae60-440b-a59f-cfd3958110cd';
/**
 * @typedef {import('./types/schemaManager').TSchemaManagerAttributes} TSchemaManagerAttributes
 * @typedef {import('./types/schemaManager').TSchemaManagerCreationAttributes} TSchemaManagerCreationAttributes
 */

/**
 * @extends {DB<TSchemaManagerAttributes, TSchemaManagerCreationAttributes>}
 */
class SchemaManager extends DB {
    static associate(models) {
    }

    static RLSRule() {
        return {
            CreateRules: [METADATA_WRITE_RULE],
            UpdateRules: [METADATA_WRITE_RULE],
            DeleteRules: [METADATA_WRITE_RULE],
            defaultReadRules: [ALL_READ_RULE],
        };
    }
}

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    SchemaManager.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            code: {
                type: DataTypes.INTEGER,
                allowNull: false,
                unique: true,
                autoIncrement: true,
            },
            markdel: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            createdUser: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            updatedUser: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            owner: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            schema_owner: {
                type: DataTypes.UUID,
                allowNull: false,
                field: 'schema_owner',
            },
            standart_schema: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
                field: 'standart_schema',
            },
            schema: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            snapshot: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: 'SchemaManager',
            tableName: 'PivotSchemas',
            schema: process.env.DB_SCHEMA,
        },
    );

    return SchemaManager;
};