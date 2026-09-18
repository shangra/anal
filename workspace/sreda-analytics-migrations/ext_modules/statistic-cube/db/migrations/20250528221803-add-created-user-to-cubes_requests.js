module.exports = {
    up: async (queryInterface, Sequelize) => {
        return queryInterface.addColumn(
            {
                tableName: 'CubesRequests',
                schema: process.env.DB_SCHEMA,
            },
            'createdUser',
            {
                type: Sequelize.UUID,
                allowNull: false,
                defaultValue: '00000000-0000-0000-0000-000000000000'
            },
        );
    },
    down: async (queryInterface) => {
        return queryInterface.removeColumn(
            {
                tableName: 'CubesRequests',
                schema: process.env.DB_SCHEMA,
            },
            'createdUser',
        );
    },
};
