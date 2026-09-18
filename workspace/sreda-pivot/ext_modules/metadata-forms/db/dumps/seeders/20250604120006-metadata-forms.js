module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Формы
        await queryInterface.bulkInsert(
            {
                tableName: 'Metadata',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: '20901b97-d1cf-4472-a27b-b0442e436c9a',
                    markdel: 0,
                    parent: '00000000-0000-0000-0000-000000000000',
                    class_id: '20901b97-d1cf-4472-a27b-b0442e436c9a',
                    class: 'Forms',
                    name: 'Формы',
                    description: 'Формы',
                    manifest: '{}',
                    rank: 6,
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
                    id: '20901b97-d1cf-4472-a27b-b0442e436c9a',
                },
            },
        );
    },
};