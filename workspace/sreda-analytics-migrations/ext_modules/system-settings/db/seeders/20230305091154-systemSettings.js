module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 0 - 00000000-0000-0000-0000-000000000000
        await queryInterface.bulkInsert(
            {
                tableName: 'SystemSettings',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: '00000000-0000-0000-0000-000000000000', // 2
                    markdel: 0,

                    parent: '00000000-0000-0000-0000-000000000000',
                    name: 'root',
                    description: 'Корневой элемент',
                    type: '00000000-0000-0000-0000-000000000000',
                    value: '',

                    createdUser: '00000000-0000-0000-0000-000000000000',
                    updatedUser: '00000000-0000-0000-0000-000000000000',
                },
            ],
            {},
        );
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete(
            {
                tableName: 'SystemSettings',
                schema: process.env.DB_SCHEMA,
            }, 
            null, 
            {}
        );
    },
};
