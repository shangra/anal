const tableName = 'processing_meta';
const schema = process.env.DB_SCHEMA;

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.addIndex({ schema, tableName }, ['cube_id', 'layer_id', 'processing_id', 'date'], { transaction, unique: true })
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.removeIndex({ tableName, schema }, ['parent', 'class_id', 'markdel'], { transaction });
        });
    },
};
