const DB = require('../../../../core/db/rls/DB');

/**
 * @typedef {object} IMetadata
 * @property {string} [id]
 * @property {any} [manifest]
 * @property {string} [class]
 * @property {string} [class_id]
 * @property {string} [name]
 * @property {string} [description]
 * @property {string} [owner_id]
 */

module.exports = (sequelize, DataTypes) => {
    /**
     * @class
     * @implements {IMetadata}
     */
    // @ts-ignore
    class Metadata extends DB {
    }

    // @ts-ignore
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
