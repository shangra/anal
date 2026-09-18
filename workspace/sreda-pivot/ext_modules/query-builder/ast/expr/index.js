'use strict';

const Node = require('../Node');

/** Литерал значения (будет спараметризован биндингом). */
class Literal extends Node {
    constructor({ value, type = null }) {
        super('Literal', { value, type });
    }
}

/** Сырой SQL-фрагмент. Диалект обязан доверять ему. Использовать редко. */
class Raw extends Node {
    constructor({ sql, bindings = [] }) {
        super('Raw', { sql, bindings });
    }
}

/** Идентификатор (имя столбца/таблицы/алиаса, не экранировано). */
class Identifier extends Node {
    constructor({ name, qualifier = null }) {
        super('Identifier', { name, qualifier });
    }
}

/**
 * Ссылка на колонку: qualifier.name AS alias?
 * type:     string | null - SQL-тип (для type-safe оптимизаций)
 * nullable: boolean | null - null = неизвестно
 * ref:      { tableId: string, columnId: string } | null - стабильные идентификаторы после
 *           разрешения имён (нужны для join-reorder и push-down в оптимизаторе)
 */
class Column extends Node {
    constructor({
        name,
        qualifier = null,
        alias = null,
        nullable = null,
        ref = null,
    }) {
        super('Column', { name, qualifier, alias, nullable, ref });
    }
}

/** Плейсхолдер для значения в подготавливаемом запросе. */
class Param extends Node {
    constructor({ value, type = null }) {
        super('Param', { value, type });
    }
}

/** Двухместный оператор (бинарный): and, or, =, <, +, etc. */
class BinaryOp extends Node {
    constructor({ op, left, right }) {
        super('BinaryOp', { op, left, right });
    }
}

/** Унарный: NOT, IS NULL, -. */
class UnaryOp extends Node {
    constructor({ op, arg, postfix = false }) {
        super('UnaryOp', { op, arg, postfix });
    }
}

/** IN / NOT IN, expr IN (list) */
class InList extends Node {
    constructor({ expr, list, negate = false }) {
        super('InList', { expr, list, negate });
    }
}

/** BETWEEN */
class Between extends Node {
    constructor({ expr, low, high, negate = false }) {
        super('Between', { expr, low, high, negate });
    }
}

/**
 * Функция (включая агрегаты): func(args).
 * filter:      Node | null - FILTER (WHERE expr) для aggregate functions (PG/standard SQL).
 * withinGroup: OrderItem[] | null - WITHIN GROUP (ORDER BY ...) для ordered-set aggregates.
 */
class FunctionCall extends Node {
    constructor({
        name,
        args = [],
        distinct = false,
        filter = null,
        withinGroup = null,
    }) {
        super('FunctionCall', { name, args, distinct, filter, withinGroup });
    }
}

/**
 * Оконная функция: func(...) OVER (PARTITION BY ... ORDER BY ... <frame>)
 * windowName: string | null - ссылка на именованное окно (OVER w), если задана - inline-спека игнорируется.
 * frame: Frame | string | null - Frame-узел или legacy-строка.
 */
class WindowFunction extends Node {
    constructor({
        fn,
        partitionBy = [],
        orderBy = [],
        frame = null,
        windowName = null,
    }) {
        super('WindowFunction', {
            fn,
            partitionBy,
            orderBy,
            frame,
            windowName,
        });
    }
}

/** CAST(expr AS type) - type: string или DataType-узел. */
class Cast extends Node {
    constructor({ expr, type }) {
        super('Cast', { expr, type });
    }
}

/**
 * CASE [subject] WHEN ... THEN ... [ELSE ...] END.
 * subject: Node | null - для "simple CASE"; branches[i] = { when: Node, then: Node }.
 */
class Case extends Node {
    constructor({ subject = null, branches = [], elseExpr = null }) {
        super('Case', { subject, branches, elseExpr });
    }
}

/**  ARRAY[...]  или clickhouse-analog. Диалект решает синтаксис. */
class ArrayExpr extends Node {
    constructor({ items = [], elemType = null }) {
        super('ArrayExpr', { items, elemType });
    }
}

/** получение элемента массива: ARRAY[...]  или clickhouse-analog. Диалект решает синтаксис. */
class ArrayElement extends Node {
    constructor({ expr, index = 1 }) {
        super('ArrayElement', { expr, index });
    }
}

/** получение последнего элемента массива: ARRAY[...]  или clickhouse-analog. Диалект решает синтаксис. */
class ArrayLastElement extends Node {
    constructor({ expr, type }) {
        super('ArrayLastElement', { expr, type });
    }
}

/** получение длины массива: ARRAY[...]  или clickhouse-analog. Диалект решает синтаксис. */
class ArrayLength extends Node {
    constructor({ expr, type = 1 }) {
        super('ArrayLength', { expr, type });
    }
}

class ArraySlice extends Node {
    constructor({ expr, start = 1, end }) {
        super('ArraySlice', { expr, start, end });
    }
}

/** Подзапрос-выражение в списке SELECT/WHERE. */
class SubqueryExpr extends Node {
    constructor({ query }) {
        super('SubqueryExpr', { query });
    }
}

// ============================================================
// Дополнительные выражения
// ============================================================

/**
 * Явный NULL. Эквивалентен Literal({value:null}), но семантически прозрачен
 * для принтера - не требует анализа значения.
 */
class Null extends Node {
    constructor(_props = {}) {
        super('Null', {});
    }
}

/**
 * Тип данных: используется в Cast, Interval, CreateTable и т.п.
 *   name:  каноничное или диалект-специфичное имя ('text', 'numeric', 'int4', …)
 *   args:  размерности/точности, напр. [38, 6] для NUMERIC(38,6)
 *   array: true -> тип[] (Postgres/GreenPlum)
 */
class DataType extends Node {
    constructor({ name, args = [], array = false }) {
        super('DataType', { name, args, array });
    }
}

/**
 * LIKE / ILIKE / NOT LIKE / SIMILAR TO.
 *   caseInsensitive: true -> ILIKE  (только PG-семейство)
 *   similarTo:       true -> SIMILAR TO (PG)
 *   escape:          Node | null  - ESCAPE '\'
 */
class Like extends Node {
    constructor({
        expr,
        pattern,
        negate = false,
        caseInsensitive = false,
        escape = null,
        similarTo = false,
    }) {
        super('Like', {
            expr,
            pattern,
            negate,
            caseInsensitive,
            escape,
            similarTo,
        });
    }
}

/**
 * EXISTS (subquery) / NOT EXISTS (subquery).
 */
class Exists extends Node {
    constructor({ query, negate = false }) {
        super('Exists', { query, negate });
    }
}

/**
 * Квантифицированное сравнение: expr op ANY|ALL|SOME (subquery | array).
 *   op:        '=' | '<>' | '<' | '<=' | '>' | '>='
 *   quantifier: 'any' | 'all' | 'some'
 *   right:     Node (Select, SubqueryExpr, ArrayExpr, …)
 */
class Quantified extends Node {
    constructor({ op, quantifier = 'any', expr, right }) {
        super('Quantified', { op, quantifier, expr, right });
    }
}

/**
 * Кортеж / ROW-выражение: (a, b) или ROW(a, b).
 * explicit: true -> печатать ключевое слово ROW перед скобками.
 * Используется в multi-column IN: (a, b) IN ((1,2),(3,4)).
 */
class Tuple extends Node {
    constructor({ items = [], explicit = false }) {
        super('Tuple', { items, explicit });
    }
}

/**
 * Доступ к полю составного типа / JSON / Map.
 *   field: string | Node  - имя поля или индексное выражение
 *   op:    '.'  | '->' | '->>' | '#>' | '#>>' | '[]'
 * Диалект определяет конкретный синтаксис.
 */
class FieldAccess extends Node {
    constructor({ expr, field, op = '.' }) {
        super('FieldAccess', { expr, field, op });
    }
}

/**
 * INTERVAL value [unit].
 *   value: string ('1 day 2 hours') или Node (выражение)
 *   unit:  'year'|'month'|'day'|'hour'|'minute'|'second'|null
 */
class Interval extends Node {
    constructor({ value, unit = null }) {
        super('Interval', { value, unit });
    }
}

/** expr COLLATE collation. */
class Collate extends Node {
    constructor({ expr, collation }) {
        super('Collate', { expr, collation });
    }
}

/** expr AT TIME ZONE tz - tz: string или Node. */
class AtTimeZone extends Node {
    constructor({ expr, tz }) {
        super('AtTimeZone', { expr, tz });
    }
}

/**
 * Лямбда / анонимная функция для ClickHouse-стиля: x -> expr, (x, y) -> expr.
 * params: string[]  - имена параметров
 * body:   Node      - тело
 */
class Lambda extends Node {
    constructor({ params = [], body }) {
        super('Lambda', { params, body });
    }
}

/**
 * Именованный аргумент функции: name => value (PG), name := value.
 * style: '=>' | ':=' | '='
 */
class NamedArg extends Node {
    constructor({ name, value, style = '=>' }) {
        super('NamedArg', { name, value, style });
    }
}

// ============================================================
// Дополнительные узлы для оптимизатора
// ============================================================

/**
 * COALESCE(arg1, arg2, ...).
 * Выделен отдельно от FunctionCall, чтобы оптимизатор мог применять
 * правила: COALESCE(NULL, x) -> x, COALESCE(x) -> x и т.д.
 */
class CoalesceExpr extends Node {
    constructor({ args = [] }) {
        super('CoalesceExpr', { args });
    }
}

/**
 * NULLIF(a, b) - выделен для constant-folding: NULLIF(x, x) -> NULL.
 */
class NullIfExpr extends Node {
    constructor({ a, b }) {
        super('NullIfExpr', { a, b });
    }
}

/**
 * Явная булева константа: TRUE / FALSE / UNKNOWN.
 * Отличается от Literal({value: true}): прозрачна для алгебраических правил
 * (x AND TRUE -> x, x OR FALSE -> x, UNKNOWN AND FALSE -> FALSE и т.д.).
 * value: true | false | 'unknown'
 */
class BooleanConst extends Node {
    constructor({ value }) {
        super('BooleanConst', { value });
    }
}

/**
 * expr IS [NOT] TRUE / FALSE / UNKNOWN.
 * Необходим для tri-valued simplification (отличается от `expr = TRUE`).
 * value: 'true' | 'false' | 'unknown'
 * negate: IS NOT ...
 */
class IsBooleanTest extends Node {
    constructor({ expr, value, negate = false }) {
        super('IsBooleanTest', { expr, value, negate });
    }
}

/**
 * GROUPING(col1, col2, ...) - обязательна для корректной работы с
 * GROUPING SETS / ROLLUP / CUBE (возвращает битовую маску).
 */
class GroupingFunc extends Node {
    constructor({ args = [] }) {
        super('GroupingFunc', { args });
    }
}

/**
 * Индексный доступ к массиву/строке:
 *   arr[index]        - index: Node, low/high: null
 *   arr[low:high]     - slice: low/high: Node | null (null = unbounded)
 * Отличается от FieldAccess по семантике (числовые индексы, а не имена полей).
 */
class SubscriptExpr extends Node {
    constructor({ expr, index = null, low = null, high = null }) {
        super('SubscriptExpr', { expr, index, low, high });
    }
}

/**
 * Оптимизаторный хинт-узел.
 * Встраивается в Query.hints[] или вставляется перед body в виде /*+ ... *\/.
 *   kind: string   - 'SeqScan' | 'IndexScan' | 'HashJoin' | 'Leading' | ...
 *   args: string[] - аргументы (псевдонимы таблиц, имена индексов и т.п.)
 * Диалект решает, как печатать (pg_hint_plan, Trino-style, игнорировать).
 */
class Hint extends Node {
    constructor({ kind, args = [] }) {
        super('Hint', { kind, args });
    }
}

/**
 * Генератор строк индексов для CROSS JOIN.
 * Используется в flatguide-запросах для разворачивания N уровней иерархии
 * в N строк.
 *
 *   count: Node | number — количество строк (N = numLevels)
 *
 * Диалект решает, как генерировать индексы:
 *   PG/GP:   generate_series(1, count)
 *   CH:      arrayJoin(range(1, count + 1))
 */
class IndexGenerator extends Node {
    constructor({ count, alias = null }) {
        super('IndexGenerator', { count, alias });
    }
}

class Tag extends Node {
    constructor({ key, value }) {
        super('Tag', { key, value });
    }
}

class TagsList extends Node {
    constructor({ list, query }) {
        super('TagList', { list, query });
    }
}

module.exports = {
    // оригинальные
    Literal,
    Raw,
    Identifier,
    Column,
    Param,
    BinaryOp,
    UnaryOp,
    InList,
    Between,
    Tag,
    TagsList,
    FunctionCall,
    WindowFunction,
    Cast,
    Case,
    ArrayExpr,
    ArrayElement,
    ArrayLength,
    ArraySlice,
    SubqueryExpr,
    ArrayLastElement,
    // расширенные
    Null,
    DataType,
    Like,
    Exists,
    Quantified,
    Tuple,
    FieldAccess,
    Interval,
    Collate,
    AtTimeZone,
    Lambda,
    NamedArg,
    // для оптимизатора
    CoalesceExpr,
    NullIfExpr,
    BooleanConst,
    IsBooleanTest,
    GroupingFunc,
    SubscriptExpr,
    Hint,
    // flatguide helpers
    IndexGenerator,
};
module.exports.Star = require('./Star');
