const DB = require('../../../../core/db/rls/DB');

module.exports = (sequelize, DataTypes) => {
    class MetadataDB extends DB {
        static associate(models) {}
    }

    MetadataDB.init(
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
            modelName: 'MetadataDB',
            schema: process.env.DB_SCHEMA,
            tableName: 'MetadataDB',
        }
    );
    return MetadataDB;
};
