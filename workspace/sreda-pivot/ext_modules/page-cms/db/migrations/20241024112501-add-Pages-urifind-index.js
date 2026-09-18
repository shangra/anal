module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addIndex(
            {
                tableName: 'Pages',
                schema: process.env.DB_SCHEMA,
            },
            ['urifind']
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex(
            {
                tableName: 'Pages',
                schema: process.env.DB_SCHEMA,
            },
            ['urifind']
        );
    },
};
