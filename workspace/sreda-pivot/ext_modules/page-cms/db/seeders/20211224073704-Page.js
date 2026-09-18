module.exports = {
    up: async (queryInterface, Sequelize) => {
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
                tableName: 'Pages',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: '00000000-0000-0000-0000-000000000000', // 2
                    name: 'root',
                    uri: '',
                    parent: '00000000-0000-0000-0000-000000000000',
                    active: 0,
                    template: '00000000-0000-0000-0000-000000000000',
                    markdel: 0,
                    content_type: '',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
            ],
            {}
        );
    },

    down: async (queryInterface, Sequelize) => {
        /**
         * Add commands to revert seed here.
         *
         * Example:
         * await queryInterface.bulkDelete('People', null, {});
         */
        await queryInterface.bulkDelete(
            {
                tableName: 'Pages',
                schema: process.env.DB_SCHEMA,
            },
            null,
            {}
        );
    },
};
