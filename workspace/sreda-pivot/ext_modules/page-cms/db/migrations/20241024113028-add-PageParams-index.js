module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addIndex(
            {
                tableName: 'PageParams',
                schema: process.env.DB_SCHEMA,
            },
            ['page_id', 'template_param_id', 'markdel']
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex(
            {
                tableName: 'PageParams',
                schema: process.env.DB_SCHEMA,
            },
            ['page_id', 'template_param_id', 'markdel']
        );
    },
};
