module.exports = {
    up: async (queryInterface) => {
        const { sequelize } = queryInterface;

        //
        const viewQuery = `
            SELECT *,
                   (SELECT coalesce(jsonb_agg(row_to_json(descendants_table)), '[]')
                    FROM "${process.env.DB_SCHEMA}".get_template_descendants("Templates".id) AS descendants_table) AS descendants,
                   (SELECT coalesce(jsonb_agg(row_to_json(ancestors_table)), '[]')
                    FROM "${process.env.DB_SCHEMA}".get_template_ancestors("Templates".id) AS ancestors_table)     AS ancestors
            FROM "${process.env.DB_SCHEMA}"."Templates" AS "Templates"
        `;
        const familyFunctionQuery = `
DROP FUNCTION IF EXISTS "${process.env.DB_SCHEMA}".get_template_descendants CASCADE;

CREATE OR REPLACE FUNCTION "${process.env.DB_SCHEMA}".get_template_descendants(template_id uuid)
    RETURNS SETOF "${process.env.DB_SCHEMA}"."Templates"
AS
$$
WITH RECURSIVE
    starting AS
        (
            SELECT *
            FROM "${process.env.DB_SCHEMA}"."Templates" AS tree
            WHERE tree.id = template_id
        ),
    -- descendants
    descendants AS
        (
            SELECT *
            FROM starting
            UNION ALL
            SELECT tree.*
            FROM "${process.env.DB_SCHEMA}"."Templates" as tree
                     JOIN descendants
                          ON tree.parent = descendants.id
            where tree.id != '00000000-0000-0000-0000-000000000000'
        )
SELECT *
FROM descendants
where descendants.id != template_id
$$
    LANGUAGE 'sql';

DROP FUNCTION IF EXISTS "${process.env.DB_SCHEMA}".get_template_ancestors CASCADE;

CREATE OR REPLACE FUNCTION "${process.env.DB_SCHEMA}".get_template_ancestors(template_id uuid)
    RETURNS SETOF "${process.env.DB_SCHEMA}"."Templates"
AS
$$
WITH RECURSIVE
    starting AS
        (
            SELECT *
            FROM "${process.env.DB_SCHEMA}"."Templates" AS tree
            WHERE tree.id = template_id
        ),
--      ancestors
    ancestors AS
        (
            SELECT *
            FROM starting
            UNION ALL
            SELECT tree.*
            FROM "${process.env.DB_SCHEMA}"."Templates" as tree
                     JOIN ancestors
                          ON tree.id = ancestors.parent
            where ancestors.id != '00000000-0000-0000-0000-000000000000'
        )
SELECT *
FROM ancestors
where ancestors.id != template_id
$$
    LANGUAGE 'sql';
        `;

        // создаем функции, агрегирующие потомков и предков
        await sequelize.query(familyFunctionQuery);
        // создаем представление сущности с дополнительными столбцами ancestors и descendants
        await sequelize.query(
            `CREATE OR REPLACE VIEW "${process.env.DB_SCHEMA}"."FamilyTemplates" AS ${viewQuery}`
        );
    },
    down: async (queryInterface) => {
        const { sequelize } = queryInterface;
        await sequelize.query(`
        DROP VIEW IF EXISTS "${process.env.DB_SCHEMA}"."FamilyTemplates";
        DROP FUNCTION IF EXISTS "${process.env.DB_SCHEMA}".get_template_ancestors CASCADE;
        DROP FUNCTION IF EXISTS "${process.env.DB_SCHEMA}".get_template_descendants CASCADE;
        `);
    },
};
