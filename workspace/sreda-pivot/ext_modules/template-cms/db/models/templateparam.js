const DB = require('../../../../core/db/rls/DB');

module.exports = (sequelize, DataTypes) => {
    class TemplateParam extends DB {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate({ ParamsType }) {
            // define association here
            this.belongsTo(ParamsType, { foreignKey: 'params_type_id' });
        }

        static DumpInstruction(data) {
            let result = {};
            if (data) {
                result = {
                    before: [
                        {
                            table: 'ParamsType',
                            where: { id: data.params_type_id },
                        },
                    ],
                    after: [],
                };
            }
            return result;
        }
    }

    TemplateParam.init(
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
            template_id: DataTypes.UUID,
            params_type_id: DataTypes.UUID,
            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'TemplateParam',
            schema: process.env.DB_SCHEMA,
        }
    );
    return TemplateParam;
};
