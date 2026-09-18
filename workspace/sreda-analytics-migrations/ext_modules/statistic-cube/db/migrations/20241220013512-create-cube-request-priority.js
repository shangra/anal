module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'CubesRequestPriorities',
            {
                id: {
                    allowNull: false,
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                // Параметры запроса (фильтры, сортировки и т.д)
                parameters: {
                    type: Sequelize.JSONB,
                    allowNull: false,
                    unique: true
                },
                // ID куба
                cube_id: {
                    allowNull: false,
                    type: Sequelize.UUID
                },
                // Приоритеты срезов для каждого куба
                priority: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
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
                }
            },
            {
                schema: process.env.DB_SCHEMA, // default: public, PostgreSQL only.
            });

            await queryInterface.addConstraint({
                tableName: 'CubesRequestPriorities',
                schema: process.env.DB_SCHEMA
            },
            {
                fields: ['cube_id', 'parameters'],
                type: 'unique',
                name: 'unique_cube_request'
            });
    },

    down: async (queryInterface) => {
        await queryInterface.removeConstraint({
            tableName: 'CubesRequestPriorities',
            schema: process.env.DB_SCHEMA
        },
        {
            name: 'unique_cube_request'
        });

        await queryInterface.dropTable({
            tableName: 'CubesRequestPriorities',
            schema: process.env.DB_SCHEMA,
        });
    },
};
