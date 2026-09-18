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
        await queryInterface.bulkInsert(
            {
                tableName: 'ParamsTypes',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: 'f9a427f9-956c-4367-a0bd-719fa1f54ba1', // 1
                    name: 'Текст',
                    type: 'text',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
                {
                    id: '55a33e2d-cb18-4486-80d7-9b7b25909031', // 4
                    name: 'Json',
                    type: 'json',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
                {
                    id: 'e089ff28-920a-48df-b0fd-e904b07f41d0', // 4
                    name: 'Число',
                    type: 'number',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
                {
                    id: '9100078f-b9a6-44d7-aff8-f9ce3a9d0b95', // 4
                    name: 'Булево',
                    type: 'bool',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
                {
                    id: '62cd60f0-0fa3-4ada-9650-2ac624fdc090', // 5
                    name: 'Ссылка на файл',
                    type: 'filelink',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
                {
                    id: '2fc57216-2d3b-44f9-92ab-503e6d851670', // 8
                    name: 'Выражение на javascript',
                    type: 'javascript',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
                {
                    id: 'c8aa895a-86d7-46bd-8460-057d13d58310', // 9
                    name: 'Ссылка на страницу',
                    type: 'pages',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
                {
                    id: 'b928bced-e491-4060-8454-129a0e3e3878', // 11
                    name: 'Системный параметр',
                    type: 'system',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
                {
                    id: '7c3550c3-1816-43d5-b13d-ff08b08a4a95', // 12
                    name: 'Дата',
                    type: 'date',
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
                tableName: 'ParamsTypes',
                schema: process.env.DB_SCHEMA,
            },
            null,
            {}
        );
    },
};
