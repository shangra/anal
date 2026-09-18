const columnName = 'errorMessage';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        return queryInterface.addColumn(
            {
                tableName: 'CubesRequests',
                schema: process.env.DB_SCHEMA,
            },
            columnName,
            {
                type: Sequelize.TEXT,
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
            columnName,
        );
    },
};
