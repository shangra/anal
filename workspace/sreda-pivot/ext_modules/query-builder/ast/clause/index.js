'use strict';

const Node = require('../Node');

/**
 * Источник данных: таблица схемы, подзапрос или CTE-ссылка.
 *
 * Поля для оптимизатора (опционально; заполняются catalog/stats-провайдером):
 *   storageKind:   'heap' | 'appendOnly' | 'columnstore' | 'external' | null
 *                  Тип хранилища - GP/CH используют для выбора стратегии join и push-down.
 *   distribution:  'randomly' | 'replicated' | { by: string[] } | null
 *                  GP-специфика: ключ дистрибуции -> motion-elimination.
 *   partitioning:  { kind: 'range'|'list'|'hash', keys: string[], partitions: any[] } | null
 *                  Для partition-pruning.
 *   indexes:       Array<{ columns: string[], unique: boolean, kind: 'btree'|'brin'|'hash'|'gist'|'gin' }> | null
 *                  Для index-scan vs seq-scan heuristics.
 *   stats:         { rows: number, widthBytes: number, distinctKeys: Object, nullFrac: Object,
 *                    mcvs: Object } | null
 *                  Статистики таблицы (из pg_class / pg_stats).
 */
class TableSource extends Node {
    constructor({
        name,
        schema = null,
        alias = null,
        catalog = null,
        storageKind = null,
        distribution = null,
        partitioning = null,
        indexes = null,
        stats = null,
    }) {
        super('TableSource', {
            name,
            schema,
            alias,
            catalog,
            storageKind,
            distribution,
            partitioning,
            indexes,
            stats,
        });
    }
}
class SubquerySource extends Node {
    constructor({ query, alias, lateral = false }) {
        super('SubquerySource', { query, alias, lateral });
    }
}
class CteRef extends Node {
    constructor({ name, alias = null }) {
        super('CteRef', { name, alias });
    }
}

/**
 * Список значений как источник: VALUES (1,'a'), (2,'b') [AS alias [(c1, c2)]].
 * Используется как FROM-источник или в INSERT ... VALUES.
 * alias/columns - опционально для использования в FROM.
 */
class ValuesList extends Node {
    constructor({
        rows = [],
        alias = null,
        columns = null,
        columnTypes = null,
    }) {
        super('ValuesList', { rows, alias, columns, columnTypes });
    }
}

/** FROM (+ массив JOIN-узлов). */
class From extends Node {
    constructor({ source, joins = [] }) {
        super('From', { source, joins });
    }
}

/**
 * JOIN: type определяет вид соединения:
 *   Логические:  'inner' | 'left' | 'right' | 'full' | 'cross'
 *   Оптимизатор: 'semi'  - SEMI JOIN (EXISTS / IN -> оптимизатор заменяет subquery)
 *                'anti'  - ANTI JOIN (NOT EXISTS / NOT IN с NOT NULL-гарантией)
 *   on:   Node | null - ON-условие
 *   using: string[] | null - USING (cols)
 *   lateral: boolean - LATERAL подзапрос
 *
 * Примечание: 'semi' и 'anti' - промежуточный физический вид, который диалект
 * по умолчанию эмулирует через EXISTS / NOT EXISTS при печати.
 */
class Join extends Node {
    constructor({
        type = 'inner',
        source,
        on = null,
        using = null,
        lateral = false,
        alias = null,
        columns = [],
    }) {
        super('Join', { type, source, on, using, lateral, alias, columns });
    }
}

/** Один элемент SELECT-списка: expr [AS alias]. */
/**
 * @class
 * @abstract Node
 */
class Projection extends Node {
    /** @param {import('../../types').IProjection} options */
    constructor({ expr, alias = null }) {
        super('Projection', { expr, alias });
    }
}

/** Один элемент ORDER BY. */
class OrderItem extends Node {
    constructor({ expr, dir = 'ASC', nulls = null }) {
        super('OrderItem', { expr, dir, nulls });
    }
}

/** GROUP BY (обычный). */
class GroupBy extends Node {
    constructor({ items = [] }) {
        super('GroupBy', { items });
    }
}

/** GROUPING SETS: items - массив массивов expressions. */
class GroupingSets extends Node {
    constructor({ sets = [] }) {
        super('GroupingSets', { sets });
    }
}

/**
 * ROLLUP(expr, expr, ...).
 * Каждый элемент может быть одиночным Node или массивом Node (для составных колонок).
 */
class Rollup extends Node {
    constructor({ items = [] }) {
        super('Rollup', { items });
    }
}

/**
 * CUBE(expr, expr, ...).
 */
class Cube extends Node {
    constructor({ items = [] }) {
        super('Cube', { items });
    }
}

/** LIMIT / OFFSET. */
class Limit extends Node {
    constructor({ limit = null, offset = null }) {
        super('Limit', { limit, offset });
    }
}

/**
 * FETCH FIRST n ROWS [ONLY|WITH TIES] - стандартный SQL (Trino, PG, ANSI).
 * count:    Node | number
 * withTies: true -> WITH TIES, false -> ONLY
 * percent:  true -> FETCH FIRST n PERCENT
 */
class FetchFirst extends Node {
    constructor({ count, withTies = false, percent = false }) {
        super('FetchFirst', { count, withTies, percent });
    }
}

/**
 * Спецификатор рамки оконной функции.
 *   units:  'rows' | 'range' | 'groups'
 *   start:  FrameBound
 *   end:    FrameBound | null - null означает BETWEEN start ONLY
 *   exclude: 'currentRow' | 'group' | 'ties' | 'noOthers' | null
 */
class Frame extends Node {
    constructor({ units = 'rows', start, end = null, exclude = null }) {
        super('Frame', { units, start, end, exclude });
    }
}

/**
 * Граница рамки: CURRENT ROW, UNBOUNDED PRECEDING/FOLLOWING, expr PRECEDING/FOLLOWING.
 *   boundKind: 'currentRow' | 'unboundedPreceding' | 'unboundedFollowing'
 *            | 'preceding' | 'following'
 *   value:    Node | null - только для 'preceding' / 'following'
 *
 * NOTE: поле намеренно называется `boundKind`, а не `kind`, чтобы не конфликтовать
 *       с дискриминатором узла AST (`kind = 'FrameBound'`).
 */
class FrameBound extends Node {
    constructor({ boundKind, value = null }) {
        super('FrameBound', { boundKind, value });
    }
}

/**
 * Именованное окно: WINDOW name AS (spec).
 *   name:        string
 *   refName:     string | null - базовое именованное окно
 *   partitionBy: Node[]
 *   orderBy:     OrderItem[]
 *   frame:       Frame | null
 */
class Window extends Node {
    constructor({
        name,
        refName = null,
        partitionBy = [],
        orderBy = [],
        frame = null,
    }) {
        super('Window', { name, refName, partitionBy, orderBy, frame });
    }
}

/**
 * FOR UPDATE / FOR SHARE / FOR NO KEY UPDATE / FOR KEY SHARE.
 *   strength: 'update' | 'noKeyUpdate' | 'share' | 'keyShare'
 *   of:       string[] - имена таблиц
 *   wait:     'nowait' | 'skipLocked' | null
 */
class ForClause extends Node {
    constructor({ strength = 'update', of = [], wait = null }) {
        super('ForClause', { strength, of, wait });
    }
}

/**
 * ON CONFLICT для INSERT.
 *   target:  { columns: string[], constraint: string|null, where: Node|null } | null
 *   action:  'nothing' | 'update'
 *   set:     Assignment[] - только для action='update'
 *   where:   Node | null - дополнительное условие для action='update'
 */
class OnConflict extends Node {
    constructor({ target = null, action = 'nothing', set = [], where = null }) {
        super('OnConflict', { target, action, set, where });
    }
}

/**
 * Элемент SET col = expr в UPDATE / ON CONFLICT ... DO UPDATE.
 *   column: string | string[] - для мульти-колоночного: (a, b) = (expr1, expr2)
 *   value:  Node
 */
class Assignment extends Node {
    constructor({ column, value }) {
        super('Assignment', { column, value });
    }
}

/**
 * RETURNING список.
 * items: Projection[] | Node[]
 */
class Returning extends Node {
    constructor({ items = [] }) {
        super('Returning', { items });
    }
}

module.exports = {
    TableSource,
    SubquerySource,
    CteRef,
    From,
    Join,
    Projection,
    OrderItem,
    GroupBy,
    GroupingSets,
    Limit,
    ValuesList,
    Rollup,
    Cube,
    FetchFirst,
    Frame,
    FrameBound,
    Window,
    ForClause,
    OnConflict,
    Assignment,
    Returning,
};
