const tableName = 'processing_meta';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            tableName,
            {
                id: {
                    allowNull: false,
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                },
                cube_id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                },
                layer_id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                },
                processing_id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                },

                status: {
                    allowNull: false,
                    type: Sequelize.STRING(15),
                },
                date: {
                    allowNull: false,
                    type: Sequelize.DATE,
                },
            },
            {
                schema: process.env.DB_SCHEMA, // default: public, PostgreSQL only.
            },
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable({
            tableName: tableName,
            schema: process.env.DB_SCHEMA,
        });
    },
};
