'use strict';

const Node = require('../ast/Node');
const { Query } = require('../ast/stmt');

/**
 * Поднимает CTE с учётом материализации.
 *
 *   temp   -> всегда на самый верх (rootScope.temps), в топологическом порядке.
 *   cte    -> в ближайший охватывающий temp (если есть), иначе на верх (rootScope.ctes).
 *   inline -> игнорируется (такие узлы не должны участвовать в CTE-списке; они предполагают использование через SubquerySource).
 *
 * @param {import('../ast').Node} root
 * @returns {import('../ast').Node}
 */
function hoistCtes(root) {
    if (!Node.is(root)) return root;

    const rootScope = {
        temps: [],
        ctes: [],
        tempsSeen: new Set(),
        ctesSeen: new Set(),
    };

    const stack = [rootScope];
    const currentScope = () => stack[stack.length - 1];

    const pushTemp = (cte) => {
        if (rootScope.tempsSeen.has(cte.name)) return;
        rootScope.tempsSeen.add(cte.name);
        rootScope.temps.push(cte);
    };

    const pushCte = (cte) => {
        const s = currentScope();
        if (s.ctesSeen.has(cte.name)) return;
        s.ctesSeen.add(cte.name);
        s.ctes.push(cte);
    };

    const walk = (node) => {
        if (!Node.is(node)) return node;

        if (node.kind === 'Query') {
            for (const cte of node.ctes || []) {
                if (cte.materialization === 'inline') continue;

                if (cte.materialization === 'temp') {
                    const local = { ctes: [], ctesSeen: new Set() };
                    stack.push(local);

                    const innerBody = walk(cte.query);

                    stack.pop();

                    // Оборачиваем тело временной таблицы локальным WITH, если есть cte-CTE.
                    const wrappedBody = local.ctes.length
                        ? new Query({ ctes: local.ctes, body: innerBody })
                        : innerBody;

                    // Сам temp отправляется в корень.
                    pushTemp(cte.with({ query: wrappedBody }));
                } else {
                    // cte - пушим в ТЕКУЩИЙ скоуп; тело обычно обходим (там могут быть ещё CTE).
                    const innerBody = walk(cte.query);
                    pushCte(cte.with({ query: innerBody }));
                }
            }
            return walk(node.body);
        }

        // --- произвольный узел: рекурсивно обходим детей ---
        const patch = {};
        let changed = false;
        for (const [k, v] of Object.entries(node)) {
            if (k === 'kind') continue;
            if (Array.isArray(v)) {
                let arrChanged = false;
                const mapped = v.map((x) => {
                    if (!Node.is(x)) return x;
                    const w = walk(x);
                    if (w !== x) arrChanged = true;
                    return w;
                });
                if (arrChanged) {
                    patch[k] = mapped;
                    changed = true;
                }
            } else if (Node.is(v)) {
                const w = walk(v);
                if (w !== v) {
                    patch[k] = w;
                    changed = true;
                }
            }
        }
        return changed ? node.with(patch) : node;
    };

    const body = walk(root);

    return new Query({
        ctes: [...rootScope.temps, ...rootScope.ctes],
        body,
    });
}

/**
 * Поднимает TagList на уровень Query.
 *
 *   TagList -> собирает все { key, value } теги в hoistedTags[],
 *              обходит query-дерево для вложенных TagList.
 *
 * Результат: Query с extra-полем `tags: Tag[]`.
 *
 * @param {import('../ast').Node} root
 */
function hoistTags(root) {
    if (!Node.is(root)) return { list: null, query: root };

    const hoistedTags = [];

    const walk = (node) => {
        if (!Node.is(node)) return node;

        if (node.kind === 'TagList') {
            const { list, query } = node;
            if (list?.length) for (const tag of list) hoistedTags.push(tag);
            return query ? walk(query) : node;
        }

        // --- произвольный узел: рекурсивно обходим детей ---
        const patch = {};
        let changed = false;
        for (const [k, v] of Object.entries(node)) {
            if (k === 'kind') continue;
            if (Array.isArray(v)) {
                let arrChanged = false;
                const mapped = v.map((x) => {
                    if (!Node.is(x)) return x;
                    const w = walk(x);
                    if (w !== x) arrChanged = true;
                    return w;
                });
                if (arrChanged) {
                    patch[k] = mapped;
                    changed = true;
                }
            } else if (Node.is(v)) {
                const w = walk(v);
                if (w !== v) {
                    patch[k] = w;
                    changed = true;
                }
            }
        }
        return changed ? node.with(patch) : node;
    };

    const body = walk(root);

    return {
        list: hoistedTags.length ? hoistedTags : undefined,
        query: body,
    };
}

module.exports = { hoistCtes, hoistTags };
