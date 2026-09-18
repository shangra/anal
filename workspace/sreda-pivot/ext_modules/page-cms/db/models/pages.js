const GlobalService = require('../../../../core/services/Global.service');

const DB = require('../../../../core/db/rls/DB');

module.exports = (sequelize, DataTypes) => {
    class Page extends DB {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate({
            Page,
            PageParam,
            Template,
            User,
            UserInfo,
            UserData,
        }) {
            this.hasMany(Page, { foreignKey: 'parent' });
            this.belongsTo(Page, { foreignKey: 'id' });
            this.hasMany(PageParam, { foreignKey: 'page_id' });
            this.hasOne(Template, { sourceKey: 'template', foreignKey: 'id' });
            this.hasOne(Page, {
                sourceKey: 'parent',
                foreignKey: 'id',
                as: 'ParentInfo',
            });
            this.hasOne(Page, {
                sourceKey: 'id',
                foreignKey: 'parent',
                as: 'children',
            });
            this.hasOne(Page, {
                sourceKey: 'link',
                foreignKey: 'id',
                as: 'PageLink',
            });
            this.hasOne(User, { sourceKey: 'createdUser', foreignKey: 'id' });
            this.hasOne(UserInfo, {
                sourceKey: 'createdUser',
                foreignKey: 'id',
            });
            this.hasMany(UserData, {
                sourceKey: 'createdUser',
                foreignKey: 'user_id',
            });
        }

        static forDump(data) {
            if (data.urifind === '' && data.uri !== '') {
                data.urifind = data.uri;
            }
            return data;
        }

        static DumpInstruction(data = undefined) {
            let result = {};
            if (data) {
                result = {
                    before: [
                        {
                            table: 'Template',
                            where: { id: data.template },
                        },
                    ],
                    current: {
                        forDump: Page.forDump,
                    },
                    after: [
                        {
                            table: 'PageParam',
                            where: { page_id: data.id },
                        },
                    ],
                };
            } else {
                result = {
                    preDump: GlobalService.SortTree,
                };
            }
            return result;
        }
    }

    Page.init(
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
        },
        {
            sequelize,
            modelName: 'Page',
            schema: process.env.DB_SCHEMA,
            tableName: 'Pages',
        }
    );
    return Page;
};
