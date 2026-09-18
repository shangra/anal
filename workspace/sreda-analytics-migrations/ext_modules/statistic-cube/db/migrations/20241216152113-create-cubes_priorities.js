module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            'CubesPriorities',
            {
                id: {
                    allowNull: false,
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                },
                cube_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    unique: true
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
                // Более высокое значение означает более высокий авторитет
                priority: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    validate: {
                        min: 1,
                        max: 10
                    }
                },
                // Был ли приоритет установлен вручную
                manual: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                }
            },
            {
                schema: process.env.DB_SCHEMA, // default: public, PostgreSQL only.
            },
        );

        // CHECK-ограниения для поля priority
        await queryInterface.addConstraint({
            tableName: 'CubesPriorities',
            schema: process.env.DB_SCHEMA
        }, {
            fields: ['priority'],
            type: 'check',
            where: {
                priority: { [Sequelize.Op.between]: [1, 10] }
            },
            name: 'check_priority_range',
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable({
            tableName: 'CubesPriorities',
            schema: process.env.DB_SCHEMA,
        });
    },
};

