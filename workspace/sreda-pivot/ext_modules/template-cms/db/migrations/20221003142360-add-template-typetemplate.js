module.exports = {
    up(queryInterface, Sequelize) {
        // logic for transforming into the new state
        return queryInterface.addColumn(
            {
                tableName: 'Templates',
                schema: process.env.DB_SCHEMA,
            },
            'type',
            {
                defaultValue: 'text',
                type: Sequelize.STRING,
            }
        );
    },

    down(queryInterface, Sequelize) {
        // logic for reverting the changes
        return queryInterface.removeColumn(
            {
                tableName: 'Templates',
                schema: process.env.DB_SCHEMA,
            },
            'type',
            {
                schema: process.env.DB_SCHEMA,
            }
        );
    },
};
