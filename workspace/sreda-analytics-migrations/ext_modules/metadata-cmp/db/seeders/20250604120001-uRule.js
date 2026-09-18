module.exports = {
    up: async (queryInterface, Sequelize) => {
        // MetadataAdmin - Администратор метаданных
        await queryInterface.bulkInsert(
            {
                tableName: 'URules',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: '79ac697d-2559-4a43-8279-bf12fc1c4ffc',
                    markdel: 0,
                    name: 'MetadataAdmin',
                    details: 'Администратор метаданных',
                },
            ],
            {},
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete(
            {
                tableName: 'URules',
                schema: process.env.DB_SCHEMA,
            },
            null,
            {
                where: {
                    id: '79ac697d-2559-4a43-8279-bf12fc1c4ffc',
                },
            },
        );
    },
};