const DB = require('../../../../core/db/rls/DB');

module.exports = (sequelize, DataTypes) => {
    class Template extends DB {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        // eslint-disable-next-line no-shadow
        static associate({ Template, TemplateParam }) {
            this.hasMany(Template, { foreignKey: 'parent' });
            this.belongsTo(Template, { foreignKey: 'id' });
            this.hasMany(TemplateParam, { foreignKey: 'template_id' });
            this.hasOne(Template, { sourceKey: 'parent', foreignKey: 'id', as: 'ParentInfo' });
        }

        static DumpInstruction(data) {
            let result = {};
            if (data) {
                result = {
                    before: [],
                    after: [
                        {
                            table: 'TemplateParam',
                            where: { template_id: data.id },
                        },
                    ],
                };
            }
            return result;
        }
    }

    Template.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: DataTypes.INTEGER,
            parent: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
            },
            markdel: DataTypes.INTEGER,
            name: DataTypes.STRING,
            description: {
                defaultValue: '',
                type: DataTypes.STRING,
            },
            type: DataTypes.STRING,
            data: DataTypes.TEXT,
            script: DataTypes.TEXT,
            updatedAt: DataTypes.DATE,
            createdAt: DataTypes.DATE,
            createdUser: DataTypes.UUID,
            updatedUser: DataTypes.UUID,
        },
        {
            sequelize,
            modelName: 'Template',
            schema: process.env.DB_SCHEMA,
        }
    );
    return Template;
};
