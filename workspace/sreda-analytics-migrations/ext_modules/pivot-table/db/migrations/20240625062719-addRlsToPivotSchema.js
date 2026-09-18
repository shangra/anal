'use strict';

const defaultRead = {
    table_name: 'PivotSchemas',
    owner: 'rules',
    type: 'read',
    owner_id: '90499885-ae60-440b-a59f-cfd3958110cd'
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        queryInterface.sequelize.transaction(async (transaction) => {
            const temp = await queryInterface.select(null, { tableName: 'PivotSchemas', schema: process.env.DB_SCHEMA }, { raw: true, transaction });

            const data = temp.reduce((acc, curr) => {
                acc.push({
                    ...defaultRead,
                    table_id: curr.id,
                });

                acc.push({
                    ...defaultRead,
                    table_id: curr.id,
                    type: 'write',
                    owner_id: curr.owner
                });

                return acc;
            }, []);

            if (data.length) {
                await queryInterface.bulkInsert({ tableName: 'Rls', schema: process.env.DB_SCHEMA }, data, { transaction });
            }
        });
    },

    async down() {
        //irreversible
    }
};
