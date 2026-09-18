module.exports = {
    up: async (queryInterface) => {
        /**
         * Add seed commands here.
         *
         * Example:
         * await queryInterface.bulkInsert('People', [{
         *   name: 'John Doe',
         *   isBetaMember: false
         * }], {});
         */
        // 0 - 00000000-0000-0000-0000-000000000000
        await queryInterface.bulkInsert(
            {
                tableName: 'Templates',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: '00000000-0000-0000-0000-000000000000',
                    name: 'root',
                    description: '',
                    parent: '00000000-0000-0000-0000-000000000000',
                    markdel: 0,
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
            ],
            {}
        );
    },

    down: async (queryInterface) => {
        /**
         * Add commands to revert seed here.
         *
         * Example:
         * await queryInterface.bulkDelete('People', null, {});
         */
        await queryInterface.bulkDelete(
            {
                tableName: 'Templates',
                schema: process.env.DB_SCHEMA,
            },
            null,
            {}
        );
    },
};
