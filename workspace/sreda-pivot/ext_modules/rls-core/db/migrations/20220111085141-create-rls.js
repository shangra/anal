module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'Rls',
            {
                table_name: {
                    type: Sequelize.STRING,
                    primaryKey: true,
                    allowNull: false,
                },
                table_id: {
                    type: Sequelize.UUID,
                    primaryKey: true,
                    allowNull: false,
                },
                owner: {
                    type: Sequelize.STRING,
                    primaryKey: true,
                },
                type: {
                    type: Sequelize.STRING,
                    primaryKey: true,
                    allowNull: false,
                    defaultValue: 'read',
                },
                owner_id: {
                    type: Sequelize.UUID,
                    primaryKey: true,
                    allowNull: 0,
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
            },
            {
                schema: process.env.DB_SCHEMA,
            }
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable({
            tableName: 'Rls',
            schema: process.env.DB_SCHEMA,
        });
    },
};
