module.exports = {
    up: async (queryInterface) => {
        const { sequelize } = queryInterface;

        const viewUpdate = `INSERT INTO "${process.env.DB_SCHEMA}"."MetadataDB" ("id", "code", "markdel", "parent", "class_id", "class", "name", "description", "manifest", "rank", "createdAt", "updatedAt", "createdUser", "updatedUser") SELECT "id", "code", "markdel", "parent", "class_id", "class", "name", "description", "manifest", "rank", "createdAt", "updatedAt", "createdUser", "updatedUser" FROM "${process.env.DB_SCHEMA}"."Metadata" ON CONFLICT (id) DO NOTHING;`;
        await sequelize.query(viewUpdate);
    },

    down: async (queryInterface) => {
        const { sequelize } = queryInterface;

        const viewUpdate = `TRUNCATE "${process.env.DB_SCHEMA}"."MetadataDB"`;
        await sequelize.query(viewUpdate);
    },
};
