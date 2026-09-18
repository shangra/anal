module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        return queryInterface.addColumn(
            {
                tableName: 'DumpMeta',
                schema: process.env.DB_SCHEMA,
            },
            'name',
            {
                type: Sequelize.STRING,
                defaultValue: '',
            }
        );
    },

    async down(queryInterface) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        return queryInterface.removeColumn(
            {
                tableName: 'DumpMeta',
                schema: process.env.DB_SCHEMA,
            },
            'name'
        );
    },
};
