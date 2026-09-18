module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'Store',
            {
                id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                },
                key: {
                    type: Sequelize.STRING,
                    primaryKey: true,
                    allowNull: false,
                },
                value: {
                    type: Sequelize.TEXT,
                    allowNull: false,
                },
                typeValue: {
                    type: Sequelize.STRING,
                    allowNull: false,
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
                    primaryKey: true,
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
            tableName: 'Store',
            schema: process.env.DB_SCHEMA,
        });
    },
};
