module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Доступы
        await queryInterface.bulkInsert(
            {
                tableName: 'Metadata',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: '530cf1cf-1aa4-442b-b0f4-ba801f5c9599',
                    markdel: 0,
                    parent: '00000000-0000-0000-0000-000000000000',
                    class_id: '530cf1cf-1aa4-442b-b0f4-ba801f5c9599',
                    class: 'Rls',
                    name: 'Доступы',
                    description: 'Доступы',
                    manifest: '{}',
                    rank: 14,
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
                    id: '530cf1cf-1aa4-442b-b0f4-ba801f5c9599',
                },
            },
        );
    },
};