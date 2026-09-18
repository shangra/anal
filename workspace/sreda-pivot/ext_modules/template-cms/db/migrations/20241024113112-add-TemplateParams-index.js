module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addIndex(
            {
                tableName: 'TemplateParams',
                schema: process.env.DB_SCHEMA,
            },
            ['template_id', 'params_type_id', 'markdel']
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex(
            {
                tableName: 'TemplateParams',
                schema: process.env.DB_SCHEMA,
            },
            ['template_id', 'params_type_id', 'markdel']
        );
    },
};
