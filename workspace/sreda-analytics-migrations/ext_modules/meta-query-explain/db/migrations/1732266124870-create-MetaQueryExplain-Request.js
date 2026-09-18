'use strict';

const explainRequest = 'ExplainRequest';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.transaction(async (t) => {
            await queryInterface.createTable(explainRequest,
                {
                    id: {
                        allowNull: false,
                        primaryKey: true,
                        type: Sequelize.UUID,
                        defaultValue: Sequelize.UUIDV4,
                    },
                    answerId: {
                        unique: true,
                        allowNull: false,
                        type: Sequelize.UUID,
                    },
                    plan: {
                        allowNull: true,
                        type: Sequelize.TEXT,
                    }
                },
                {
                    schema: process.env.DB_SCHEMA,    // default: public, PostgreSQL only.
                    transaction: t
                }
            );
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.sequelize.transaction(async (t) => {
            await queryInterface.dropTable({
                tableName: explainRequest,
                schema: process.env.DB_SCHEMA
            }, {
                transaction: t
            });
        })
    }
};
