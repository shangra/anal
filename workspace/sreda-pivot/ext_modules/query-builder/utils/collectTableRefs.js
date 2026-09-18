'use strict';

const Node = require('../ast/Node');

/**
 * Обходит AST-дерево и собирает уникальные ссылки на физические таблицы
 * (узлы `TableSource`) для передачи в `StatsProvider.preload()`.
 *
 * Логика обхода:
 *  - `TableSource`      -> извлекается `{ schema, name }` и добавляется в результат
 *                         (дедупликация по ключу `schema.name`, аналогично `BaseSqlStatsProvider._key`).
 *  - `CteRef`           -> пропускается как источник (это ссылка на CTE, не физическая таблица).
 *  - `SubquerySource`   -> рекурсивно обходится `SubquerySource.query`.
 *  - `Query` (WITH)     -> обходятся тела всех CTE (`cte.query`) и тело запроса (`node.body`).
 *  - Любой другой узел -> рекурсивно обходятся все дочерние Node-поля и массивы Node.
 *
 * Порядок результата — первое появление в дереве (обход в глубину, pre-order).
 *
 * @param {import('../ast').Node} root
 * @param {object}  [opts]
 * @param {string}  [opts.defaultSchema='public']  - схема по умолчанию для нормализации ключа
 *                                                    (должна совпадать с `BaseSqlStatsProvider._key`).
 * @param {boolean} [opts.includeCteBodies=true]   - обходить тела CTE/temp-таблиц.
 * @returns {Array<{ schema: string, name: string }>}
 */
function collectTableRefs(root, opts = {}) {
    if (!Node.is(root)) return [];

    const { defaultSchema = 'public', includeCteBodies = true } = opts;

    /** @type {Array<{ schema: string, name: string }>} */
    const result = [];
    const seen = new Set();

    const push = (name, schema) => {
        const resolvedSchema = schema || defaultSchema;
        const key = `${resolvedSchema}.${name}`;
        if (seen.has(key)) return;
        seen.add(key);
        result.push({ schema: resolvedSchema, name });
    };

    const walk = (node) => {
        if (!Node.is(node)) return;

        if (node.kind === 'TableSource') {
            push(node.name, node.schema);
            return;
        }

        if (node.kind === 'CteRef') {
            // Ссылка на CTE — не физическая таблица; тело обойдено через Query.ctes.
            return;
        }

        if (node.kind === 'Query') {
            if (includeCteBodies) {
                for (const cte of node.ctes || []) {
                    if (Node.is(cte.query)) walk(cte.query);
                }
            }
            if (Node.is(node.body)) walk(node.body);
            return;
        }

        // --- произвольный узел: рекурсивно обходим все дочерние Node-поля ---
        for (const [k, v] of Object.entries(node)) {
            if (k === 'kind') continue;
            if (Array.isArray(v)) {
                for (const x of v) {
                    if (Node.is(x)) walk(x);
                }
            } else if (Node.is(v)) {
                walk(v);
            }
        }
    };

    walk(root);

    return result;
}

module.exports = { collectTableRefs };
