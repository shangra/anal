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
                    owner: 'roles',
                    type: 'view',
                    owner_id: 'bb38d4d1-baa0-41cd-ab48-248e484d4c47',
                    updatedAt: '2023-12-19 10:47:42.553872 +00:00',
                    createdAt: '2023-12-19 10:47:42.553872 +00:00',
                },
                {
                    table_name: 'Metadata',
                    table_id: '00000000-0000-0000-0000-000000000000',
                    owner: 'roles',
                    type: 'read',
                    owner_id: 'bb38d4d1-baa0-41cd-ab48-248e484d4c47',
                    updatedAt: '2023-12-19 10:47:42.553872 +00:00',
                    createdAt: '2023-12-19 10:47:42.553872 +00:00',
                },
                {
                    table_name: 'Metadata',
                    table_id: '00000000-0000-0000-0000-000000000000',
                    owner: 'roles',
                    type: 'view',
                    owner_id: '3af59785-f991-4000-b7e0-f415f86d83f2',
                    updatedAt: '2023-12-19 10:47:42.553872 +00:00',
                    createdAt: '2023-12-19 10:47:42.553872 +00:00',
                },
                {
                    table_name: 'Metadata',
                    table_id: '00000000-0000-0000-0000-000000000000',
                    owner: 'roles',
                    type: 'read',
                    owner_id: '3af59785-f991-4000-b7e0-f415f86d83f2',
                    updatedAt: '2023-12-19 10:47:42.553872 +00:00',
                    createdAt: '2023-12-19 10:47:42.553872 +00:00',
                },
                {
                    table_name: 'Metadata',
                    table_id: '00000000-0000-0000-0000-000000000000',
                    owner: 'roles',
                    type: 'write',
                    owner_id: '3af59785-f991-4000-b7e0-f415f86d83f2',
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
                    table_id: '00000000-0000-0000-0000-000000000000',
                    owner_id: ['bb38d4d1-baa0-41cd-ab48-248e484d4c47', '3af59785-f991-4000-b7e0-f415f86d83f2'],
                },
            },
        );
    },
};
