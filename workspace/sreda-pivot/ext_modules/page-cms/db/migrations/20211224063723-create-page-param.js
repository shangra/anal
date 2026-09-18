module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'PageParams',
            {
                id: {
                    allowNull: false,
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                },
                code: {
                    allowNull: false,
                    autoIncrement: true,
                    unique: true,
                    type: Sequelize.INTEGER,
                },
                markdel: {
                    allowNull: false,
                    type: Sequelize.INTEGER,
                    defaultValue: 0,
                },
                page_id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                    references: {
                        key: 'id',
                        model: 'Pages',
                    },
                    onDelete: 'CASCADE',
                },
                template_param_id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                    references: {
                        key: 'id',
                        model: 'TemplateParams',
                    },
                    onDelete: 'CASCADE',
                },
                value: {
                    allowNull: false,
                    type: Sequelize.TEXT,
                },
                createdAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                },
                updatedAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                },
                createdUser: {
                    type: Sequelize.UUID,
                },
                updatedUser: {
                    type: Sequelize.UUID,
                },
            },
            {
                schema: process.env.DB_SCHEMA, // default: public, PostgreSQL only.
            }
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable({
            tableName: 'PageParams',
            schema: process.env.DB_SCHEMA,
        });
    },
};
