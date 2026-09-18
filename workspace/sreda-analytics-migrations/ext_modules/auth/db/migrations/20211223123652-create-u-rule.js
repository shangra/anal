module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'URules',
            {
                id: {
                    allowNull: false,
                    primaryKey: true,
                    defaultValue: Sequelize.UUIDV4,
                    type: Sequelize.UUID,
                },
                code: {
                    allowNull: false,
                    autoIncrement: true,
                    unique: true,
                    type: Sequelize.INTEGER,
                },
                markdel: {
                    allowNull: false,
                    type: Sequelize.INTEGER,
                    defaultValue: 0,
                },
                name: {
                    type: Sequelize.STRING,
                    allowNull: false,
                },
                details: {
                    type: Sequelize.STRING,
                    allowNull: false,
                },
                createdAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                },
                updatedAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                },
                createdUser: {
                    type: Sequelize.UUID,
                },
                updatedUser: {
                    type: Sequelize.UUID,
                },
            },
            {
                schema: process.env.DB_SCHEMA, // default: public, PostgreSQL only.
            }
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable({
            tableName: 'URules',
            schema: process.env.DB_SCHEMA,
        });
    },
};
