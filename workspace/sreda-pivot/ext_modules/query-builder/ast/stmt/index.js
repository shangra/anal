'use strict';

const Node = require('../Node');

/**
 * SELECT statement.
 *  projections: Projection[]
 *  from:        From | null
 *  where:       Node | null
 *  groupBy:     GroupBy | GroupingSets | Rollup | Cube | null
 *  having:      Node | null
 *  orderBy:     OrderItem[]
 *  limit:       Limit | FetchFirst | null
 *  distinct:    boolean | Node[] (DISTINCT ON (cols) - PG)
 *  hints:       free-form объект для диалект-специфичных хинтов
 *  windows:     Window[] - именованные окна WINDOW w AS (...)
 *  forClause:   ForClause | null - FOR UPDATE / FOR SHARE
 */
class Select extends Node {
    constructor({
        projections = [],
        from = null,
        where = null,
        groupBy = null,
        having = null,
        orderBy = [],
        limit = null,
        distinct = false,
        hints = {},
        windows = [],
        forClause = null,
    }) {
        super('Select', {
            projections,
            from,
            where,
            groupBy,
            having,
            orderBy,
            limit,
            distinct,
            hints,
            windows,
            forClause,
        });
    }
}

/** UNION (ALL по умолчанию) / INTERSECT / EXCEPT.
 *  Для N-арных цепочек используйте вложенные SetOp-деревья или
 *  поле `operands: Node[]` (если оба поля не заданы).
 */
class SetOp extends Node {
    constructor({ op = 'unionAll', left, right }) {
        super('SetOp', { op, left, right });
    }
}

/**
 * Определение CTE или TEMP-таблицы.
 *  materialization: 'cte' | 'temp' | 'inline'
 *  recursive: для рекурсивного CTE (columns обязательны)
 *  columns: string[] | null - для CREATE TEMP или recursive CTE
 *  onCommit: 'preserve' | 'drop' | null - для TEMP
 */
class Cte extends Node {
    constructor({
        name,
        query,
        materialization = 'cte',
        recursive = false,
        columns = null,
        onCommit = null,
        distribute = null, // Greenplum-specific: 'randomly' | 'replicated' | { by: [...] }
        materializationHint = null, // PG 12+: 'materialized' | 'not_materialized' | null
    }) {
        super('Cte', {
            name,
            query,
            materialization,
            recursive,
            columns,
            onCommit,
            distribute,
            materializationHint,
        });
    }
}

/**
 * Композиция: перечень CTE + итоговый запрос.
 * Печатник сам решит, что развернуть в WITH ..., что - в CREATE TEMP TABLE, что - в inline-подзапрос.
 *
 * hints: Hint[] | null - массив хинтов для оптимизатора.
 *   При supportsHintComments=true диалект эмиттирует блок перед body.
 *   Устанавливается оптимизатором; по умолчанию пуст.
 */
class Query extends Node {
    constructor({ ctes = [], body, hints = [] }) {
        super('Query', { ctes, body, hints });
    }
}

/** DML */
class Insert extends Node {
    /**
     * table:      TableSource
     * columns:    string[]
     * rows:       Node[][] | null  - для VALUES; null если source задан
     * source:     Select | SetOp | null - INSERT ... SELECT
     * onConflict: OnConflict | null
     * returning:  Returning | null
     * overriding: 'system' | 'user' | null  - OVERRIDING {SYSTEM|USER} VALUE (PG)
     */
    constructor({
        table,
        columns = [],
        rows = null,
        source = null,
        onConflict = null,
        returning = null,
        overriding = null,
    }) {
        super('Insert', {
            table,
            columns,
            rows,
            source,
            onConflict,
            returning,
            overriding,
        });
    }
}
class Update extends Node {
    /**
     * table:       TableSource
     * assignments: Assignment[]
     * from:        From | null - UPDATE ... FROM (PG extension)
     * where:       Node | null
     * returning:   Returning | null
     */
    constructor({
        table,
        assignments = [],
        from = null,
        where = null,
        returning = null,
    }) {
        super('Update', { table, assignments, from, where, returning });
    }
}
class Delete extends Node {
    constructor({ table, using = null, where = null, returning = null }) {
        super('Delete', { table, using, where, returning });
    }
}

/**
 * MERGE (ANSI SQL / PG 15+ / CH experimental).
 *   target:   TableSource
 *   source:   From | SubquerySource | TableSource
 *   on:       Node - условие объединения
 *   clauses:  MergeClause[]
 */
class Merge extends Node {
    constructor({ target, source, on, clauses = [] }) {
        super('Merge', { target, source, on, clauses });
    }
}

/**
 * Одна ветвь MERGE: WHEN [NOT] MATCHED [AND condition] THEN action.
 *   matched:   true | false
 *   condition: Node | null
 *   action:    'insert' | 'update' | 'delete' | 'doNothing'
 *   set:       Assignment[]  - для update
 *   columns:   string[]      - для insert
 *   values:    Node[]        - для insert
 */
class MergeClause extends Node {
    constructor({
        matched = true,
        condition = null,
        action,
        set = [],
        columns = [],
        values = [],
    }) {
        super('MergeClause', {
            matched,
            condition,
            action,
            set,
            columns,
            values,
        });
    }
}

/** DDL */
class CreateTempTable extends Node {
    constructor({
        name,
        query,
        columns = null,
        onCommit = null,
        distribute = null,
    }) {
        super('CreateTempTable', {
            name,
            query,
            columns,
            onCommit,
            distribute,
        });
    }
}
class DropTable extends Node {
    constructor({ table, ifExists = true, cascade = false, temp = false }) {
        super('DropTable', { table, ifExists, cascade, temp });
    }
}

/**
 * CREATE [OR REPLACE] [TEMP] VIEW name [(columns)] AS query.
 *   orReplace: boolean
 *   temp:      boolean
 *   columns:   string[] | null
 *   checkOption: 'cascaded' | 'local' | null
 */
class CreateView extends Node {
    constructor({
        name,
        query,
        orReplace = false,
        temp = false,
        columns = null,
        checkOption = null,
    }) {
        super('CreateView', {
            name,
            query,
            orReplace,
            temp,
            columns,
            checkOption,
        });
    }
}

/**
 * DROP VIEW [IF EXISTS] name [CASCADE|RESTRICT].
 */
class DropView extends Node {
    constructor({ name, ifExists = true, cascade = false }) {
        super('DropView', { name, ifExists, cascade });
    }
}

/**
 * TRUNCATE [TABLE] name [, ...] [RESTART IDENTITY | CONTINUE IDENTITY] [CASCADE | RESTRICT].
 *   tables:           TableSource[]
 *   restartIdentity:  boolean
 *   cascade:          boolean
 */
class Truncate extends Node {
    constructor({ tables = [], restartIdentity = false, cascade = false }) {
        super('Truncate', { tables, restartIdentity, cascade });
    }
}

// ───────── DDL: CREATE / ALTER / INDEX ─────────

/**
 * CREATE TABLE [IF NOT EXISTS] name (column_defs [, table_constraints]).
 *   table:             TableSource
 *   columns:           Array<ColumnDef>
 *   uniqueConstraints: Array<TableConstraint>
 */
class CreateTable extends Node {
    constructor({ table, columns = [], uniqueConstraints = [] }) {
        super('CreateTable', { table, columns, uniqueConstraints });
    }
}

/**
 * ALTER TABLE multi-operation. alterType determines required fields.
 *
 * table:     TableSource
 * alterType: 'dropColumn'   -> { columnName, ifExists }
 * alterType: 'addColumn'    -> { name, dataType: DataTypeNode, nullable, defaultValue }
 * alterType: 'renameColumn' -> { from, to }
 * alterType: 'alterColumnType' -> { name, dataType: DataTypeNode }
 * alterType: 'dropConstraint' -> { constraintName, ifExists }
 */
class AlterTable extends Node {
    constructor({ table, alterType, ...rest }) {
        super('AlterTable', { table, alterType, ...rest });
    }
}

/**
 * CREATE [UNIQUE] INDEX [IF NOT EXISTS] name ON table (columns).
 *   unique:       boolean
 *   ifNotExists:  boolean
 *   name:         string
 *   schema:       string | null
 *   table:        TableSource
 *   fields:       string[]
 */
class CreateIndex extends Node {
    constructor({
        unique = false,
        ifNotExists = false,
        name,
        schema,
        table,
        fields,
    }) {
        super('CreateIndex', {
            unique,
            ifNotExists,
            name,
            schema,
            table,
            fields,
        });
    }
}

/**
 * DROP INDEX [IF EXISTS] name.
 *   ifExists: boolean
 *   schema:   string | null
 *   name:     string (index name)
 */
class DropIndex extends Node {
    constructor({ ifExists = false, schema = null, name }) {
        super('DropIndex', { ifExists, schema, name });
    }
}

// ── DDL: Column and Constraint definitions ──

/**
 * Определение колонки в CREATE TABLE.
 *  name:           string
 *  dataType:       DataType node
 *  nullable:       boolean
 *  defaultValue:   Node | string | null — Literal, Raw, или null
 *  primaryKey:     boolean
 *  autoIncrement:  boolean
 *  unique:         boolean
 */
class ColumnDef extends Node {
    constructor({
        name,
        dataType,
        nullable = true,
        defaultValue = null,
        primaryKey = false,
        autoIncrement = false,
        unique = false,
    }) {
        super('ColumnDef', {
            name,
            dataType,
            nullable,
            defaultValue,
            primaryKey,
            autoIncrement,
            unique,
        });
    }
}

/**
 * Табличное ограничение (UNIQUE, PRIMARY KEY, FOREIGN KEY, CHECK).
 *  name:   string
 *  type:   'unique' | 'primary' | 'foreign' | 'check'
 *  fields: string[]   — для unique/primary
 *  refTable, refColumns: string[] — для foreign
 *  condition: Node | null — для check
 */
class TableConstraint extends Node {
    constructor({
        name,
        type,
        fields = [],
        refTable = null,
        refColumns = null,
        condition = null,
    }) {
        super('TableConstraint', {
            name,
            type,
            fields,
            refTable,
            refColumns,
            condition,
        });
    }
}

module.exports = {
    Select,
    SetOp,
    Cte,
    Query,
    Insert,
    Update,
    Delete,
    Merge,
    MergeClause,
    CreateTempTable,
    DropTable,
    CreateView,
    DropView,
    Truncate,
    CreateTable,
    AlterTable,
    CreateIndex,
    DropIndex,
    ColumnDef,
    TableConstraint,
};
