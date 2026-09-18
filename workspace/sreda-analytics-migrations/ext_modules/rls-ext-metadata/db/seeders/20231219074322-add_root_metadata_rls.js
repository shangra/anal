module.exports = {
    async up(queryInterface) {
        /**
         * Add seed commands here.
         *
         * Example:
         * await queryInterface.bulkInsert('People', [{
         *   name: 'John Doe',
         *   isBetaMember: false
         * }], {});
         */
        await queryInterface.bulkInsert(
            {
                tableName: 'Rls',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    table_name: 'Metadata',
                    table_id: '00000000-0000-0000-0000-000000000000',
                    owner: 'users',
                    type: 'read',
                    owner_id: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedAt: '2023-12-19 10:47:42.553872 +00:00',
                    createdAt: '2023-12-19 10:47:42.553872 +00:00',
                },
                {
                    table_name: 'Metadata',
                    table_id: '00000000-0000-0000-0000-000000000000',
                    owner: 'users',
                    type: 'view',
                    owner_id: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedAt: '2023-12-19 10:47:42.553872 +00:00',
                    createdAt: '2023-12-19 10:47:42.553872 +00:00',
                },
                {
                    table_name: 'Metadata',
                    table_id: '00000000-0000-0000-0000-000000000000',
                    owner: 'users',
                    type: 'write',
                    owner_id: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedAt: '2023-12-19 10:47:42.553872 +00:00',
                    createdAt: '2023-12-19 10:47:42.553872 +00:00',
                },
            ],
            {},
        );
    },

    async down(queryInterface) {
        /**
         * Add commands to revert seed here.
         *
         * Example:
         * await queryInterface.bulkDelete('People', null, {});
         */
        await queryInterface.bulkDelete(
            {
                tableName: 'Rls',
                schema: process.env.DB_SCHEMA,
            },
            null,
            {
                where: {
                    table_name: 'Metadata',
                },
            },
        );
    },
};
