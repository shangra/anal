module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Перечисления
        await queryInterface.bulkInsert(
            {
                tableName: 'Metadata',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: 'f02b93d7-6b6a-46d7-a05b-e87f5bb53019',
                    markdel: 0,
                    parent: '00000000-0000-0000-0000-000000000000',
                    class_id: 'f02b93d7-6b6a-46d7-a05b-e87f5bb53019',
                    class: 'Enums',
                    name: 'Перечисления',
                    description: 'Перечисления',
                    manifest: '{}',
                    rank: 5,
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
                    id: 'f02b93d7-6b6a-46d7-a05b-e87f5bb53019',
                },
            },
        );
    },
};