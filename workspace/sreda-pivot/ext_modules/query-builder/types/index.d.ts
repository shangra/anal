// ──────────────────────────────────────────────────────────────────────────────
// Базовые типы
// ──────────────────────────────────────────────────────────────────────────────

export type MaterializationKind = 'cte' | 'temp' | 'inline';
export type JoinType =
    | 'inner'
    | 'left'
    | 'right'
    | 'cross'
    | 'full'
    | 'semi'
    | 'anti';
export type SetOpKind =
    | 'unionAll'
    | 'union'
    | 'intersect'
    | 'intersectAll'
    | 'except'
    | 'exceptAll';
export type DirKind = 'ASC' | 'DESC';
export type NullsKind = 'FIRST' | 'LAST';
export type FrameUnits = 'rows' | 'range' | 'groups';
export type FrameBoundKind =
    | 'currentRow'
    | 'unboundedPreceding'
    | 'unboundedFollowing'
    | 'preceding'
    | 'following';
export type ForStrength = 'update' | 'noKeyUpdate' | 'share' | 'keyShare';
export type WaitPolicy = 'nowait' | 'skipLocked';
export type Quantifier = 'any' | 'all' | 'some';
export type FieldOp = '.' | '->' | '->>' | '#>' | '#>>' | '[]';
export type NamedArgStyle = '=>' | ':=' | '=';
export type OnCommit = 'preserve' | 'drop';
export type OverridingValue = 'system' | 'user';
export type CheckOption = 'cascaded' | 'local';

export interface INode {
    readonly kind: string;
    with(patch: Partial<this>): this;
    toJSON(): object;
}

// ──────────────────────────────────────────────────────────────────────────────
// Выражения (expr)
// ──────────────────────────────────────────────────────────────────────────────

export interface ILiteral extends INode {
    kind: 'Literal';
    value: any;
    type: string | IDataType | null;
}
export interface IRaw extends INode {
    kind: 'Raw';
    sql: string;
    bindings: any[];
}
export interface IIdentifier extends INode {
    kind: 'Identifier';
    name: string;
    qualifier: string | null;
}
export interface IColumn extends INode {
    kind: 'Column';
    name: string;
    qualifier: string | null;
    alias: string | null;
}
export interface IParam extends INode {
    kind: 'Param';
    value: any;
    type: string | IDataType | null;
}
export interface IStar extends INode {
    kind: 'Star';
    qualifier: string | null;
    except: string[];
}
export interface INull extends INode {
    kind: 'Null';
}

/** Тип данных: NUMERIC(38,6), TEXT[], etc. */
export interface IDataType extends INode {
    kind: 'DataType';
    name: string;
    args: (string | number)[];
    array: boolean;
}

export interface IBinaryOp extends INode {
    kind: 'BinaryOp';
    op: string;
    left: INode;
    right: INode;
}
export interface IUnaryOp extends INode {
    kind: 'UnaryOp';
    op: string;
    arg: INode;
    postfix: boolean;
}
export interface IInList extends INode {
    kind: 'InList';
    expr: INode;
    list: INode[] | INode;
    negate: boolean;
}
export interface IBetween extends INode {
    kind: 'Between';
    expr: INode;
    low: INode;
    high: INode;
    negate: boolean;
}

export interface ILike extends INode {
    kind: 'Like';
    expr: INode;
    pattern: INode;
    negate: boolean;
    caseInsensitive: boolean;
    escape: INode | null;
    similarTo: boolean;
}
export interface IExists extends INode {
    kind: 'Exists';
    query: INode;
    negate: boolean;
}
export interface IQuantified extends INode {
    kind: 'Quantified';
    op: string;
    quantifier: Quantifier;
    expr: INode;
    right: INode;
}
export interface ITuple extends INode {
    kind: 'Tuple';
    items: INode[];
    explicit: boolean;
}
export interface IFieldAccess extends INode {
    kind: 'FieldAccess';
    expr: INode;
    field: string | INode;
    op: FieldOp;
}
export interface IInterval extends INode {
    kind: 'Interval';
    value: string | INode;
    unit: string | null;
}
export interface ICollate extends INode {
    kind: 'Collate';
    expr: INode;
    collation: string;
}
export interface IAtTimeZone extends INode {
    kind: 'AtTimeZone';
    expr: INode;
    tz: string | INode;
}
export interface ILambda extends INode {
    kind: 'Lambda';
    params: string[];
    body: INode;
}
export interface INamedArg extends INode {
    kind: 'NamedArg';
    name: string;
    value: INode;
    style: NamedArgStyle;
}

export interface IFunctionCall extends INode {
    kind: 'FunctionCall';
    name: string;
    args: INode[];
    distinct: boolean;
    filter: INode | null;
    withinGroup: IOrderItem[] | null;
}
export interface IWindowFunction extends INode {
    kind: 'WindowFunction';
    fn: IFunctionCall;
    partitionBy: INode[];
    orderBy: IOrderItem[];
    frame: IFrame | string | null;
    windowName: string | null;
}
export interface ICast extends INode {
    kind: 'Cast';
    expr: INode;
    type: string | IDataType;
}
export interface ICaseBranch {
    when: INode;
    then: INode;
}
export interface ICase extends INode {
    kind: 'Case';
    subject: INode | null;
    branches: ICaseBranch[];
    elseExpr: INode | null;
}
export interface IArrayExpr extends INode {
    kind: 'ArrayExpr';
    items: INode[];
    elemType: string | IDataType | null;
}
export interface ISubqueryExpr extends INode {
    kind: 'SubqueryExpr';
    query: INode;
}

// ──────────────────────────────────────────────────────────────────────────────
// Клаузы (clause)
// ──────────────────────────────────────────────────────────────────────────────

export interface ITableSource extends INode {
    kind: 'TableSource';
    name: string;
    schema: string | null;
    alias: string | null;
    catalog: string | null;
}
export interface ISubquerySource extends INode {
    kind: 'SubquerySource';
    query: INode;
    alias: string;
    lateral: boolean;
}
export interface ICteRef extends INode {
    kind: 'CteRef';
    name: string;
    alias: string | null;
}
export interface IValuesList extends INode {
    kind: 'ValuesList';
    rows: INode[][];
    alias: string | null;
    columns: string[] | null;
}
export interface IJoin extends INode {
    kind: 'Join';
    type: JoinType;
    source: INode;
    on: INode | null;
    using: string[] | null;
    lateral: boolean;
}
export interface IFrom extends INode {
    kind: 'From';
    source: INode;
    joins: IJoin[];
}
export interface IProjection extends INode {
    kind: 'Projection';
    expr: INode;
    alias: string | null;
}
export interface IOrderItem extends INode {
    kind: 'OrderItem';
    expr: INode;
    dir: DirKind;
    nulls: NullsKind | null;
}
export interface IGroupBy extends INode {
    kind: 'GroupBy';
    items: INode[];
}
export interface IGroupingSets extends INode {
    kind: 'GroupingSets';
    sets: INode[][];
}
export interface IRollup extends INode {
    kind: 'Rollup';
    items: (INode | INode[])[];
}
export interface ICube extends INode {
    kind: 'Cube';
    items: (INode | INode[])[];
}
export interface ILimit extends INode {
    kind: 'Limit';
    limit: number | null;
    offset: number | null;
}
export interface IFetchFirst extends INode {
    kind: 'FetchFirst';
    count: INode | number;
    withTies: boolean;
    percent: boolean;
}

export interface IFrameBound extends INode {
    kind: 'FrameBound';
    kind_: FrameBoundKind;
    value: INode | null;
}
export interface IFrame extends INode {
    kind: 'Frame';
    units: FrameUnits;
    start: IFrameBound;
    end: IFrameBound | null;
    exclude: 'currentRow' | 'group' | 'ties' | 'noOthers' | null;
}
export interface IWindow extends INode {
    kind: 'Window';
    name: string;
    refName: string | null;
    partitionBy: INode[];
    orderBy: IOrderItem[];
    frame: IFrame | null;
}
export interface IForClause extends INode {
    kind: 'ForClause';
    strength: ForStrength;
    of: string[];
    wait: WaitPolicy | null;
}

export interface IOnConflictTarget {
    columns: string[];
    constraint: string | null;
    where: INode | null;
}
export interface IOnConflict extends INode {
    kind: 'OnConflict';
    target: IOnConflictTarget | null;
    action: 'nothing' | 'update';
    set: IAssignment[];
    where: INode | null;
}
export interface IAssignment extends INode {
    kind: 'Assignment';
    column: string | string[];
    value: INode;
}
export interface IReturning extends INode {
    kind: 'Returning';
    items: INode[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Statements (stmt)
// ──────────────────────────────────────────────────────────────────────────────

export interface ISelect extends INode {
    kind: 'Select';
    projections: IProjection[];
    from: IFrom | null;
    where: INode | null;
    groupBy: IGroupBy | IGroupingSets | IRollup | ICube | null;
    having: INode | null;
    orderBy: IOrderItem[];
    limit: ILimit | IFetchFirst | null;
    distinct: boolean | INode[];
    hints: Record<string, any>;
    windows: IWindow[];
    forClause: IForClause | null;
}
export interface ISetOp extends INode {
    kind: 'SetOp';
    op: SetOpKind;
    left: INode;
    right: INode;
}
export interface ICte extends INode {
    kind: 'Cte';
    name: string;
    query: INode;
    materialization: MaterializationKind;
    recursive: boolean;
    columns: string[] | null;
    onCommit: OnCommit | null;
    distribute: null | 'randomly' | { by: string[] };
}
export interface ITag extends INode {
    kind: 'Tag';
    key: string;
    value: any;
}
export interface ITagsList extends INode {
    kind: 'TagList';
    list: ITag[];
    query?: INode;
}
export interface IQuery extends INode {
    kind: 'Query';
    ctes: ICte[];
    body: INode;
    tags?: ITag[];
}

export interface IInsert extends INode {
    kind: 'Insert';
    table: ITableSource;
    columns: string[];
    rows: INode[][] | null;
    source: INode | null;
    onConflict: IOnConflict | null;
    returning: IReturning | null;
    overriding: OverridingValue | null;
}
export interface IUpdate extends INode {
    kind: 'Update';
    table: ITableSource;
    assignments: IAssignment[];
    from: IFrom | null;
    where: INode | null;
    returning: IReturning | null;
}
export interface IDelete extends INode {
    kind: 'Delete';
    table: ITableSource;
    using: INode | null;
    where: INode | null;
    returning: IReturning | null;
}
export interface IMergeClause extends INode {
    kind: 'MergeClause';
    matched: boolean;
    condition: INode | null;
    action: 'insert' | 'update' | 'delete' | 'doNothing';
    set: IAssignment[];
    columns: string[];
    values: INode[];
}
export interface IMerge extends INode {
    kind: 'Merge';
    target: ITableSource;
    source: INode;
    on: INode;
    clauses: IMergeClause[];
}
export interface ICreateTempTable extends INode {
    kind: 'CreateTempTable';
    name: string;
    query: INode;
    columns: string[] | null;
    onCommit: OnCommit | null;
    distribute: null | 'randomly' | { by: string[] };
}
export interface IDropTable extends INode {
    kind: 'DropTable';
    name: string;
    ifExists: boolean;
    cascade: boolean;
    temp: boolean;
}
export interface ICreateView extends INode {
    kind: 'CreateView';
    name: string;
    query: INode;
    orReplace: boolean;
    temp: boolean;
    columns: string[] | null;
    checkOption: CheckOption | null;
}
export interface IDropView extends INode {
    kind: 'DropView';
    name: string;
    ifExists: boolean;
    cascade: boolean;
}
export interface ITruncate extends INode {
    kind: 'Truncate';
    tables: string[];
    restartIdentity: boolean;
    cascade: boolean;
}

// ── DDL: CREATE TABLE / ALTER TABLE / INDEX ──

/** Определение колонки в CREATE TABLE */
export interface IColumnDef extends INode {
    kind: 'ColumnDef';
    name: string;
    dataType: IDataType;
    nullable: boolean;
    defaultValue: INode | string | null;
    primaryKey: boolean;
    autoIncrement: boolean;
    unique: boolean;
}

/** Табличное ограничение (UNIQUE, PRIMARY KEY, FOREIGN KEY, CHECK) */
export interface ITableConstraint extends INode {
    kind: 'TableConstraint';
    name: string;
    type: 'unique' | 'primary' | 'foreign' | 'check';
    fields: string[];
    refTable?: string;
    refColumns?: string[];
    condition?: INode | null;
}

export interface ICreateTable extends INode {
    kind: 'CreateTable';
    name: string;
    schema: string | null;
    ifExists?: boolean;
    columns: IColumnDef[];
    uniqueConstraints: ITableConstraint[];
}

export type AlterTableType =
    | 'dropColumn'
    | 'addColumn'
    | 'renameColumn'
    | 'alterColumnType'
    | 'dropConstraint';

/**
 * ALTER TABLE. Поля зависят от alterType:
 *   dropColumn:     { tableName, columnName, ifExists }
 *   addColumn:      { tableName, columnName, dataType, nullable, defaultValue, ifNotExists }
 *   renameColumn:   { tableName, from, to }
 *   alterColumnType: { tableName, columnName, dataType }
 *   dropConstraint: { tableName, constraintName, ifExists }
 */
export interface IAlterTable extends INode {
    kind: 'AlterTable';
    tableName: string;
    schema: string | null;
    alterType: AlterTableType;
    [key: string]: any; // дополнительные поля зависят от alterType
}

export interface ICreateIndex extends INode {
    kind: 'CreateIndex';
    unique: boolean;
    ifNotExists: boolean;
    name: string;
    schema: string | null;
    table: string;
    fields: string[];
}

export interface IDropIndex extends INode {
    kind: 'DropIndex';
    ifExists: boolean;
    schema: string | null;
    name: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Dialect
// ──────────────────────────────────────────────────────────────────────────────

export interface PrintResult {
    sql: string;
    bindings: any[];
}

export declare class Dialect {
    options: Record<string, any>;
    print(
        root: INode,
        options?: { paramStyle?: 'positional' | 'named' }
    ): PrintResult;
    visit(node: INode, ctx: any): void;
    quoteIdent(name: string): string;
    castType(type: string): string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Builder (b)
// ──────────────────────────────────────────────────────────────────────────────

export declare const b: {
    // expr
    star(qualifier?: string | null, except?: string[]): IStar;
    lit(value: any, type?: string | IDataType | null): ILiteral;
    raw(sql: string, bindings?: any[]): IRaw;
    id(name: string, qualifier?: string | null): IIdentifier;
    col(
        name: string,
        qualifier?: string | null,
        alias?: string | null
    ): IColumn;
    param(value: any, type?: string | IDataType | null): IParam;
    null_(): INull;
    dataType(
        name: string,
        args?: (string | number)[],
        array?: boolean
    ): IDataType;

    bin(op: string, left: INode, right: INode): IBinaryOp;
    not(arg: INode): IUnaryOp;
    isNull(arg: INode): IUnaryOp;
    isNotNull(arg: INode): IUnaryOp;
    in(expr: INode, list: INode[] | INode, negate?: boolean): IInList;
    between(expr: INode, low: INode, high: INode, negate?: boolean): IBetween;
    like(
        expr: INode,
        pattern: INode,
        opts?: {
            negate?: boolean;
            caseInsensitive?: boolean;
            escape?: INode | null;
            similarTo?: boolean;
        }
    ): ILike;
    exists(query: INode, negate?: boolean): IExists;
    quantified(
        op: string,
        expr: INode,
        right: INode,
        quantifier?: Quantifier
    ): IQuantified;
    tuple(items: INode[], explicit?: boolean): ITuple;
    field(expr: INode, field: string | INode, op?: FieldOp): IFieldAccess;
    interval(value: string | INode, unit?: string | null): IInterval;
    collate(expr: INode, collation: string): ICollate;
    atTz(expr: INode, tz: string | INode): IAtTimeZone;
    lambda(params: string | string[], body: INode): ILambda;
    namedArg(name: string, value: INode, style?: NamedArgStyle): INamedArg;

    fn(
        name: string,
        args?: INode[],
        opts?: {
            distinct?: boolean;
            filter?: INode | null;
            withinGroup?: IOrderItem[] | null;
        }
    ): IFunctionCall;
    win(
        fn: IFunctionCall,
        opts?: {
            partitionBy?: INode[];
            orderBy?: IOrderItem[];
            frame?: IFrame | string | null;
            windowName?: string | null;
        }
    ): IWindowFunction;
    cast(expr: INode, type: string | IDataType): ICast;
    case_(
        branches: ICaseBranch[],
        elseExpr?: INode | null,
        subject?: INode | null
    ): ICase;
    arr(items: INode[], elemType?: string | IDataType | null): IArrayExpr;
    sub(query: INode): ISubqueryExpr;

    // clause
    table(
        name: string,
        opts?: {
            schema?: string | null;
            alias?: string | null;
            catalog?: string | null;
        }
    ): ITableSource;
    subsrc(query: INode, alias: string, lateral?: boolean): ISubquerySource;
    cteref(name: string, alias?: string | null): ICteRef;
    values(
        rows: INode[][],
        opts?: { alias?: string | null; columns?: string[] | null }
    ): IValuesList;
    from(source: INode, joins?: IJoin[]): IFrom;
    join(
        type: JoinType,
        source: INode,
        on: INode | null,
        using?: string[] | null,
        lateral?: boolean
    ): IJoin;
    proj(expr: INode, alias?: string | null): IProjection;
    orderItem(expr: INode, dir?: DirKind, nulls?: NullsKind | null): IOrderItem;
    group(items: INode[]): IGroupBy;
    groupingSets(sets: INode[][]): IGroupingSets;
    rollup(items: (INode | INode[])[]): IRollup;
    cube(items: (INode | INode[])[]): ICube;
    limit(limit?: number | null, offset?: number | null): ILimit;
    fetchFirst(
        count: INode | number,
        opts?: { withTies?: boolean; percent?: boolean }
    ): IFetchFirst;
    frameBound(kind: FrameBoundKind, value?: INode | null): IFrameBound;
    frame(
        units: FrameUnits,
        start: IFrameBound,
        end?: IFrameBound | null,
        exclude?: IFrame['exclude']
    ): IFrame;
    window_(
        name: string,
        opts?: {
            refName?: string | null;
            partitionBy?: INode[];
            orderBy?: IOrderItem[];
            frame?: IFrame | null;
        }
    ): IWindow;
    forClause(
        strength?: ForStrength,
        opts?: { of?: string[]; wait?: WaitPolicy | null }
    ): IForClause;
    onConflict(
        action?: 'nothing' | 'update',
        opts?: {
            target?: IOnConflictTarget | null;
            set?: IAssignment[];
            where?: INode | null;
        }
    ): IOnConflict;
    assign(column: string | string[], value: INode): IAssignment;
    returning(items?: INode[]): IReturning;

    // stmt
    select(props: Partial<Omit<ISelect, 'kind'>>): ISelect;
    union(left: INode, right: INode, all?: boolean): ISetOp;
    intersect(left: INode, right: INode, all?: boolean): ISetOp;
    except(left: INode, right: INode, all?: boolean): ISetOp;
    cte(
        name: string,
        query: INode,
        opts?: Partial<Omit<ICte, 'kind' | 'name' | 'query'>>
    ): ICte;
    query(body: INode, ctes?: ICte[]): IQuery;

    insert(props: Omit<IInsert, 'kind'>): IInsert;
    update(props: Omit<IUpdate, 'kind'>): IUpdate;
    delete_(props: Omit<IDelete, 'kind'>): IDelete;
    merge(
        target: ITableSource,
        source: INode,
        on: INode,
        clauses?: IMergeClause[]
    ): IMerge;
    mergeClause(props: Omit<IMergeClause, 'kind'>): IMergeClause;
    tempTable(props: Omit<ICreateTempTable, 'kind'>): ICreateTempTable;
    drop(props: Omit<IDropTable, 'kind'>): IDropTable;
    createView(props: Omit<ICreateView, 'kind'>): ICreateView;
    dropView(props: Omit<IDropView, 'kind'>): IDropView;
    truncate(
        tables: string | string[],
        opts?: { restartIdentity?: boolean; cascade?: boolean }
    ): ITruncate;

    // ── DDL: CREATE TABLE / ALTER TABLE / INDEX ──
    createTable(props: Omit<ICreateTable, 'kind'>): ICreateTable;
    alterTable(props: Omit<IAlterTable, 'kind'>): IAlterTable;
    createIndex(props: Omit<ICreateIndex, 'kind'>): ICreateIndex;
    dropIndex(props: Omit<IDropIndex, 'kind'>): IDropIndex;
    columnDef(props: Omit<IColumnDef, 'kind'>): IColumnDef;
    tableConstraint(props: Omit<ITableConstraint, 'kind'>): ITableConstraint;

    // helpers
    and(...parts: (INode | null | undefined)[]): INode | null;
    or(...parts: (INode | null | undefined)[]): INode | null;
    eq(l: INode, r: INode): IBinaryOp;
    ne(l: INode, r: INode): IBinaryOp;
    lt(l: INode, r: INode): IBinaryOp;
    le(l: INode, r: INode): IBinaryOp;
    gt(l: INode, r: INode): IBinaryOp;
    ge(l: INode, r: INode): IBinaryOp;
    isDistinct(l: INode, r: INode): IBinaryOp;
    isNotDistinct(l: INode, r: INode): IBinaryOp;

    // tags
    tag(key: string, value: any): ITag;
    tags(list: ITag[], query?: INode | null): ITagsList;
};

// ──────────────────────────────────────────────────────────────────────────────
// Serializer
// ──────────────────────────────────────────────────────────────────────────────

export interface SerializeEnvelope {
    $schema: 'mqb-ast/1';
    version: number;
    allowRaw: boolean;
    root: object;
}

export interface SerializeOptions {
    allowRaw?: boolean;
}
export interface DeserializeOptions {
    allowRaw?: boolean;
    strict?: boolean;
}

export declare function serialize(
    root: INode,
    opts?: SerializeOptions
): SerializeEnvelope;
export declare function deserialize(
    envelope: SerializeEnvelope | object,
    opts?: DeserializeOptions
): INode;
export declare function toJSONString(
    root: INode,
    opts?: SerializeOptions
): string;
export declare function fromJSONString(
    str: string,
    opts?: DeserializeOptions
): INode;

// ──────────────────────────────────────────────────────────────────────────────
// Прочее
// ──────────────────────────────────────────────────────────────────────────────

export declare function print(
    root: INode,
    dialect: Dialect,
    opts?: { paramStyle?: 'positional' | 'named' }
): PrintResult;
export declare function normalizeWhere(
    where: any,
    opts?: { resolveColumn?: (attr: string) => INode }
): INode | null;
export declare function hoistCtes(query: IQuery): IQuery;
export declare function hoistTags(query: IQuery): IQuery;
