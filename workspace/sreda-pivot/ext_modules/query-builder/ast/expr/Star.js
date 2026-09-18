'use strict';
const Node = require('../Node');

/**
 * Звёздочка SELECT:
 *   - `*`          -> qualifier=null, except=[]
 *   - `t.*`        -> qualifier='t', except=[]
 *   - `t.* EXCEPT(col1, col2)` -> qualifier='t', except=['col1','col2']
 *
 * Диалекты, не поддерживающие EXCEPT, должны раскрывать в явный список колонок.
 * Это делается на уровне Dialect.visit_Star через метаинфу (ей сообщают extra).
 */
class Star extends Node {
    constructor({ qualifier = null, except = [] }) {
        super('Star', { qualifier, except });
    }
}
module.exports = Star;
