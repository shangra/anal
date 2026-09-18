const DB = require('../../../../core/db/rls/DB');

module.exports = (sequelize, DataTypes) => {
    class ParamsType extends DB {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate({ TemplateParam }) {
            // define association here
            this.hasMany(TemplateParam, { foreignKey: 'id' });
        }
    }

    ParamsType.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,
            name: DataTypes.STRING,
            type: DataTypes.STRING,
            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'ParamsType',
            schema: process.env.DB_SCHEMA,
        }
    );
    return ParamsType;
};
