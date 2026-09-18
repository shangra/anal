module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addIndex({
            tableName: 'Metadata',
            schema: process.env.DB_SCHEMA
        }, ['parent', 'class_id', 'markdel']);
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex({
            tableName: 'Metadata',
            schema: process.env.DB_SCHEMA
        }, ['parent', 'class_id', 'markdel']);
    },
};
