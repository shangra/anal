module.exports = {
    up: async (queryInterface, Sequelize) => {
        // MetadataDelete - Удаление метаданных
        await queryInterface.bulkInsert(
            {
                tableName: 'URules',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: '71280ff3-3932-4169-a744-f486e8be54dc',
                    markdel: 0,
                    name: 'MetadataDelete',
                    details: 'Удаление метаданных',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
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
                    id: '71280ff3-3932-4169-a744-f486e8be54dc',
                },
            },
        );
    },
};