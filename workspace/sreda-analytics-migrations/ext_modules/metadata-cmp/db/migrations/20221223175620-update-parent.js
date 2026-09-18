module.exports = {
    up: async (queryInterface) => {
        const { sequelize } = queryInterface;

        const viewUpdate = `
            UPDATE
                "${process.env.DB_SCHEMA}"."Metadata"
            SET
                parent = "Metadata".class_id
            WHERE parent = '00000000-0000-0000-0000-000000000000' AND (class_id <> id);
        `;
        await sequelize.query(viewUpdate);
    },

    down: async (queryInterface) => {
        const { sequelize } = queryInterface;

        const viewUpdate = `
            UPDATE
                "${process.env.DB_SCHEMA}"."Metadata"
            SET
                parent = '00000000-0000-0000-0000-000000000000'
            WHERE class_id = parent AND (class_id <> id);
        `;
        await sequelize.query(viewUpdate);
    },
};
