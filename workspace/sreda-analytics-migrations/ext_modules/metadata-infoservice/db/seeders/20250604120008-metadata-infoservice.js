module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Инфосервисы
        await queryInterface.bulkInsert(
            {
                tableName: 'Metadata',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: 'b44b4843-f919-4362-b95c-4c354b2505bd',
                    markdel: 0,
                    parent: '00000000-0000-0000-0000-000000000000',
                    class_id: 'b44b4843-f919-4362-b95c-4c354b2505bd',
                    class: 'Infoservice',
                    name: 'Инфосервисы',
                    description: 'Инфосервисы',
                    manifest: '{}',
                    rank: 8,
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
                    id: 'b44b4843-f919-4362-b95c-4c354b2505bd',
                },
            },
        );
    },
};