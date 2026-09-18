module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'TemplateParams',
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
                name: {
                    allowNull: false,
                    type: Sequelize.STRING,
                },
                description: {
                    type: Sequelize.STRING,
                    defaultValue: '',
                },

                template_id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                    references: {
                        key: 'id',
                        model: 'Templates',
                    },
                    onDelete: 'CASCADE',
                },
                params_type_id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                    references: {
                        key: 'id',
                        model: 'ParamsTypes',
                    },
                    onDelete: 'CASCADE',
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
    down: async (queryInterface) => {
        await queryInterface.dropTable({
            tableName: 'TemplateParams',
            schema: process.env.DB_SCHEMA,
        });
    },
};
