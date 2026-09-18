module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'UserData',
            {
                id: {
                    allowNull: false,
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
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
                user_id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                    // unique: 'actions_unique',
                    // references: {
                    //     key: 'id',
                    //     model: 'Users',
                    // },
                    // onDelete: 'CASCADE',
                },
                attribute_id: {
                    allowNull: false,
                    type: Sequelize.UUID,
                    // unique: 'actions_unique',
                    // references: {
                    //     key: 'id',
                    //     model: 'UAttributes',
                    // },
                    // onDelete: 'CASCADE',
                },
                value: {
                    allowNull: false,
                    type: Sequelize.TEXT,
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
                uniqueKeys: {
                    actions_unique: {
                        fields: ['user_id', 'attribute_id'],
                    },
                },
            }
        );
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable({
            tableName: 'UserData',
            schema: process.env.DB_SCHEMA,
        });
    },
};
