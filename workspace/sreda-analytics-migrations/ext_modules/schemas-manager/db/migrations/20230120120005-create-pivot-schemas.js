module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('PivotSchemas', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            code: {
                type: Sequelize.INTEGER,
                allowNull: false,
                unique: true,
                autoIncrement: true,
            },
            markdel: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            createdUser: {
                type: Sequelize.UUID,
            },
            updatedUser: {
                type: Sequelize.UUID,
            },
            owner: {
                type: Sequelize.UUID,
                allowNull: true,
            },
            schema_owner: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            standart_schema: {
                type: Sequelize.BOOLEAN,
                allowNull: true,
            },
            schema: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            snapshot: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
        }, {
            schema: process.env.DB_SCHEMA,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable({
            tableName: 'PivotSchemas',
            schema: process.env.DB_SCHEMA,
        });
    },
};