'use strict';

/**
 * Единый тип материализации для любого подзапроса.
 *  - CTE:    печатается как `WITH name AS (...)`
 *  - TEMP:   печатается как `CREATE TEMP TABLE name AS (...); ...`, затем ссылка по имени
 *  - INLINE: печатается как подзапрос-источник на месте (без CTE)
 *
 * Решение, когда принудительно меняется диалектом через options:
 *  - CH/Trino: TEMP -> фолбек в CTE
 *  - GP: по умолчанию TEMP (для производительности)
 *  - Postgres: по умолчанию CTE
 */
const Kind = Object.freeze({ CTE: 'cte', TEMP: 'temp', INLINE: 'inline' });

class Strategy {
    constructor(kind = Kind.CTE) {
        if (!Object.values(Kind).includes(kind)) {
            throw new Error(`Unknown materialization kind: ${kind}`);
        }
        this.kind = kind;
    }
    static of(kind) {
        return new Strategy(kind);
    }
    static default(dialect) {
        return new Strategy(dialect.options.defaultMaterialization || Kind.CTE);
    }
    resolve(dialect) {
        if (this.kind === Kind.TEMP && !dialect.options.supportsTempTables)
            return Kind.CTE;
        return this.kind;
    }
}

module.exports = { Kind, Strategy };
