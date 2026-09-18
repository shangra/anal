const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class FamilyTemplate extends Model {
        // eslint-disable-next-line no-unused-vars
        static associate(arg) {
            // define association here
        }
    }

    FamilyTemplate.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,
            parent: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
            },
            name: DataTypes.STRING,
            description: DataTypes.STRING,
            type: DataTypes.STRING,
            data: DataTypes.TEXT,
            script: DataTypes.TEXT,
            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
            ancestors: DataTypes.JSON,
            descendants: DataTypes.JSON,
        },
        {
            sequelize,
            modelName: 'FamilyTemplate',
            schema: process.env.DB_SCHEMA,
            tableName: 'FamilyTemplates',
        }
    );

    return FamilyTemplate;
};
