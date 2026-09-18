'use strict';

const explainQuery = 'ExplainRequestMeta';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.transaction(async (t) => {
            await queryInterface.createTable(
                explainQuery,
                {
                    id: {
                        allowNull: false,
                        primaryKey: true,
                        type: Sequelize.UUID,
                        defaultValue: Sequelize.UUIDV4,
                    },
                    meta: {
                        allowNull: true,
                        type: Sequelize.TEXT,
                    },
                },
                {
                    schema: process.env.DB_SCHEMA, // default: public, PostgreSQL only.
                    transaction: t,
                }
            );
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.transaction(async (t) => {
            await queryInterface.dropTable(
                {
                    tableName: explainQuery,
                    schema: process.env.DB_SCHEMA,
                },
                {
                    transaction: t,
                }
            );
        });
    },
};
