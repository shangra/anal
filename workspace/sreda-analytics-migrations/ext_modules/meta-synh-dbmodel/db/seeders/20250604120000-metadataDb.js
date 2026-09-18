module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Метаданные
        await queryInterface.bulkInsert(
            {
                tableName: 'MetadataDB',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: '00000000-0000-0000-0000-000000000000',
                    markdel: 0,
                    parent: '00000000-0000-0000-0000-000000000000',
                    class_id: '00000000-0000-0000-0000-000000000000',
                    class: 'Metadata',
                    name: 'Метаданные',
                    description: 'Метаданные',
                    manifest: '{}',
                    rank: 0,
                },
            ],
            {},
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete(
            {
                tableName: 'MetadataDB',
                schema: process.env.DB_SCHEMA,
            },
            null,
            {
                where: {
                    id: '00000000-0000-0000-0000-000000000000',
                },
            },
        );
    },
};