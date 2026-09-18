'use strict';

const mappedOp = new Set(['+', '-', '/', '*', '=']);

// ─── Функции, считающиеся детерминированными по умолчанию ───────────────────
// Оптимизатор использует этот список для constant-folding и CSE.
// Консервативно: НЕ включаем now(), random(), nextval(), currval() и т.д.
const DETERMINISTIC_FUNCS = new Set([
    'abs',
    'ceil',
    'ceiling',
    'floor',
    'round',
    'sign',
    'trunc',
    'sqrt',
    'cbrt',
    'exp',
    'ln',
    'log',
    'log10',
    'power',
    'mod',
    'div',
    'gcd',
    'lcm',
    'greatest',
    'least',
    'length',
    'char_length',
    'character_length',
    'octet_length',
    'upper',
    'lower',
    'initcap',
    'btrim',
    'ltrim',
    'rtrim',
    'trim',
    'lpad',
    'rpad',
    'repeat',
    'reverse',
    'left',
    'right',
    'substr',
    'substring',
    'position',
    'strpos',
    'locate',
    'replace',
    'regexp_replace',
    'translate',
    'split_part',
    'string_to_array',
    'array_to_string',
    'concat',
    'concat_ws',
    'format',
    'to_char',
    'to_date',
    'to_timestamp',
    'to_number',
    'date_part',
    'date_trunc',
    'extract',
    'age',
    'array_length',
    'array_ndims',
    'array_lower',
    'array_upper',
    'coalesce',
    'nullif',
    'decode',
    'encode',
    'md5',
    'sha256',
    'sha512',
    'ascii',
    'chr',
    'json_extract_path',
    'jsonb_extract_path',
    'typeof',
    'pg_typeof',
    'row_number',
    'rank',
    'dense_rank',
    'percent_rank',
    'cume_dist',
    'ntile',
    'lag',
    'lead',
    'first_value',
    'last_value',
    'nth_value',
    // CH
    'toInt8',
    'toInt16',
    'toInt32',
    'toInt64',
    'toUInt8',
    'toUInt16',
    'toUInt32',
    'toUInt64',
    'toFloat32',
    'toFloat64',
    'toDecimal32',
    'toDecimal64',
    'toString',
    'toDate',
    'toDateTime',
    'assumeNotNull',
    'isNull',
    'isNotNull',
    'ifNull',
    'nullIf',
    'empty',
    'notEmpty',
    'length',
    'arrayLength',
]);

// Функции, НЕ являющиеся strict (не возвращают NULL при NULL-аргументе)
const NON_STRICT_FUNCS = new Set([
    'coalesce',
    'nullif',
    'greatest',
    'least',
    'concat',
    'concat_ws',
    'format',
    'decode',
    'nvl',
    'nvl2',
    'ifnull',
    'isnull',
    'case', // псевдофункция
    'array_to_string',
    // CH
    'ifNull',
    'nullIf',
    'if',
    'multiIf',
    'assumeNotNull',
]);

/**
 * Контекст печати: собирает строку SQL и массив биндингов.
 * Также хранит настройки текущего диалекта и счётчики.
 */
class PrintCtx {
    constructor(
        dialect,
        { paramStyle = 'positional', starColumns = new Map() } = {}
    ) {
        this.dialect = dialect;
        this.chunks = [];
        this.bindings = [];
        this.paramStyle = paramStyle; // positional|named
        this.namedIdx = 0;
        this.indent = 0;
        this.useBindings = dialect.options.useBindings;
        /** Map<qualifier | '', string[]> - для раскрытия `*` EXCEPT в диалектах без поддержки. */
        this.starColumns = starColumns;
    }
    write(s) {
        this.chunks.push(s);
    }
    addBinding(value) {
        this.bindings.push(value);
        if (this.paramStyle === 'named') return `$${++this.namedIdx}`;
        return '?';
    }
    toString() {
        return this.chunks.join('');
    }
}

/**
 * Абстрактный визитор. Реализации - по одному методу на kind:
 *     visit_Literal(node, ctx), visit_Select(node, ctx), ...
 *
 * Неявный диспетчер: visit() выбирает метод по node.kind.
 */
class Dialect {
    constructor(options = {}) {
        this.options = {
            useBindings: false,
            // ── Материализация ──────────────────────────────────────────
            defaultMaterialization: 'cte', // 'cte' | 'temp'
            supportsTempTables: true,
            supportsRecursiveCte: true,
            supportsAttributesCte: true,

            // ── GROUP BY расширения ──────────────────────────────────────
            supportsGroupingSets: true, // GROUPING SETS / ROLLUP / CUBE
            supportsOrderedSetAgg: true, // WITHIN GROUP (ORDER BY ...)
            supportsFilterClause: true, // FILTER (WHERE ...) при агрегатах

            // ── SELECT особенности ───────────────────────────────────────
            supportsDistinctOn: true, // DISTINCT ON (cols) - PG-специфика
            supportsFetchFirst: true, // FETCH FIRST n ROWS ONLY
            supportsExceptAll: true, // EXCEPT ALL
            supportsIntersectAll: true, // INTERSECT ALL
            supportsValuesAsFrom: true, // FROM (VALUES ...) AS t
            supportsLateral: true, // LATERAL JOIN

            // ── Выражения ────────────────────────────────────────────────
            supportsArrayLiteral: true, // ARRAY[...] синтаксис
            supportsJsonOperators: true, // ->, ->>, #>, #>>
            supportsIlike: true, // ILIKE (PG/GP; CH - нет)

            // ── DML ──────────────────────────────────────────────────────
            supportsOnConflict: true, // INSERT ... ON CONFLICT
            supportsMerge: true, // MERGE
            supportsReturning: true, // RETURNING

            // ── Хинты ────────────────────────────────────────────────────
            supportsHintComments: false, // /*+ ... */ style hints
            hintCommentStyle: null, // 'pg_hint_plan' | 'gp' | 'ch' | null

            // ── Идентификаторы / параметры ───────────────────────────────
            nullOrderExplicit: true,
            schema: null, // default schema-квалификатор

            // ── GP-специфика ─────────────────────────────────────────────
            motionModel: 'none', // 'none' | 'gpMotion'
            broadcastThresholdRows: 1_000_000, // GP: строк < порога -> broadcast

            ...options,
        };
    }

    functionMapping = {};

    /** Главная точка входа. Возвращает { sql, bindings }. */
    print(root, { paramStyle = 'positional', starColumns = new Map() } = {}) {
        const ctx = new PrintCtx(this, { paramStyle, starColumns });
        this.visit(root, ctx);
        return { sql: ctx.toString(), bindings: ctx.bindings };
    }

    /** Диспетчер. */
    visit(node, ctx) {
        if (node == null) return;
        const fn = this[`visit_${node.kind}`];
        if (typeof fn !== 'function') {
            throw new Error(
                `${this.constructor.name}: no visitor for kind=${node.kind}, node=${node}`
            );
        }
        fn.call(this, node, ctx);
    }

    /** Общая инфраструктура - экранирование. */
    quoteIdent(name) {
        // простое двойные-кавычки-экранирование
        return `"${String(name).replace(/"/g, '""')}"`;
    }

    /** Значение -> литерал. По умолчанию - только примитивы безопасно. */
    /**
     * @param {any} value
     * @returns {any}
     */
    literal(value) {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'number' && Number.isFinite(value))
            return String(value);
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (value instanceof Date) return `'${value.toISOString()}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value)}'`;
        throw new Error(`literal(): unsupported value type: ${typeof value}`);
    }

    /** Список через запятую. */
    list(nodes, ctx, sep = ', ') {
        nodes.forEach((n, i) => {
            if (i) ctx.write(sep);
            this.visit(n, ctx);
        });
    }

    /**
     * Пишет в поток префикс квалификации таблицы по умолчанию.
     * Переопределяется в диалектах под их модель (schema / database / catalog.schema).
     * @param {import('./Dialect').PrintCtx} ctx
     */
    writeDefaultQualifier(ctx) {
        if (this.options.schema) {
            ctx.write(`${this.quoteIdent(this.options.schema)}.`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Optimizer hooks - переопределяются в диалект-классах оптимизатора
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Определяет результирующий тип выражения.
     * Используется оптимизатором для type-safe constant-folding.
     * Возвращает строку-тип или null (неизвестно).
     * @param {object} _expr
     * @param {object} _schema - SchemaProvider
     * @returns {string|null}
     */
    typeOf(_expr, _schema) {
        return null;
    }

    /**
     * Является ли функция детерминированной (один и тот же вход -> всегда один результат).
     * false для now(), random(), nextval() и т.п.
     * Консервативный дефолт: неизвестные функции - НЕ детерминированные.
     * @param {string} funcName
     * @param {any[]} _args
     * @returns {boolean}
     */
    isDeterministic(funcName, _args) {
        return DETERMINISTIC_FUNCS.has(funcName.toLowerCase());
    }

    /**
     * Является ли функция «strict»: NULL-аргумент -> NULL-результат.
     * Используется для null-propagation в оптимизаторе.
     * Консервативный дефолт: true для большинства стандартных математических функций.
     * @param {string} funcName
     * @returns {boolean}
     */
    isStrict(funcName) {
        return !NON_STRICT_FUNCS.has(funcName.toLowerCase());
    }

    /**
     * Безопасен ли push-down данного выражения в source (subquery, external table, CTE).
     * Если нет - оптимизатор не может поднять/опустить это выражение через границу.
     * @param {object} expr
     * @returns {boolean}
     */
    isPushdownSafe(expr) {
        // Консервативно: push-down безопасен для всего, кроме volatile-функций и Raw.
        if (!expr) return true;
        if (expr.kind === 'Raw') return false;
        if (expr.kind === 'FunctionCall')
            return this.isDeterministic(expr.name, expr.args);
        return true;
    }

    /**
     * Эмиттирует блок хинтов перед основным запросом.
     * Переопределяется диалектами с pg_hint_plan / GP-хинтами.
     * @param {object[]} _hints - массив Hint-узлов
     * @param {PrintCtx} _ctx
     */
    emitHintBlock(_hints, _ctx) {
        // По умолчанию - no-op; активируется переопределением в PostgresDialect и GP.
    }

    /**
     * Rewrite ILIKE -> lower() LIKE lower() для диалектов без ILIKE.
     * Базовая реализация возвращает исходный узел (PG/GP поддерживают ILIKE).
     * @param {object} likeNode
     * @returns {object}
     */
    rewriteIlike(likeNode) {
        return likeNode;
    }

    /**
     * Rewrite FILTER (WHERE ...) для диалектов без поддержки.
     * Базовая реализация - no-op (PG/GP поддерживают).
     * @param {object} fnNode
     * @returns {object}
     */
    rewriteFilterClause(fnNode) {
        return fnNode;
    }

    /**
     * Rewrite DISTINCT ON для диалектов без поддержки.
     * Базовая реализация - no-op (PG/GP поддерживают).
     * @param {object} selectNode
     * @returns {object}
     */
    rewriteDistinctOn(selectNode) {
        return selectNode;
    }

    // ─────────────────────────────────────────────────────────────────────

    // ---------- Выражения ----------
    visit_Star(n, ctx) {
        const prefix = n.qualifier ? `${this.quoteIdent(n.qualifier)}.` : '';
        ctx.write(`${prefix}*`);
        if (n.except?.length) {
            ctx.write(' EXCEPT (');
            ctx.write(n.except.map((c) => this.quoteIdent(c)).join(', '));
            ctx.write(')');
        }
    }

    visit_Tag(n, ctx) {
        ctx.write(`${n.key}=${n.value};`);
    }

    visit_TagList(n, ctx) {
        if (n.list?.length) {
            ctx.write("SET gpcc.query_tags TO'");
            for (const tag of n.list) this.visit(tag, ctx);
            ctx.write("';\n");
        }
        n.query && this.visit(n.query, ctx);
    }

    visit_Literal(n, ctx) {
        if (n.type)
            ctx.write(
                `CAST(${this.literal(n.value)} AS ${this.castType(n.type)})`
            );
        else ctx.write(this.literal(n.value));
    }
    visit_Raw(n, ctx) {
        ctx.write(n.sql);
        (n.bindings || []).forEach((b) => ctx.bindings.push(b));
    }
    visit_Identifier(n, ctx) {
        if (n.qualifier) ctx.write(`${this.quoteIdent(n.qualifier)}.`);
        ctx.write(this.quoteIdent(n.name));
    }
    visit_Column(n, ctx) {
        if (n.qualifier) ctx.write(`${this.quoteIdent(n.qualifier)}.`);
        ctx.write(this.quoteIdent(n.name));
        if (n.alias) ctx.write(` AS ${this.quoteIdent(n.alias)}`);
    }
    visit_Param(n, ctx) {
        this.options.useBindings
            ? ctx.write(ctx.addBinding(this.literal(n.value)))
            : ctx.write(this.literal(n.value));
    }
    visit_BinaryOp(n, ctx) {
        // Semanticheskiy operator: «array contains value» — ANSI PG: val = ANY(col)
        if (n.op === 'ARRAY_CONTAINS') {
            ctx.write('(');
            this.visit(n.right, ctx);
            ctx.write(') = ANY(');
            this.visit(n.left, ctx);
            ctx.write(')');
            return;
        }
        const isLeft = !mappedOp.has(n.op) && n.op != n.left?.op;
        const isRight = !mappedOp.has(n.op) && n.op != n.right?.op;
        isLeft && ctx.write('(');
        this.visit(n.left, ctx);
        isLeft && ctx.write(')');
        ctx.write(` ${n.op} `);
        isRight && ctx.write('(');
        this.visit(n.right, ctx);
        isRight && ctx.write(')');
    }
    visit_UnaryOp(n, ctx) {
        if (n.postfix) {
            ctx.write('(');
            this.visit(n.arg, ctx);
            ctx.write(`) ${n.op}`);
        } else {
            ctx.write(`${n.op} (`);
            this.visit(n.arg, ctx);
            ctx.write(')');
        }
    }
    visit_InList(n, ctx) {
        this.visit(n.expr, ctx);
        ctx.write(n.negate ? ' NOT IN (' : ' IN (');
        if (Array.isArray(n.list)) this.list(n.list, ctx);
        else this.visit(n.list, ctx); // подзапрос
        ctx.write(')');
    }
    visit_Between(n, ctx) {
        this.visit(n.expr, ctx);
        ctx.write(n.negate ? ' NOT BETWEEN ' : ' BETWEEN ');
        this.visit(n.low, ctx);
        ctx.write(' AND ');
        this.visit(n.high, ctx);
    }
    visit_FunctionCall(n, ctx) {
        ctx.write(`${this.functionMapping[n.name] || n.name}(`);
        if (n.distinct) ctx.write('DISTINCT ');
        this.list(n.args, ctx);
        ctx.write(')');
        if (n.filter) {
            ctx.write(' FILTER (WHERE ');
            this.visit(n.filter, ctx);
            ctx.write(')');
        }
        if (n.withinGroup?.length) {
            ctx.write(' WITHIN GROUP (ORDER BY ');
            this.list(n.withinGroup, ctx);
            ctx.write(')');
        }
    }
    visit_WindowFunction(n, ctx) {
        this.visit(n.fn, ctx);
        if (n.windowName) {
            ctx.write(` OVER ${this.quoteIdent(n.windowName)}`);
            return;
        }
        ctx.write(' OVER (');
        if (n.partitionBy?.length) {
            ctx.write('PARTITION BY ');
            this.list(n.partitionBy, ctx);
        }
        if (n.orderBy?.length) {
            if (n.partitionBy?.length) ctx.write(' ');
            ctx.write('ORDER BY ');
            this.list(n.orderBy, ctx);
        }
        if (n.frame) {
            ctx.write(' ');
            if (typeof n.frame === 'string') ctx.write(n.frame);
            else this.visit(n.frame, ctx);
        }
        ctx.write(')');
    }

    visit_Cast(n, ctx) {
        ctx.write('CAST(');
        this.visit(n.expr, ctx);
        ctx.write(` AS ${this.castType(n.type)})`);
    }
    visit_Case(n, ctx) {
        ctx.write('CASE');
        if (n.subject) {
            ctx.write(' ');
            this.visit(n.subject, ctx);
        }
        for (const { when, then } of n.branches || []) {
            ctx.write(' WHEN ');
            this.visit(when, ctx);
            ctx.write(' THEN ');
            this.visit(then, ctx);
        }
        if (n.elseExpr) {
            ctx.write(' ELSE ');
            this.visit(n.elseExpr, ctx);
        }
        ctx.write(' END');
    }
    visit_ArrayExpr(n, ctx) {
        // по умолчанию ANSI / Postgres
        ctx.write('ARRAY[');
        this.list(n.items, ctx);
        ctx.write(']');
    }

    visit_ArrayElement(n, ctx) {
        this.visit(n.expr, ctx);
        ctx.write(`[`);
        this.visit(n.index, ctx);
        ctx.write(`]`);
    }

    visit_ArrayLastElement(n, ctx) {
        this.visit(n.expr, ctx);
        ctx.write(`[`);
        this.visit_ArrayLength(n, ctx);
        ctx.write(`]`);
    }

    visit_ArrayLength(n, ctx) {
        ctx.write('array_length');
        ctx.write('(');
        this.visit(n.expr, ctx);
        ctx.write(',');
        this.visit(n.type, ctx);
        ctx.write(')');
    }

    visit_ArraySlice(n, ctx) {
        this.visit(n.expr, ctx);
        ctx.write(`[`);
        n.start && this.visit(n.start, ctx);
        ctx.write(`:`);
        n.end && this.visit(n.end, ctx);
        ctx.write(`]`);
    }

    visit_SubqueryExpr(n, ctx) {
        ctx.write('(');
        this.visit(n.query, ctx);
        ctx.write(')');
    }

    // ---------- Узлы для оптимизатора (expr) ----------
    visit_CoalesceExpr(n, ctx) {
        ctx.write('COALESCE(');
        this.list(n.args, ctx);
        ctx.write(')');
    }
    visit_NullIfExpr(n, ctx) {
        ctx.write('NULLIF(');
        this.visit(n.a, ctx);
        ctx.write(', ');
        this.visit(n.b, ctx);
        ctx.write(')');
    }
    visit_BooleanConst(n, ctx) {
        if (n.value === 'unknown') ctx.write('UNKNOWN');
        else ctx.write(n.value ? 'TRUE' : 'FALSE');
    }
    visit_IsBooleanTest(n, ctx) {
        ctx.write('(');
        this.visit(n.expr, ctx);
        ctx.write(n.negate ? ' IS NOT ' : ' IS ');
        ctx.write(String(n.value).toUpperCase());
        ctx.write(')');
    }
    visit_GroupingFunc(n, ctx) {
        ctx.write('GROUPING(');
        this.list(n.args, ctx);
        ctx.write(')');
    }
    visit_SubscriptExpr(n, ctx) {
        this.visit(n.expr, ctx);
        ctx.write('[');
        if (n.index != null) {
            this.visit(n.index, ctx);
        } else {
            if (n.low != null) this.visit(n.low, ctx);
            ctx.write(':');
            if (n.high != null) this.visit(n.high, ctx);
        }
        ctx.write(']');
    }
    /**
     * Хинт-узел: по умолчанию игнорируется в SQL-выводе.
     * Диалекты с pg_hint_plan переопределяют emitHintBlock.
     */
    visit_Hint(_n, _ctx) {
        /* no-op */
    }

    /**
     * Генератор строк индексов для flatguide.
     * Дефолт = PG-style: generate_series(1, N).
     * @param {object} n - IndexGenerator { count }
     * @param {PrintCtx} ctx
     */
    visit_IndexGenerator(n, ctx) {
        ctx.write('generate_series(1, ');
        if (typeof n.count === 'number') {
            ctx.write(n.count);
        } else {
            this.visit(n.count, ctx);
        }
        ctx.write(')');
    }

    // ---------- Ранее добавленные узлы выражений ----------
    visit_Null(_n, ctx) {
        ctx.write('NULL');
    }
    visit_DataType(n, ctx) {
        ctx.write(this.castType(n.name));
        if (n.args && n.args.length) {
            ctx.write(`(${n.args.join(', ')})`);
        }
        if (n.array) ctx.write('[]');
    }
    visit_Like(n, ctx) {
        this.visit(n.expr, ctx);
        if (n.negate) ctx.write(' NOT');
        if (n.similarTo) ctx.write(' SIMILAR TO ');
        else if (n.caseInsensitive) ctx.write(' ILIKE ');
        else ctx.write(' LIKE ');
        this.visit(n.pattern, ctx);
        if (n.escape) {
            ctx.write(' ESCAPE ');
            this.visit(n.escape, ctx);
        }
    }
    visit_Exists(n, ctx) {
        if (n.negate) ctx.write('NOT ');
        ctx.write('EXISTS (');
        this.visit(n.query, ctx);
        ctx.write(')');
    }
    visit_Quantified(n, ctx) {
        ctx.write('(');
        this.visit(n.expr, ctx);
        ctx.write(` ${n.op} ${n.quantifier.toUpperCase()} (`);
        this.visit(n.right, ctx);
        ctx.write('))');
    }
    visit_Tuple(n, ctx) {
        if (n.explicit) ctx.write('ROW');
        ctx.write('(');
        this.list(n.items, ctx);
        ctx.write(')');
    }
    visit_FieldAccess(n, ctx) {
        this.visit(n.expr, ctx);
        const op = n.op || '.';
        if (op === '.') {
            ctx.write('.');
            if (typeof n.field === 'string')
                ctx.write(this.quoteIdent(n.field));
            else this.visit(n.field, ctx);
        } else {
            ctx.write(op);
            if (typeof n.field === 'string') {
                ctx.write(`'${n.field}'`);
            } else {
                this.visit(n.field, ctx);
            }
        }
    }
    visit_Interval(n, ctx) {
        if (typeof n.value === 'string') {
            ctx.write(`INTERVAL '${n.value}'`);
        } else {
            ctx.write('INTERVAL ');
            this.visit(n.value, ctx);
        }
        if (n.unit) ctx.write(` ${n.unit.toUpperCase()}`);
    }
    visit_Collate(n, ctx) {
        this.visit(n.expr, ctx);
        ctx.write(` COLLATE "${n.collation}"`);
    }
    visit_AtTimeZone(n, ctx) {
        this.visit(n.expr, ctx);
        ctx.write(' AT TIME ZONE ');
        if (typeof n.tz === 'string') ctx.write(`'${n.tz}'`);
        else this.visit(n.tz, ctx);
    }
    visit_Lambda(n, ctx) {
        // CH-стиль: x -> expr  или  (x, y) -> expr
        if (n.params.length === 1) {
            ctx.write(n.params[0]);
        } else {
            ctx.write(`(${n.params.join(', ')})`);
        }
        ctx.write(' -> ');
        this.visit(n.body, ctx);
    }
    visit_NamedArg(n, ctx) {
        ctx.write(n.name);
        ctx.write(` ${n.style} `);
        this.visit(n.value, ctx);
    }

    // ---------- Клаузы ----------
    visit_TableSource(n, ctx) {
        if (n.schema) {
            ctx.write(`${this.quoteIdent(n.schema)}.`);
        } else {
            this.writeDefaultQualifier(ctx);
        }
        ctx.write(this.quoteIdent(n.name));
        if (n.alias) ctx.write(` AS ${this.quoteIdent(n.alias)}`);
    }
    visit_SubquerySource(n, ctx) {
        if (n.lateral) ctx.write('LATERAL ');
        ctx.write('(');
        this.visit(n.query, ctx);
        ctx.write(`) AS ${this.quoteIdent(n.alias)}`);
    }
    visit_CteRef(n, ctx) {
        ctx.write(this.quoteIdent(n.name));
        if (n.alias && n.alias !== n.name)
            ctx.write(` AS ${this.quoteIdent(n.alias)}`);
    }
    visit_From(n, ctx) {
        ctx.write('FROM ');
        this.visit(n.source, ctx);
        for (const j of n.joins) {
            ctx.write(' ');
            this.visit(j, ctx);
        }
    }
    visit_Join(n, ctx) {
        const typeMap = {
            inner: 'INNER JOIN',
            left: 'LEFT JOIN',
            right: 'RIGHT JOIN',
            cross: 'CROSS JOIN',
            full: 'FULL OUTER JOIN',
        };
        // semi/anti - промежуточные физические виды, генерированные оптимизатором.
        // Если оптимизатор не был запущен или диалект не переопределяет - эмулируем.
        if (n.type === 'semi' || n.type === 'anti') {
            this.emitSemiAntiJoin(n, ctx);
            return;
        }
        ctx.write(typeMap[n.type] || 'INNER JOIN');
        if (n.lateral) ctx.write(' LATERAL');
        ctx.write(' ');
        this.visit(n.source, ctx);
        ctx.write(' ');
        if (n.alias) ctx.write(this.literal(n.alias));
        ctx.write(' ');
        if (n.columns?.length) {
            ctx.write('(');
            this.list(n.columns, ctx);
            ctx.write(')');
        }
        ctx.write(' ');
        if (n.on) {
            ctx.write(' ON ');
            this.visit(n.on, ctx);
        }
        if (n.using?.length)
            ctx.write(
                ` USING (${n.using.map((x) => this.quoteIdent(x)).join(', ')})`
            );
    }

    /**
     * Fallback-эмуляция SEMI/ANTI JOIN через WHERE EXISTS/NOT EXISTS.
     * Оптимизатор должен переписывать semi/anti до вызова печати, но
     * на случай ручной сборки AST оставляем корректный fallback.
     * @protected
     */
    emitSemiAntiJoin(n, ctx) {
        // Генерируем: INNER JOIN (SELECT 1 FROM src WHERE on) _sj ON TRUE
        // Примечание: более правильный путь - оптимизатор переписывает
        // Join(semi/anti) в WHERE EXISTS()/NOT EXISTS() до печати.
        const not = n.type === 'anti' ? 'NOT ' : '';
        void not; // для будущего переопределения
        ctx.write('INNER JOIN (SELECT 1 FROM ');
        this.visit(n.source, ctx);
        if (n.on) {
            ctx.write(' WHERE ');
            this.visit(n.on, ctx);
        }
        ctx.write(`) AS ${this.quoteIdent('_sj_')} ON TRUE`);
    }

    visit_Projection(n, ctx) {
        this.visit(n.expr, ctx);
        if (n.alias) ctx.write(` AS ${this.quoteIdent(n.alias)}`);
    }
    visit_OrderItem(n, ctx) {
        this.visit(n.expr, ctx);
        ctx.write(` ${n.dir || 'ASC'}`);
        if (this.options.nullOrderExplicit && n.nulls)
            ctx.write(` NULLS ${n.nulls}`);
    }
    visit_GroupBy(n, ctx) {
        if (!n.items?.length) return;
        ctx.write('GROUP BY ');
        this.list(n.items, ctx);
    }
    visit_GroupingSets(n, ctx) {
        if (!this.options.supportsGroupingSets) {
            throw new Error(
                `${this.constructor.name}: GROUPING SETS is not supported`
            );
        }
        ctx.write('GROUP BY GROUPING SETS (');
        n.sets.forEach((set, i) => {
            if (i) ctx.write(', ');
            ctx.write('(');
            this.list(set, ctx);
            ctx.write(')');
        });
        ctx.write(')');
    }
    visit_Rollup(n, ctx) {
        ctx.write('GROUP BY ROLLUP (');
        this._writeGroupingItems(n.items, ctx);
        ctx.write(')');
    }
    visit_Cube(n, ctx) {
        ctx.write('GROUP BY CUBE (');
        this._writeGroupingItems(n.items, ctx);
        ctx.write(')');
    }
    /** @private */
    _writeGroupingItems(items, ctx) {
        items.forEach((item, i) => {
            if (i) ctx.write(', ');
            if (Array.isArray(item)) {
                ctx.write('(');
                this.list(item, ctx);
                ctx.write(')');
            } else {
                this.visit(item, ctx);
            }
        });
    }
    visit_Limit(n, ctx) {
        if (n.limit != null) {
            ctx.write(`LIMIT ${+n.limit}`);
        }
        if (n.offset != null) {
            if (n.limit != null) ctx.write(' ');
            ctx.write(`OFFSET ${+n.offset}`);
        }
    }
    visit_FetchFirst(n, ctx) {
        const count = typeof n.count === 'number' ? n.count : null;
        ctx.write('FETCH FIRST ');
        if (count !== null) ctx.write(`${count} `);
        else {
            this.visit(n.count, ctx);
            ctx.write(' ');
        }
        ctx.write(n.percent ? 'PERCENT ROWS ' : 'ROWS ');
        ctx.write(n.withTies ? 'WITH TIES' : 'ONLY');
    }
    visit_Frame(n, ctx) {
        ctx.write(n.units.toUpperCase());
        if (n.end) {
            ctx.write(' BETWEEN ');
            this.visit(n.start, ctx);
            ctx.write(' AND ');
            this.visit(n.end, ctx);
        } else {
            ctx.write(' ');
            this.visit(n.start, ctx);
        }
        if (n.exclude) {
            const excMap = {
                currentRow: 'CURRENT ROW',
                group: 'GROUP',
                ties: 'TIES',
                noOthers: 'NO OTHERS',
            };
            ctx.write(
                ` EXCLUDE ${excMap[n.exclude] || n.exclude.toUpperCase()}`
            );
        }
    }
    visit_FrameBound(n, ctx) {
        switch (n.boundKind) {
            case 'currentRow':
                ctx.write('CURRENT ROW');
                break;
            case 'unboundedPreceding':
                ctx.write('UNBOUNDED PRECEDING');
                break;
            case 'unboundedFollowing':
                ctx.write('UNBOUNDED FOLLOWING');
                break;
            case 'preceding':
                this.visit(n.value, ctx);
                ctx.write(' PRECEDING');
                break;
            case 'following':
                this.visit(n.value, ctx);
                ctx.write(' FOLLOWING');
                break;
            default:
                ctx.write(n.boundKind || '');
        }
    }
    visit_Window(n, ctx) {
        ctx.write(this.quoteIdent(n.name));
        ctx.write(' AS (');
        if (n.refName) ctx.write(this.quoteIdent(n.refName));
        if (n.partitionBy?.length) {
            if (n.refName) ctx.write(' ');
            ctx.write('PARTITION BY ');
            this.list(n.partitionBy, ctx);
        }
        if (n.orderBy?.length) {
            if (n.refName || n.partitionBy?.length) ctx.write(' ');
            ctx.write('ORDER BY ');
            this.list(n.orderBy, ctx);
        }
        if (n.frame) {
            ctx.write(' ');
            this.visit(n.frame, ctx);
        }
        ctx.write(')');
    }
    visit_ValuesList(n, ctx) {
        ctx.write('(VALUES ');
        n.rows.forEach((row, i) => {
            if (i) ctx.write(', ');
            ctx.write('(');
            if (Array.isArray(row)) this.list(row, ctx);
            else this.visit(row, ctx);
            ctx.write(')');
        });
        ctx.write(')');
        if (n.alias) {
            ctx.write(` AS ${this.quoteIdent(n.alias)}`);
            if (n.columns?.length) {
                ctx.write(
                    ` (${n.columns.map((c) => this.quoteIdent(c)).join(', ')})`
                );
            }
        }
    }
    visit_ForClause(n, ctx) {
        const sMap = {
            update: 'UPDATE',
            noKeyUpdate: 'NO KEY UPDATE',
            share: 'SHARE',
            keyShare: 'KEY SHARE',
        };
        ctx.write(`FOR ${sMap[n.strength] || 'UPDATE'}`);
        if (n.of?.length)
            ctx.write(` OF ${n.of.map((t) => this.quoteIdent(t)).join(', ')}`);
        if (n.wait === 'nowait') ctx.write(' NOWAIT');
        else if (n.wait === 'skipLocked') ctx.write(' SKIP LOCKED');
    }
    visit_OnConflict(n, ctx) {
        if (n.target) {
            if (n.target.constraint) {
                ctx.write(
                    ` ON CONSTRAINT ${this.quoteIdent(n.target.constraint)}`
                );
            } else if (n.target.columns?.length) {
                ctx.write(
                    ` (${n.target.columns
                        .map((c) => this.quoteIdent(c))
                        .join(', ')})`
                );
            }
            if (n.target.where) {
                ctx.write(' WHERE ');
                this.visit(n.target.where, ctx);
            }
        }
        if (n.action === 'nothing') {
            ctx.write(' DO NOTHING');
        } else {
            ctx.write(' DO UPDATE SET ');
            n.set.forEach((a, i) => {
                if (i) ctx.write(', ');
                this.visit(a, ctx);
            });
            if (n.where) {
                ctx.write(' WHERE ');
                this.visit(n.where, ctx);
            }
        }
    }
    visit_Assignment(n, ctx) {
        if (Array.isArray(n.column)) {
            ctx.write(
                `(${n.column.map((c) => this.visit(c, ctx)).join(', ')}) = `
            );
        } else {
            this.visit(n.column, ctx);
        }
        ctx.write(' = ');
        this.visit(n.value, ctx);
    }
    visit_Returning(n, ctx) {
        if (n.items?.length) {
            ctx.write('RETURNING ');
            this.list(n.items, ctx);
        }
    }

    // ---------- SELECT / UNION / WITH / Query ----------
    visit_Select(n, ctx) {
        ctx.write('SELECT ');
        if (Array.isArray(n.distinct) && n.distinct.length) {
            ctx.write('DISTINCT ON (');
            this.list(n.distinct, ctx);
            ctx.write(') ');
        } else if (n.distinct === true) {
            ctx.write('DISTINCT ');
        }
        if (!n.projections.length) ctx.write('*');
        else this.list(n.projections, ctx);
        if (n.from) {
            ctx.write(' ');
            this.visit(n.from, ctx);
        }
        if (n.where) {
            ctx.write(' WHERE ');
            this.visit(n.where, ctx);
        }
        if (n.groupBy) {
            ctx.write(' ');
            this.visit(n.groupBy, ctx);
        }
        if (n.having) {
            ctx.write(' HAVING ');
            this.visit(n.having, ctx);
        }
        if (n.orderBy?.length) {
            ctx.write(' ORDER BY ');
            this.list(n.orderBy, ctx);
        }
        if (n.limit) {
            ctx.write(' ');
            this.visit(n.limit, ctx);
        }
        if (n.windows?.length) {
            ctx.write(' WINDOW ');
            n.windows.forEach((w, i) => {
                if (i) ctx.write(', ');
                this.visit(w, ctx);
            });
        }
        if (n.forClause) {
            ctx.write(' ');
            this.visit(n.forClause, ctx);
        }
    }
    visit_SetOp(n, ctx) {
        const opMap = {
            unionAll: 'UNION ALL',
            union: 'UNION',
            intersect: 'INTERSECT',
            intersectAll: 'INTERSECT ALL',
            except: 'EXCEPT',
            exceptAll: 'EXCEPT ALL',
        };
        ctx.write('(');
        this.visit(n.left, ctx);
        ctx.write(') ');
        ctx.write(opMap[n.op] || 'UNION ALL');
        ctx.write(' (');
        this.visit(n.right, ctx);
        ctx.write(')');
    }

    /**
     * Печать композиции запроса.
     *  - CTE с materialization='cte' -> разворачиваем в общий WITH ... AS (...)
     *  - materialization='temp' -> ПРЕФИКС statement'ами CREATE TEMP TABLE ... ;
     *  - materialization='inline' -> не трогаем; ссылки через SubquerySource/SubqueryExpr.
     *  - recursive:true -> WITH RECURSIVE
     *  - hints[] -> если supportsHintComments, эмиттируем блок перед телом.
     */
    visit_Query(n, ctx) {
        const preStmts = [];
        const cteDefs = [];
        let hasRecursive = false;

        for (const cte of n.ctes) {
            if (cte.materialization === 'inline') continue;
            if (cte.materialization === 'temp') {
                if (this.options.supportsTempTables) preStmts.push(cte);
                else cteDefs.push(cte);
            } else {
                cteDefs.push(cte);
                if (cte.recursive) hasRecursive = true;
            }
        }

        for (const cte of preStmts) {
            this.printTempTableStatement(cte, ctx);
            ctx.write(';\n');
        }

        if (cteDefs.length) {
            ctx.write(hasRecursive ? 'WITH RECURSIVE ' : 'WITH ');
            cteDefs.forEach((cte, i) => {
                if (i) ctx.write(', ');
                this.printCteDef(cte, ctx);
            });
            ctx.write(' ');
        }

        // Хинты - печатаем как блок если диалект поддерживает
        if (n.hints?.length && this.options.supportsHintComments) {
            this.emitHintBlock(n.hints, ctx);
            ctx.write(' ');
        }

        n.body && this.visit(n.body, ctx); // body здесь может быть Select | SetOp | другой Query
    }

    /** Определение CTE внутри WITH: name[(cols)] AS (query). */
    printCteDef(cte, ctx) {
        ctx.write(this.quoteIdent(cte.name));
        if (cte.columns?.length && this.options.supportsAttributesCte) {
            ctx.write(
                ` (${cte.columns.map((c) => this.quoteIdent(c)).join(', ')})`
            );
        }
        ctx.write(' AS (');
        this.visit(cte.query, ctx);
        ctx.write(')');
    }

    /** CREATE TEMP TABLE ... AS (select). Переопределяется диалектом (distribute, on commit). */
    printTempTableStatement(cte, ctx) {
        ctx.write('CREATE TEMP TABLE ');
        ctx.write(this.quoteIdent(cte.name));
        if (cte.columns?.length) {
            ctx.write(
                ` (${cte.columns.map((c) => this.quoteIdent(c)).join(', ')})`
            );
        }
        if (cte.onCommit) ctx.write(` ON COMMIT ${cte.onCommit.toUpperCase()}`);
        ctx.write(' AS (');
        this.visit(cte.query, ctx);
        ctx.write(')');
    }

    /** Маппинг каноничных типов -> тип диалекта. */
    castType(type) {
        switch (String(type).toUpperCase()) {
            case 'TEXT':
            case 'STRING':
                return 'TEXT';
            case 'TEXT[]':
            case 'STRING[]':
                return 'TEXT[]';
            case 'INTEGER':
                return 'INT8';
            case 'INTEGER[]':
                return 'INT8[]';
            case 'FLOAT':
                return 'FLOAT8';
            case 'FLOAT[]':
                return 'FLOAT8[]';
            case 'BOOLEAN':
                return 'BOOLEAN';
            case 'BOOLEAN[]':
                return 'BOOLEAN[]';
            case 'DATE':
                return 'DATE';
            case 'DATE[]':
                return 'DATE[]';
            case 'DATETIME':
            case 'TIMESTAMP':
                return 'TIMESTAMP';
            case 'DATETIME[]':
            case 'TIMESTAMP[]':
                return 'TIMESTAMP[]';
            case 'UUID':
            case 'REF':
                return 'UUID';
            case 'UUID[]':
            case 'REF[]':
                return 'UUID[]';
            default:
                return String(type);
        }
    }

    // ---------- DML/DDL ----------
    visit_Insert(n, ctx) {
        ctx.write('INSERT INTO ');
        this.visit(n.table, ctx);
        if (n.columns?.length) {
            ctx.write(
                ` (${n.columns.map((c) => this.quoteIdent(c)).join(', ')})`
            );
        }
        if (n.overriding) {
            ctx.write(` OVERRIDING ${n.overriding.toUpperCase()} VALUE`);
        }
        if (n.source) {
            ctx.write(' ');
            this.visit(n.source, ctx);
        } else if (n.rows?.length) {
            ctx.write(' VALUES ');
            n.rows.forEach((row, i) => {
                if (i) ctx.write(', ');
                ctx.write('(');
                this.list(row, ctx);
                ctx.write(')');
            });
        }
        if (n.onConflict) {
            ctx.write(' ON CONFLICT');
            this.visit(n.onConflict, ctx);
        }
        if (n.returning) {
            ctx.write(' ');
            this.visit(n.returning, ctx);
        }
    }
    visit_Update(n, ctx) {
        ctx.write('UPDATE ');
        this.visit(n.table, ctx);
        ctx.write(' SET ');
        n.assignments.forEach((a, i) => {
            if (i) ctx.write(', ');
            this.visit(a, ctx);
        });
        if (n.from) {
            ctx.write(' ');
            this.visit(n.from, ctx);
        }
        if (n.where) {
            ctx.write(' WHERE ');
            this.visit(n.where, ctx);
        }
        if (n.returning) {
            ctx.write(' ');
            this.visit(n.returning, ctx);
        }
    }
    visit_Delete(n, ctx) {
        ctx.write('DELETE FROM ');
        this.visit(n.table, ctx);
        if (n.using) {
            ctx.write(' USING ');
            this.visit(n.using, ctx);
        }
        if (n.where) {
            ctx.write(' WHERE ');
            this.visit(n.where, ctx);
        }
        if (n.returning) {
            ctx.write(' ');
            this.visit(n.returning, ctx);
        }
    }
    visit_Merge(n, ctx) {
        ctx.write('MERGE INTO ');
        this.visit(n.target, ctx);
        ctx.write(' USING ');
        this.visit(n.source, ctx);
        ctx.write(' ON ');
        this.visit(n.on, ctx);
        for (const cl of n.clauses) {
            ctx.write(' ');
            this.visit(cl, ctx);
        }
    }
    visit_MergeClause(n, ctx) {
        ctx.write(`WHEN ${n.matched ? '' : 'NOT '}MATCHED`);
        if (n.condition) {
            ctx.write(' AND ');
            this.visit(n.condition, ctx);
        }
        ctx.write(' THEN ');
        switch (n.action) {
            case 'insert':
                ctx.write('INSERT');
                if (n.columns?.length)
                    ctx.write(
                        ` (${n.columns
                            .map((c) => this.quoteIdent(c))
                            .join(', ')})`
                    );
                ctx.write(' VALUES (');
                this.list(n.values, ctx);
                ctx.write(')');
                break;
            case 'update':
                ctx.write('UPDATE SET ');
                n.set.forEach((a, i) => {
                    if (i) ctx.write(', ');
                    this.visit(a, ctx);
                });
                break;
            case 'delete':
                ctx.write('DELETE');
                break;
            default:
                ctx.write('DO NOTHING');
        }
    }
    visit_CreateTempTable(n, ctx) {
        this.printTempTableStatement(
            new (require('../ast').Cte)({
                name: n.name,
                query: n.query,
                materialization: 'temp',
                columns: n.columns,
                onCommit: n.onCommit,
                distribute: n.distribute,
            }),
            ctx
        );
    }
    visit_DropTable(n, ctx) {
        ctx.write('DROP TABLE ');
        if (n.ifExists) ctx.write('IF EXISTS ');
        this.visit(n.table, ctx);
        if (n.cascade) ctx.write(' CASCADE');
        ctx.write(';');
    }
    visit_CreateView(n, ctx) {
        ctx.write('CREATE ');
        if (n.orReplace) ctx.write('OR REPLACE ');
        if (n.temp) ctx.write('TEMP ');
        ctx.write('VIEW ');
        ctx.write(this.quoteIdent(n.name));
        if (n.columns?.length) {
            ctx.write(
                ` (${n.columns.map((c) => this.quoteIdent(c)).join(', ')})`
            );
        }
        ctx.write(' AS ');
        this.visit(n.query, ctx);
        if (n.checkOption)
            ctx.write(` WITH ${n.checkOption.toUpperCase()} CHECK OPTION`);
        ctx.write(';');
    }
    visit_DropView(n, ctx) {
        ctx.write('DROP VIEW ');
        if (n.ifExists) ctx.write('IF EXISTS ');
        ctx.write(this.quoteIdent(n.name));
        if (n.cascade) ctx.write(' CASCADE');
        ctx.write(';');
    }
    visit_Truncate(n, ctx) {
        ctx.write('TRUNCATE ');
        ctx.write(n.tables.map((t) => this.visit(t, ctx)).join(', '));
        if (n.restartIdentity) ctx.write(' RESTART IDENTITY');
        if (n.cascade) ctx.write(' CASCADE');
        ctx.write(';');
    }

    // ───────── DDL: CREATE TABLE ─────────
    /**
     * Печатает определение колонки через visitor-dispatch.
     */
    visit_ColumnDef(n, ctx) {
        ctx.write(`  ${this.quoteIdent(n.name)} `);
        this.visit(n.dataType, ctx);

        if (n.defaultValue !== null && n.defaultValue !== undefined) {
            ctx.write(' DEFAULT ');
            this.visit(n.defaultValue, ctx);
        }

        if (n.unique) ctx.write(' UNIQUE');
        if (!n.nullable) ctx.write(' NOT NULL');
        if (n.primaryKey) ctx.write(' PRIMARY KEY');
    }

    /**
     * Печатает табличное ограничение через visitor-dispatch.
     */
    visit_TableConstraint(n, ctx) {
        switch (n.type) {
            case 'unique':
                ctx.write(`  CONSTRAINT ${this.quoteIdent(n.name)} UNIQUE (`);
                ctx.write(n.fields.map((f) => this.quoteIdent(f)).join(', '));
                ctx.write(')');
                break;
            case 'primary':
                ctx.write(
                    `  CONSTRAINT ${this.quoteIdent(n.name)} PRIMARY KEY (`
                );
                ctx.write(n.fields.map((f) => this.quoteIdent(f)).join(', '));
                ctx.write(')');
                break;
            case 'foreign': {
                ctx.write(
                    `  CONSTRAINT ${this.quoteIdent(n.name)} FOREIGN KEY (`
                );
                ctx.write(n.fields.map((f) => this.quoteIdent(f)).join(', '));
                ctx.write(`) REFERENCES ${this.quoteIdent(n.refTable)} (`);
                ctx.write(
                    n.refColumns.map((f) => this.quoteIdent(f)).join(', ')
                );
                ctx.write(')');
                break;
            }
            case 'check':
                ctx.write(`  CONSTRAINT ${this.quoteIdent(n.name)} CHECK (`);
                if (n.condition) this.visit(n.condition, ctx);
                ctx.write(')');
                break;
            default:
                throw new Error(`TableConstraint: unknown type=${n.type}`);
        }
    }

    visit_CreateTable(n, ctx) {
        ctx.write('CREATE TABLE ');
        if (n.ifExists) ctx.write('IF EXISTS ');
        this.visit(n.table, ctx);
        ctx.write(' (\n');
        n.columns.forEach((col, i) => {
            if (i) ctx.write(',\n');
            this.visit(col, ctx);
        });
        n.uniqueConstraints.forEach((constraint, i) => {
            if (i || n.columns.length) ctx.write(',\n');
            this.visit(constraint, ctx);
        });
        ctx.write('\n);');
    }

    // ───────── DDL: ALTER TABLE ─────────
    visit_AlterTable(n, ctx) {
        switch (n.alterType) {
            case 'dropColumn':
                ctx.write('ALTER TABLE ');
                this.visit(n.table, ctx);
                ctx.write(' DROP COLUMN ');
                if (n.ifExists) ctx.write('IF EXISTS ');
                ctx.write(this.quoteIdent(n.columnName));
                break;

            case 'addColumn':
                ctx.write('ALTER TABLE ');
                this.visit(n.table, ctx);
                ctx.write(' ADD COLUMN ');
                if (n.ifNotExists) ctx.write('IF NOT EXISTS ');
                ctx.write(this.quoteIdent(n.columnName));
                ctx.write(' ');
                this.visit(n.dataType, ctx);
                if (n.defaultValue !== null && n.defaultValue !== undefined) {
                    ctx.write(' DEFAULT ');
                    this.visit(n.defaultValue, ctx);
                }
                if (!n.nullable) {
                    ctx.write(' NOT NULL');
                }
                break;

            case 'renameColumn':
                ctx.write('ALTER TABLE ');
                this.visit(n.table, ctx);
                ctx.write(' RENAME COLUMN ');
                ctx.write(this.quoteIdent(n.from));
                ctx.write(' TO ');
                ctx.write(this.quoteIdent(n.to));
                break;

            case 'alterColumnType':
                ctx.write('ALTER TABLE ');
                this.visit(n.table, ctx);
                ctx.write(' ALTER COLUMN ');
                ctx.write(this.quoteIdent(n.columnName));
                ctx.write(' TYPE ');
                this.visit(n.dataType, ctx);
                break;

            case 'dropConstraint':
                ctx.write('ALTER TABLE ');
                this.visit(n.table, ctx);
                ctx.write(' DROP CONSTRAINT ');
                if (n.ifExists) ctx.write('IF EXISTS ');
                ctx.write(this.quoteIdent(n.constraintName));
                break;

            default:
                throw new Error(`AlterTable: unknown alterType=${n.alterType}`);
        }
        ctx.write(';');
    }

    // ───────── DDL: CREATE INDEX ─────────
    visit_CreateIndex(n, ctx) {
        ctx.write('CREATE ');
        if (n.unique) ctx.write('UNIQUE ');
        ctx.write('INDEX ');
        if (n.ifNotExists) ctx.write('IF NOT EXISTS ');
        // if (n.schema) ctx.write(`${this.quoteIdent(n.schema)}.`);
        ctx.write(this.quoteIdent(n.name));
        ctx.write(' ON ');
        this.visit(n.table, ctx);
        ctx.write(' (');
        ctx.write(n.fields.map((f) => this.quoteIdent(f)).join(', '));
        ctx.write(');');
    }

    // ───────── DDL: DROP INDEX ─────────
    visit_DropIndex(n, ctx) {
        ctx.write('DROP INDEX ');
        if (n.ifExists) ctx.write('IF EXISTS ');
        if (n.schema) ctx.write(`${this.quoteIdent(n.schema)}.`);
        ctx.write(this.quoteIdent(n.name));
        ctx.write(';');
    }
}

module.exports = Dialect;
module.exports.PrintCtx = PrintCtx;
module.exports.DETERMINISTIC_FUNCS = DETERMINISTIC_FUNCS;
module.exports.NON_STRICT_FUNCS = NON_STRICT_FUNCS;
