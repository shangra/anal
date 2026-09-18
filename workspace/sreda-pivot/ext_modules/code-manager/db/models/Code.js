const DB = require('../../../../core/db/rls/DB');

module.exports = (sequelize, DataTypes) => {
    class Code extends DB {
        static associate(models) {
            //
        }
    }

    Code.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,
            parent: {
                defaultValue: '00000000-0000-0000-0000-000000000000',
                type: DataTypes.UUID,
            },
            name: {
                allowNull: false,
                type: DataTypes.STRING,
            },
            description: {
                allowNull: false,
                type: DataTypes.STRING,
                defaultValue: '',
            },

            codeSource: {
                allowNull: false,
                type: DataTypes.TEXT,
                defaultValue: '',
            },
            codeInterpreter: {
                allowNull: false,
                type: DataTypes.TEXT,
                defaultValue: '',
            },

            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'Code',
            schema: process.env.DB_SCHEMA,
            freezeTableName: true,
        }
    );
    return Code;
};
