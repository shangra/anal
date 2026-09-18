'use strict';

const crypto = require('crypto');
const b = require('../builder');

/** Короткое стабильное имя CTE по хешу произвольного ключа. */
function cteName(prefix, keyOrAst) {
    const key =
        typeof keyOrAst === 'string'
            ? keyOrAst
            : JSON.stringify(keyOrAst, (_, v) => (v && v.kind ? v : v));
    return `${prefix}${crypto
        .createHash('md5')
        .update(key)
        .digest('hex')
        .slice(0, 16)}`;
}

/** Обернуть SELECT как источник FROM с алиасом. */
function fromSelect(ast, alias) {
    return b.subsrc(ast, alias);
}

/** Сделать SELECT * FROM ast AS alias. */
function selectStar(ast, alias) {
    return b.select({ projections: [], from: b.from(fromSelect(ast, alias)) });
}

/** Скомпоновать projections из [[fnExpr, alias], ...]. */
function projections(items) {
    return items.map(([expr, alias]) => b.proj(expr, alias || null));
}

/** ARRAY_AGG/unnest/array диалект-независимо (реализовано через FunctionCall - диалект сам решит). */
const arr = (items, elemType) => b.arr(items, elemType);
const fn = (name, args) => b.fn(name, args);

module.exports = { cteName, fromSelect, selectStar, projections, arr, fn };
