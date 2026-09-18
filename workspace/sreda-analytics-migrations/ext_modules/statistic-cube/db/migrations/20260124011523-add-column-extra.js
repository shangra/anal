module.exports = {
    up: async (queryInterface, Sequelize) => {
        return queryInterface.addColumn(
            {
                tableName: 'CubesRequests',
                schema: process.env.DB_SCHEMA,
            },
            'extra',
            {
                type: Sequelize.JSONB,
                allowNull: true
            },
        );
    },
    down: async (queryInterface) => {
        return queryInterface.removeColumn(
            {
                tableName: 'CubesRequests',
                schema: process.env.DB_SCHEMA,
            },
            'extra',
        );
    },
};
