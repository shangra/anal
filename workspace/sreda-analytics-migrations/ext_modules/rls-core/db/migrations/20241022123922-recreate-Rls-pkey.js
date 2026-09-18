module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeConstraint(`"${process.env.DB_SCHEMA}"."Rls"`, 'Rls_pkey');
            await queryInterface.addConstraint(`"${process.env.DB_SCHEMA}"."Rls"`, {
                fields: ['type', 'table_id', 'owner_id', 'table_name', 'owner'],
                type: 'PRIMARY KEY',
                name: 'Rls_pkey',
            });
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },
    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeConstraint(`"${process.env.DB_SCHEMA}"."Rls"`, 'Rls_pkey');
            await queryInterface.addConstraint(`"${process.env.DB_SCHEMA}"."Rls"`, {
                fields: ['table_name', 'table_id', 'owner', 'type', 'owner_id'],
                type: 'PRIMARY KEY',
                name: 'Rls_pkey',
            });
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },
};
