const DB = require('../../../../core/db/rls/DB');

module.exports = (sequelize, DataTypes) => {
    class PageParam extends DB {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate({ TemplateParam, Page }) {
            // define association here
            this.hasOne(TemplateParam, {
                foreignKey: 'id',
                sourceKey: 'template_param_id',
            });
            this.belongsTo(Page, { foreignKey: 'page_id' });
        }
    }

    PageParam.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            markdel: DataTypes.INTEGER,
            page_id: {
                type: DataTypes.UUID,
            },
            template_param_id: {
                type: DataTypes.UUID,
            },
            value: DataTypes.TEXT,
            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'PageParam',
            schema: process.env.DB_SCHEMA,
        }
    );
    return PageParam;
};
