const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {import('./types/metadata').TMetadataAttributes} TMetadataAttributes
 * @typedef {import('./types/metadata').TMetadataCreationAttributes} TMetadataCreationAttributes
 */

/**
 * @extends {DB<TMetadataAttributes, TMetadataCreationAttributes>}
 */
class Metadata extends DB {
    static associate() { };
}

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
    Metadata.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,

            parent: DataTypes.UUID,
            class_id: DataTypes.UUID,
            class: DataTypes.STRING,
            name: DataTypes.STRING,
            description: DataTypes.STRING,
            manifest: DataTypes.TEXT,
            rank: DataTypes.INTEGER,

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'Metadata',
            schema: process.env.DB_SCHEMA,
            tableName: 'Metadata',
        },
    );

    return Metadata;
};
