const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class FamilyMetadata extends Model {
        static associate(arg) {
            // define association here
        }
    }

    FamilyMetadata.init(
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

            ancestors: DataTypes.JSON,
            descendants: DataTypes.JSON,
        },
        {
            sequelize,
            modelName: 'FamilyMetadata',
            schema: process.env.DB_SCHEMA,
            tableName: 'FamilyMetadata',
        },
    );

    return FamilyMetadata;
};
