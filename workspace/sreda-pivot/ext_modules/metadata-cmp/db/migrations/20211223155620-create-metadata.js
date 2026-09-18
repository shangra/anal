module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'Metadata',
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

                parent: {
                    allowNull: false,
                    type: Sequelize.UUID,
                },
                class_id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                },
                class: {
                    allowNull: false,
                    type: Sequelize.STRING,
                },
                name: {
                    allowNull: false,
                    type: Sequelize.STRING,
                },
                description: {
                    defaultValue: '',
                    type: Sequelize.STRING,
                },
                manifest: {
                    type: Sequelize.TEXT,
                },
                rank: {
                    defaultValue: 0,
                    type: Sequelize.INTEGER,
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
            },
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable({
            tableName: 'Metadata',
            schema: process.env.DB_SCHEMA,
        });
    },
};
