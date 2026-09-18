'use strict';

const ast = require('../ast');

const b = {
    star: (qualifier = null, except = []) =>
        new ast.Star({ qualifier, except }),

    // ===== выражения =====
    lit: (value, type = null) => new ast.Literal({ value, type }),
    raw: (sql, bindings = []) => new ast.Raw({ sql, bindings }),
    id: (name, qualifier = null) => new ast.Identifier({ name, qualifier }),
    /**
     * Ссылка на колонку.
     * opts: { type?, nullable?, ref? } - поля для оптимизатора.
     */
    col: (name, qualifier = null, alias = null, opts = {}) =>
        new ast.Column({ name, qualifier, alias, ...opts }),
    param: (value, type = null) => new ast.Param({ value, type }),
    null_: () => new ast.Null({}),
    dataType: (name, args = [], array = false) =>
        new ast.DataType({ name, args, array }),

    bin: (op, left, right) => new ast.BinaryOp({ op, left, right }),
    not: (arg) => new ast.UnaryOp({ op: 'NOT', arg }),
    isNull: (arg) => new ast.UnaryOp({ op: 'IS NULL', arg, postfix: true }),
    isNotNull: (arg) =>
        new ast.UnaryOp({ op: 'IS NOT NULL', arg, postfix: true }),
    in: (expr, list, negate = false) => new ast.InList({ expr, list, negate }),
    between: (expr, low, high, negate = false) =>
        new ast.Between({ expr, low, high, negate }),

    /** LIKE / ILIKE / NOT LIKE. opts: { negate?, caseInsensitive?, escape?, similarTo? } */
    like: (expr, pattern, opts = {}) =>
        new ast.Like({ expr, pattern, ...opts }),

    /** EXISTS (subquery) */
    exists: (query, negate = false) => new ast.Exists({ query, negate }),

    /** expr op ANY|ALL|SOME (...) */
    quantified: (op, expr, right, quantifier = 'any') =>
        new ast.Quantified({ op, quantifier, expr, right }),

    /** (a, b) / ROW(a, b) */
    tuple: (items, explicit = false) => new ast.Tuple({ items, explicit }),

    /** obj.field / obj->'field' / etc. */
    field: (expr, field, op = '.') => new ast.FieldAccess({ expr, field, op }),

    /** INTERVAL */
    interval: (value, unit = null) => new ast.Interval({ value, unit }),

    /** expr COLLATE collation */
    collate: (expr, collation) => new ast.Collate({ expr, collation }),

    /** expr AT TIME ZONE tz */
    atTz: (expr, tz) => new ast.AtTimeZone({ expr, tz }),

    /** x -> body (CH lambda) */
    lambda: (params, body) =>
        new ast.Lambda({
            params: Array.isArray(params) ? params : [params],
            body,
        }),

    /** name => value (named argument) */
    namedArg: (name, value, style = '=>') =>
        new ast.NamedArg({ name, value, style }),

    fn: (
        name,
        args = [],
        { distinct = false, filter = null, withinGroup = null } = {}
    ) => new ast.FunctionCall({ name, args, distinct, filter, withinGroup }),
    win: (
        fn,
        { partitionBy = [], orderBy = [], frame = null, windowName = null } = {}
    ) =>
        new ast.WindowFunction({ fn, partitionBy, orderBy, frame, windowName }),
    cast: (expr, type) => new ast.Cast({ expr, type }),
    case_: (branches, elseExpr = null, subject = null) =>
        new ast.Case({ subject, branches, elseExpr }),
    arr: (items, elemType = null) => new ast.ArrayExpr({ items, elemType }),
    arr_slice: (expr, start, end) => new ast.ArraySlice({ expr, start, end }),
    arr_elem: (expr, index) => new ast.ArrayElement({ expr, index }),
    arr_last_elem: (expr, type) => new ast.ArrayLastElement({ expr, type }),
    arr_length: (expr, type) => new ast.ArrayLength({ expr, type }),
    sub: (query) => new ast.SubqueryExpr({ query }),

    // ===== узлы для оптимизатора =====

    /** COALESCE(arg1, arg2, ...) */
    coalesce: (...args) => new ast.CoalesceExpr({ args: args.flat() }),

    /** NULLIF(a, b) */
    nullIf: (a, b) => new ast.NullIfExpr({ a, b }),

    /** Явная булева константа: TRUE / FALSE / UNKNOWN */
    boolConst: (value) => new ast.BooleanConst({ value }),

    /** expr IS [NOT] TRUE/FALSE/UNKNOWN */
    isBoolTest: (expr, value, negate = false) =>
        new ast.IsBooleanTest({ expr, value, negate }),

    /** GROUPING(col1, col2, ...) для GROUPING SETS */
    groupingFn: (...args) => new ast.GroupingFunc({ args: args.flat() }),

    /** arr[index] или arr[low:high] */
    subscript: (expr, index, low = null, high = null) =>
        new ast.SubscriptExpr({ expr, index: index ?? null, low, high }),

    /**
     * Генератор строк индексов для flatguide.
     *   b.index_generator(count)
     *   count: Node | number — количество строк (N = numLevels)
     *   Алиас берётся из b.proj(b.index_generator(count), 'i')
     *
     * Диалект решает, как генерировать индексы:
     *   PG:   generate_series(1, count)
     *   CH:   arrayJoin(range(1, count + 1))
     */
    index_generator: (count) => new ast.IndexGenerator({ count }),

    /**
     * Hint-узел для оптимизатора.
     *   b.hint('SeqScan', 'users')
     *   b.hint('HashJoin', ['users', 'orders'])
     *   b.hint('Leading', ['u', 'o', 'p'])
     */
    hint: (kind, args = []) =>
        new ast.Hint({ kind, args: Array.isArray(args) ? args : [args] }),

    tag: (key, value) => new ast.Tag({ key, value }),
    tags: (list, query) => new ast.TagsList({ list, query }),

    // ===== клаузы =====
    /**
     * Источник-таблица.
     * metaOpts: { storageKind?, distribution?, partitioning?, indexes?, stats? }
     *           Поля для оптимизатора - заполняются catalog/stats-провайдером.
     */
    table: (
        name,
        {
            schema = null,
            alias = null,
            catalog = null,
            stats = null,
            partitioning = null,
            ...metaOpts
        } = {}
    ) =>
        new ast.TableSource({
            name,
            schema,
            alias,
            catalog,
            stats,
            partitioning,
            ...metaOpts,
        }),
    subsrc: (query, alias, lateral = false) =>
        new ast.SubquerySource({ query, alias, lateral }),
    cteref: (name, alias = null) => new ast.CteRef({ name, alias }),
    values: (rows, { alias = null, columns = null, columnTypes = null } = {}) =>
        new ast.ValuesList({ rows, alias, columns, columnTypes }),
    from: (source, joins = []) => new ast.From({ source, joins }),
    join: (
        type,
        source,
        on,
        using = null,
        lateral = false,
        alias = null,
        columns
    ) => new ast.Join({ type, source, on, using, lateral, alias, columns }),

    /** SEMI JOIN (оптимизатор: subquery -> semi join) */
    semiJoin: (source, on) => new ast.Join({ type: 'semi', source, on }),

    /** ANTI JOIN (оптимизатор: NOT EXISTS -> anti join) */
    antiJoin: (source, on) => new ast.Join({ type: 'anti', source, on }),

    proj: (expr, alias = null) => new ast.Projection({ expr, alias }),
    orderItem: (expr, dir = 'ASC', nulls = null) =>
        new ast.OrderItem({ expr, dir, nulls }),
    group: (items) => new ast.GroupBy({ items }),
    groupingSets: (sets) => new ast.GroupingSets({ sets }),
    rollup: (items) => new ast.Rollup({ items }),
    cube: (items) => new ast.Cube({ items }),
    limit: (limit = null, offset = null) => new ast.Limit({ limit, offset }),
    fetchFirst: (count, { withTies = false, percent = false } = {}) =>
        new ast.FetchFirst({ count, withTies, percent }),

    /** Граница рамки окна: 'currentRow'|'unboundedPreceding'|'unboundedFollowing'|'preceding'|'following' */
    frameBound: (boundKind, value = null) =>
        new ast.FrameBound({ boundKind, value }),
    frame: (units, start, end = null, exclude = null) =>
        new ast.Frame({ units, start, end, exclude }),

    /** Именованное окно (WINDOW w AS (...)) */
    window_: (
        name,
        { refName = null, partitionBy = [], orderBy = [], frame = null } = {}
    ) => new ast.Window({ name, refName, partitionBy, orderBy, frame }),

    /** FOR UPDATE / FOR SHARE */
    forClause: (strength = 'update', { of = [], wait = null } = {}) =>
        new ast.ForClause({ strength, of, wait }),

    /** ON CONFLICT */
    onConflict: (
        action = 'nothing',
        { target = null, set = [], where = null } = {}
    ) => new ast.OnConflict({ target, action, set, where }),

    /** SET col = expr */
    assign: (column, value) => new ast.Assignment({ column, value }),

    /** RETURNING items */
    returning: (items = []) => new ast.Returning({ items }),

    // ===== операторы =====
    select: (props) => new ast.Select(props),
    union: (left, right, all = true) =>
        new ast.SetOp({ op: all ? 'unionAll' : 'union', left, right }),
    intersect: (left, right, all = false) =>
        new ast.SetOp({ op: all ? 'intersectAll' : 'intersect', left, right }),
    except: (left, right, all = false) =>
        new ast.SetOp({ op: all ? 'exceptAll' : 'except', left, right }),
    cte: (name, query, options = {}) =>
        new ast.Cte({ name, query, ...options }),
    query: (body, ctes = [], hints = []) =>
        new ast.Query({ body, ctes, hints }),

    insert: (props) => new ast.Insert(props),
    update: (props) => new ast.Update(props),
    delete_: (props) => new ast.Delete(props),
    merge: (target, source, on, clauses = []) =>
        new ast.Merge({ target, source, on, clauses }),
    mergeClause: (props) => new ast.MergeClause(props),
    tempTable: (props) => new ast.CreateTempTable(props),
    drop: (props) => new ast.DropTable(props),
    createView: (props) => new ast.CreateView(props),
    dropView: (props) => new ast.DropView(props),
    truncate: (tables, { restartIdentity = false, cascade = false } = {}) =>
        new ast.Truncate({
            tables: Array.isArray(tables) ? tables : [tables],
            restartIdentity,
            cascade,
        }),

    // ── DDL: CREATE TABLE / ALTER TABLE / INDEX ──
    createTable: (props) => new ast.CreateTable(props),
    alterTable: (props) => new ast.AlterTable(props),
    createIndex: (props) => new ast.CreateIndex(props),
    dropIndex: (props) => new ast.DropIndex(props),
    columnDef: (props) => new ast.ColumnDef(props),
    tableConstraint: (props) => new ast.TableConstraint(props),

    // ===== утилиты-хэлперы для частых условий =====
    and(...parts) {
        const list = parts.filter(Boolean);
        if (!list.length) return null;
        if (list.length === 1) return list[0];
        // Flatten nested AND nodes to keep a single level
        const flat = [];
        for (const p of list) {
            if (p?.kind === 'BinaryOp' && p.op === 'AND') {
                flat.push(p.left, p.right);
            } else {
                flat.push(p);
            }
        }
        return flat.length === 1 ? flat[0] : _balanced(flat, 'AND');
    },
    or(...parts) {
        const list = parts.filter(Boolean);
        if (!list.length) return null;
        if (list.length === 1) return list[0];
        // Flatten nested OR nodes to keep a single level
        const flat = [];
        for (const p of list) {
            if (p?.kind === 'BinaryOp' && p.op === 'OR') {
                flat.push(p.left, p.right);
            } else {
                flat.push(p);
            }
        }
        return flat.length === 1 ? flat[0] : _balanced(flat, 'OR');
    },
    eq: (l, r) => new ast.BinaryOp({ op: '=', left: l, right: r }),
    ne: (l, r) => new ast.BinaryOp({ op: '<>', left: l, right: r }),
    lt: (l, r) => new ast.BinaryOp({ op: '<', left: l, right: r }),
    le: (l, r) => new ast.BinaryOp({ op: '<=', left: l, right: r }),
    gt: (l, r) => new ast.BinaryOp({ op: '>', left: l, right: r }),
    ge: (l, r) => new ast.BinaryOp({ op: '>=', left: l, right: r }),
    isDistinct: (l, r) =>
        new ast.BinaryOp({ op: 'IS DISTINCT FROM', left: l, right: r }),
    isNotDistinct: (l, r) =>
        new ast.BinaryOp({ op: 'IS NOT DISTINCT FROM', left: l, right: r }),

    // ===== хелперы для часто встречающихся агрегатов =====
    count: (expr = null) =>
        new ast.FunctionCall({
            name: 'COUNT',
            args: expr ? [expr] : [new ast.Star({})],
        }),
    countDistinct: (expr) =>
        new ast.FunctionCall({ name: 'COUNT', args: [expr], distinct: true }),
    sum: (expr) => new ast.FunctionCall({ name: 'SUM', args: [expr] }),
    avg: (expr) => new ast.FunctionCall({ name: 'AVG', args: [expr] }),
    min: (expr) => new ast.FunctionCall({ name: 'MIN', args: [expr] }),
    max: (expr) => new ast.FunctionCall({ name: 'MAX', args: [expr] }),
};

/**
 * Recursively builds a balanced BinaryOp tree from a flat array.
 * Keeps tree depth O(log N) to prevent stack overflow during dialect traversal.
 */
function _balanced(nodes, op) {
    if (nodes.length === 1) return nodes[0];
    if (nodes.length === 2)
        return new ast.BinaryOp({ op, left: nodes[0], right: nodes[1] });
    const mid = Math.ceil(nodes.length / 2);
    return new ast.BinaryOp({
        op,
        left: _balanced(nodes.slice(0, mid), op),
        right: _balanced(nodes.slice(mid), op),
    });
}

module.exports = b;
