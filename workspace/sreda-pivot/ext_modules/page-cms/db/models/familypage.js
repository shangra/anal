const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class FamilyPage extends Model {
        static associate(arg) {
            // define association here
        }
    }

    FamilyPage.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,
            name: DataTypes.STRING,
            description: DataTypes.STRING,
            rank: DataTypes.INTEGER,
            uri: DataTypes.STRING,
            urifind: DataTypes.STRING,
            parent: DataTypes.UUID,
            active: DataTypes.INTEGER,
            link: DataTypes.UUID,
            content_type: DataTypes.STRING,
            template: DataTypes.UUID,
            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
            ancestors: DataTypes.JSON,
            descendants: DataTypes.JSON,
        },
        {
            sequelize,
            modelName: 'FamilyPage',
            schema: process.env.DB_SCHEMA,
            tableName: 'FamilyPages',
        }
    );

    return FamilyPage;
};
