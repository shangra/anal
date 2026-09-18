module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'Pages',
            {
                id: {
                    allowNull: false,
                    primaryKey: true,
                    defaultValue: Sequelize.UUIDV4,
                    type: Sequelize.UUID,
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
                rank: {
                    type: Sequelize.INTEGER,
                    defaultValue: 0,
                },
                name: {
                    allowNull: false,
                    type: Sequelize.STRING,
                },
                description: {
                    defaultValue: '',
                    type: Sequelize.STRING,
                },
                uri: {
                    allowNull: false,
                    type: Sequelize.STRING,
                    defaultValue: '',
                    unique: true,
                },
                urifind: {
                    allowNull: false,
                    type: Sequelize.STRING,
                    defaultValue: '',
                },
                parent: {
                    allowNull: false,
                    type: Sequelize.UUID,
                    defaultValue: '00000000-0000-0000-0000-000000000000',
                    references: {
                        key: 'id',
                        model: 'Pages',
                    },
                    onDelete: 'CASCADE',
                },
                active: {
                    allowNull: false,
                    type: Sequelize.INTEGER,
                    defaultValue: 0,
                },
                link: {
                    allowNull: false,
                    type: Sequelize.UUID,
                    defaultValue: '00000000-0000-0000-0000-000000000000',
                    references: {
                        key: 'id',
                        model: 'Pages',
                    },
                    onDelete: 'CASCADE',
                },
                content_type: {
                    allowNull: false,
                    type: Sequelize.STRING,
                    defaultValue: 'text/html',
                },
                template: {
                    allowNull: false,
                    type: Sequelize.UUID,
                    defaultValue: '00000000-0000-0000-0000-000000000000',
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
            tableName: 'Pages',
            schema: process.env.DB_SCHEMA,
        });
    },
};
