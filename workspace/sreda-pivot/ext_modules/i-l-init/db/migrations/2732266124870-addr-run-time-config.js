'use strict';

const tableName = 'r_cg';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.transaction(async (t) => {
            await queryInterface.createTable(tableName,
                {
                    id: {
                        allowNull: false,
                        primaryKey: true,
                        type: Sequelize.UUID,
                        defaultValue: Sequelize.UUIDV4,
                    },
                    key: {
                        unique: true,
                        allowNull: false,
                        type: Sequelize.TEXT,
                    },
                    value: {
                        allowNull: true,
                        type: Sequelize.TEXT,
                    }
                },
                {
                    schema: process.env.DB_SCHEMA,
                    transaction: t
                }
            );
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.transaction(async (t) => {
            await queryInterface.dropTable({ tableName: tableName, schema: process.env.DB_SCHEMA }, { transaction: t });
        })
    }
};