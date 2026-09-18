module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'CubesRequests',
            {
                id: {
                    allowNull: false,
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                // ID куба
                cube_id: {
                    allowNull: false,
                    type: Sequelize.UUID
                },
                // Время исполнения запроса
                response_time: {
                    allowNull: false,
                    type: Sequelize.FLOAT
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                },
                // Параметры запроса (фильтры, сортировки и т.д)
                parameters: {
                    type: Sequelize.JSONB,
                    allowNull: true,
                },
                // Статус выполнения запроса
                status: {
                    type: Sequelize.STRING(32),
                    allowNull: false,
                }
            },
            {
                schema: process.env.DB_SCHEMA, // default: public, PostgreSQL only.
            },
        );

        // Создание GIN-индекса на поле parameters
        await queryInterface.addIndex({
            tableName: 'CubesRequests',
            schema: process.env.DB_SCHEMA,
        },
            ['parameters'],
            {
                using: 'GIN',
                name: 'idx_requests_parameters'
            });
    },

    down: async (queryInterface) => {
        await queryInterface.removeIndex({
            tableName: 'CubesRequests',
            schema: process.env.DB_SCHEMA
        },
        { 
            name: 'idx_requests_parameters' 
        });
        await queryInterface.dropTable({
            tableName: 'CubesRequests',
            schema: process.env.DB_SCHEMA,
        });
    },
};
