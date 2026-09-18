'use strict';

const SYM_NODE = Symbol.for('mqb.node');

/** @typedef {import('../types').INode} INode */

/**
 * Базовый неизменяемый узел AST.
 *
 * Правила:
 *  - freeze после конструирования;
 *  - никаких методов SQL-генерации - за это отвечает Dialect;
 *  - `kind` - строковый дискриминатор для визитора.
 *
 * @implements {INode}
 */
class Node {
    /**
     * @param {string} kind
     * @param {object} props
     */
    constructor(kind, props = {}) {
        Object.defineProperty(this, SYM_NODE, { value: true }); // non-enumerable
        this.kind = kind;
        Object.assign(this, props);
        Object.freeze(this);
    }

    /**
     * Клон с перезаписью полей.
     *
     * ВАЖНО: подклассы имеют сигнатуру `constructor(props)`.
     * Передаём ОДИН объект со всеми полями (kind в нём - игнорируется
     * деструктуризацией подкласса).
     */
    with(patch) {
        if (!patch || !Object.keys(patch).length) return this;

        const current = this.toJSON();
        const next = { ...current, ...patch };

        // Структурная защита от «I returned garbage»:
        // если в patch есть undefined, они восприняты как «удалить поле» - но поскольку
        // конструктор подкласса проставит дефолт, это безопасно.
        return new this.constructor(next);
    }

    /**
     * Возвращает простой объект со всеми enumerable-полями, включая kind.
     * SYM_NODE не попадёт - он non-enumerable by design.
     */
    toJSON() {
        const out = {};
        for (const k of Object.keys(this)) out[k] = this[k];
        return out;
    }

    static is(value) {
        return !!(value && value[SYM_NODE] === true);
    }
}

module.exports = Node;
module.exports.SYM_NODE = SYM_NODE;
