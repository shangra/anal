module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert(
            {
                tableName: 'URules',
                schema: process.env.DB_SCHEMA,
            },
            [
                {
                    id: '08c35af6-4197-4af9-9873-03120ec273cc',
                    name: 'SystemSettingsManager',
                    details: 'Доступ к администрированию системных настроек',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
                {
                    id: 'c1d12572-8483-45c7-93ec-4c94dae85f3b',
                    name: 'SystemSettingsRead',
                    details: 'Просмотр системных настроек',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
                {
                    id: 'b50b5ca9-ae79-4a99-b453-85688abd1582',
                    name: 'SystemSettingsWrite',
                    details: 'Редактирование системных настроек',
                    createdUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                    updatedUser: 'cba95ae9-1740-4dd7-8d6e-e9ce168f3ee4',
                },
            ],
            {}
        );
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add commands to revert seed here.
         *
         * Example:
         * await queryInterface.bulkDelete('People', null, {});
         */
        await queryInterface.bulkDelete(
            {
                tableName: 'URules',
                schema: process.env.DB_SCHEMA,
            },
            null,
            {
                where: {
                    id: [
                        '08c35af6-4197-4af9-9873-03120ec273cc',
                        'c1d12572-8483-45c7-93ec-4c94dae85f3b',
                        'b50b5ca9-ae79-4a99-b453-85688abd1582',
                    ],
                },
            }
        );
    },
};
