module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'SystemSettings',
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

                parent: {
                    allowNull: false,
                    type: Sequelize.UUID,
                },

                name: {
                    allowNull: false,
                    type: Sequelize.STRING,
                },
                description: {
                    allowNull: false,
                    type: Sequelize.STRING,
                    defaultValue: '',
                },
                type: {
                    allowNull: false,
                    type: Sequelize.UUID,
                },
                value: {
                    allowNull: false,
                    type: Sequelize.TEXT,
                    defaultValue: '',
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
            },
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable({
            tableName: 'SystemSettings',
            schema: process.env.DB_SCHEMA,
        });
    },
};
