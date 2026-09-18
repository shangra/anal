module.exports = {
    up(queryInterface, Sequelize) {
        // logic for transforming into the new state
        return queryInterface.addColumn(
            {
                tableName: 'Templates',
                schema: process.env.DB_SCHEMA,
            },
            'script',
            {
                defaultValue: '',
                type: Sequelize.TEXT,
            }
        );
    },

    down(queryInterface) {
        // logic for reverting the changes
        return queryInterface.removeColumn(
            {
                tableName: 'Templates',
                schema: process.env.DB_SCHEMA,
            },
            'script',
            {
                schema: process.env.DB_SCHEMA, // default: public, PostgreSQL only.
            }
        );
    },
};
