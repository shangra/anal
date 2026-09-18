'use strict';

const ast = require('./ast');
const b = require('./builder');
const dialects = require('./dialect');
const materialization = require('./materialization');
const { normalizeWhere } = require('./utils/normalize');
const { hoistCtes, hoistTags } = require('./utils/hoist');
const serializer = require('./serializer');

/**
 * Фасад: print(query, dialect, opts) -> { sql, bindings }.
 *
 * Пример:
 *   const { b, PostgresDialect, print } = require('query-builder');
 *   const q = b.query(b.select({
 *       projections: [b.proj(b.col('id')), b.proj(b.col('name'))],
 *       from: b.from(b.table('users', { schema: 'public', alias: 'u' })),
 *       where: b.eq(b.col('tenant', 'u'), b.param('t-1')),
 *   }));
 *   print(q, new PostgresDialect());
 */
function print(root, dialect, opts = {}) {
    // Оборачиваем Select в Query если пришел "голый"
    if (root?.kind === 'Select' || root?.kind === 'SetOp') {
        root = b.query(root);
    }
    // Поднимаем все CTE на верхний уровень перед сериализацией.
    // opts.hoist === false отключает подъём (escape-hatch для редких случаев).
    if (opts?.hoist !== false) root = hoistCtes(root);

    if (opts?.split) {
        let tags;
        ({ list: tags, query: root } = hoistTags(root));
        tags = tags
            ? dialect.print(b.tags(tags || []))
            : { sql: '', bindings: [] };
        const temps = dialect.print(
            b.query(
                null,
                root.ctes.filter((i) => i.materialization === 'temp')
            )
        );
        const ctes = dialect.print(
            b.query(
                null,
                root.ctes.filter((i) => i.materialization === 'cte')
            )
        );
        const body = dialect.print(b.query(root.body?.query || root.body, []));

        const bindings = [...tags.bindings, ...ctes.bindings, ...body.bindings];

        return { tags, temps, ctes, body, bindings };
    }

    const { list: tags, query } = hoistTags(root);
    const sql = dialect.print(b.tags(tags, query));
    return sql;
}

module.exports = {
    ast,
    b,
    ...dialects, // Dialect, PostgresDialect, ...
    ...materialization, // Kind, Strategy
    normalizeWhere,
    hoistCtes,
    hoistTags,
    print,
    // serializer API
    serialize: serializer.serialize,
    deserialize: serializer.deserialize,
    toJSONString: serializer.toJSONString,
    fromJSONString: serializer.fromJSONString,
};
