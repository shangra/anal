module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Справочники инфосервисов (матричные)
        await queryInterface.bulkInsert(
            {
                tableName: 'Metadata',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: 'b4478dcf-b7e6-436c-b356-1a9e3a6342e0',
                    markdel: 0,
                    parent: '00000000-0000-0000-0000-000000000000',
                    class_id: 'b4478dcf-b7e6-436c-b356-1a9e3a6342e0',
                    class: 'InfoserviceMatrixGuide',
                    name: 'Справочники инфосервисов (матричные)',
                    description: 'Справочники инфосервисов (матричные)',
                    manifest: '{}',
                    rank: 10,
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
                    id: 'b4478dcf-b7e6-436c-b356-1a9e3a6342e0',
                },
            },
        );
    },
};