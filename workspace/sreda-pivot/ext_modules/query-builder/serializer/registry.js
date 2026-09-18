'use strict';

// registry.js - карта kind -> класс конструктора.
// Автоматически собирается из всех трёх слоёв AST.
// При добавлении нового узла добавьте его класс в ast/expr|clause|stmt/index.js.

const exprNodes = require('../ast/expr');
const clauseNodes = require('../ast/clause');
const stmtNodes = require('../ast/stmt');
const Star = require('../ast/expr/Star');

// kind -> class map
const registry = Object.assign(
    Object.create(null),
    exprNodes, // Literal, Raw, Identifier, Column, Param, BinaryOp, …
    clauseNodes, // TableSource, SubquerySource, From, Join, …
    stmtNodes, // Select, SetOp, Cte, Query, Insert, …
    { Star } // Star экспортируется отдельно
);

// Убираем не-классы (если вдруг попали утилиты)
for (const key of Object.keys(registry)) {
    if (typeof registry[key] !== 'function') delete registry[key];
}

module.exports = registry;
