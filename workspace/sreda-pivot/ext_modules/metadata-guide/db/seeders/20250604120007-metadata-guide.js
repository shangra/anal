module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Справочники
        await queryInterface.bulkInsert(
            {
                tableName: 'Metadata',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: '0ce71d7a-a5f1-4f02-9391-1677f6aff7c6',
                    markdel: 0,
                    parent: '00000000-0000-0000-0000-000000000000',
                    class_id: '0ce71d7a-a5f1-4f02-9391-1677f6aff7c6',
                    class: 'Guide',
                    name: 'Справочники',
                    description: 'Справочники',
                    manifest: '{}',
                    rank: 7,
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
                    id: '0ce71d7a-a5f1-4f02-9391-1677f6aff7c6',
                },
            },
        );
    },
};