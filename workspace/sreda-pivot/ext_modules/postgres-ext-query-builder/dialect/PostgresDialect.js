'use strict';

const Dialect = require('../../query-builder/dialect/Dialect');

/**
 * PostgreSQL-диалект.
 *
 * Поддерживает все современные фичи PG 14+:
 *   - DISTINCT ON, GROUPING SETS, ROLLUP, CUBE
 *   - FILTER (WHERE ...), WITHIN GROUP (ORDER BY ...)
 *   - LATERAL JOIN
 *   - ILIKE, SIMILAR TO
 *   - ON CONFLICT ... DO UPDATE
 *   - MERGE (PG 15+)
 *   - RETURNING
 *   - Рекурсивные CTE с MATERIALIZED / NOT MATERIALIZED хинтом
 *   - FETCH FIRST n ROWS ONLY / WITH TIES
 *   - pg_hint_plan блоки (если supportsHintComments: true в options)
 *
 * optimizer hooks:
 *   - isDeterministic / isStrict - наследуются от Dialect с расширением.
 *   - emitHintBlock - pg_hint_plan стиль: /[*]+ SeqScan(t) HashJoin(a b) Leading(a b c) [*]/
 */
class PostgresDialect extends Dialect {
    constructor(options = {}) {
        super({
            // ── Все PG capability flags ───────────────────────────────────
            defaultMaterialization: 'cte',
            supportsTempTables: true,
            supportsRecursiveCte: true,
            supportsGroupingSets: true,
            supportsOrderedSetAgg: true,
            supportsFilterClause: true,
            supportsDistinctOn: true,
            supportsFetchFirst: true,
            supportsExceptAll: true,
            supportsIntersectAll: true,
            supportsValuesAsFrom: true,
            supportsLateral: true,
            supportsArrayLiteral: true,
            supportsJsonOperators: true,
            supportsIlike: true,
            supportsOnConflict: true,
            supportsMerge: true, // PG 15+
            supportsReturning: true,
            supportsHintComments: false, // включать явно: new PostgresDialect({ supportsHintComments: true })
            hintCommentStyle: 'pg_hint_plan',
            nullOrderExplicit: true,
            motionModel: 'none',
            schema: options.schema || null,
            ...options,
        });
    }

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
                return 'TIMESTAMP WITH TIME ZONE';
            case 'DATETIME[]':
            case 'TIMESTAMP[]':
                return 'TIMESTAMP[] WITH TIME ZONE';
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

    /**
     * Star EXCEPT - PG поддерживает нативно через ctx.starColumns.
     * Если метаданные есть - раскрываем в явный список; иначе оставляем оригинальный синтаксис.
     */
    visit_Star(n, ctx) {
        if (!n.except?.length) return super.visit_Star(n, ctx);
        const cols = ctx.starColumns?.get(n.qualifier || '') || [];
        if (!cols.length) {
            // Нет метаданных - печатаем как есть и надеемся на поддержку СУБД
            return super.visit_Star(n, ctx);
        }
        const filtered = cols.filter((c) => !n.except.includes(c));
        filtered.forEach((c, i) => {
            if (i) ctx.write(', ');
            if (n.qualifier) ctx.write(`${this.quoteIdent(n.qualifier)}.`);
            ctx.write(this.quoteIdent(c));
        });
    }

    /**
     * Печать CTE-определения с поддержкой MATERIALIZED / NOT MATERIALIZED (PG 12+).
     * Оптимизатор управляет этим через cte.materializationHint.
     */
    printCteDef(cte, ctx) {
        ctx.write(this.quoteIdent(cte.name));
        if (cte.columns?.length) {
            ctx.write(
                ` (${cte.columns.map((c) => this.quoteIdent(c)).join(', ')})`
            );
        }
        ctx.write(' AS ');
        // materializationHint устанавливается оптимизатором:
        //   'materialized'     -> MATERIALIZED
        //   'not_materialized' -> NOT MATERIALIZED
        //   (иное / не задано) -> без хинта
        if (cte.materializationHint === 'materialized')
            ctx.write('MATERIALIZED ');
        else if (cte.materializationHint === 'not_materialized')
            ctx.write('NOT MATERIALIZED ');
        ctx.write('(');
        this.visit(cte.query, ctx);
        ctx.write(')');
    }

    /**
     * Эмиссия pg_hint_plan блока: /[*]+ hint1 hint2 ... [*]/
     * Формат: /[*]+ SeqScan(alias) HashJoin(a b) Leading(a b c) ... [*]/
     * @param {object[]} hints - массив Hint-узлов
     * @param {import('../../query-builder/dialect/Dialect').PrintCtx} ctx
     */
    emitHintBlock(hints, ctx) {
        if (!hints?.length) return;
        const parts = hints.map((h) => {
            if (h.args?.length) return `${h.kind}(${h.args.join(' ')})`;
            return h.kind;
        });
        ctx.write(`/*+ ${parts.join(' ')} */`);
    }

    /**
     * PG-специфичный typeOf - расширенный маппинг.
     */
    typeOf(expr, _schema) {
        if (!expr) return null;
        switch (expr.kind) {
            case 'Literal':
                if (expr.type) return expr.type;
                if (expr.value === null) return 'null';
                if (typeof expr.value === 'boolean') return 'boolean';
                if (typeof expr.value === 'number')
                    return Number.isInteger(expr.value) ? 'int8' : 'float8';
                if (typeof expr.value === 'string') return 'text';
                return null;
            case 'BooleanConst':
                return 'boolean';
            case 'Null':
                return 'null';
            case 'Param':
                return expr.type || null;
            case 'Column':
                return expr.type || null;
            case 'Cast':
                return typeof expr.type === 'string'
                    ? this.castType(expr.type).toLowerCase()
                    : null;
            case 'CoalesceExpr':
            case 'NullIfExpr':
                return null; // зависит от аргументов
            default:
                return null;
        }
    }

    /**
     * GP temp-таблица:
     *   DROP TABLE IF EXISTS name;
     *   CREATE TEMP TABLE name AS (query)
     *   DISTRIBUTED { RANDOMLY | BY (cols) | REPLICATED };
     *   ANALYZE name;
     */
    printTempTableStatement(cte, ctx) {
        ctx.write('DROP TABLE IF EXISTS ');
        ctx.write(this.quoteIdent(cte.name));
        ctx.write('; CREATE TEMP TABLE ');
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
}

module.exports = PostgresDialect;
