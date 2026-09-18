module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Коннекторы
        await queryInterface.bulkInsert(
            {
                tableName: 'Metadata',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970',
                    markdel: 0,
                    parent: '00000000-0000-0000-0000-000000000000',
                    class_id: 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970',
                    class: 'Connector',
                    name: 'Коннекторы',
                    description: 'Коннекторы',
                    manifest: '{}',
                    rank: 2,
                },
            ],
            {},
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete(
            {
                tableName: 'Metadata',
                schema: process.env.DB_SCHEMA,
            },
            null,
            {
                where: {
                    id: 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970',
                },
            },
        );
    },
};