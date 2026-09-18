export interface IField {
    field: string;
    type: string;
    default: string;
    increment: boolean;
    len: number;
    notnull: boolean;
    unique: boolean;
}

export interface IKey {
    name: string;
    fields: Record<string, Record<string, string>>;
    settings: {
        primaryKey: boolean;
        unique: boolean;
    };
}

export interface IFieldsSettings {
    insert: Record<string, boolean>;
    update: Record<string, IField>;
    delete: Record<string, boolean>;
}

export interface ISynch {
    Fields?: Record<string, IField>;
    fieldsSettings?: IFieldsSettings;
    Keys?: Record<string, IKey>;
    typeMapping?: Record<string, string>;
    resultAsArray?: boolean;
    noSupportSerial?: boolean;
    noSupportDefault?: boolean;
    noSupportUnique?: boolean;
    noSupportNotNull?: boolean;
    noSupportPK?: boolean;
    recreateKeys?: boolean;
}

export type ICastType =
    | 'UUID'
    | 'REF'
    | 'TEXT'
    | 'STRING'
    | 'INTEGER'
    | 'FLOAT'
    | 'DATE'
    | 'DATETIME'
    | 'TIMESTAMP'
    | 'BOOLEAN';

export type IJoinType = 'inner' | 'left' | 'right' | 'cross' | 'no';

// ──────────────────────────────────────────────────────────────────────────────
// Connector — контракт AbstractConnector (базовый класс всех коннекторов)
// ──────────────────────────────────────────────────────────────────────────────

import type { INode, Dialect, PrintResult } from '../../../query-builder/types';

/** Параметры `query` / `querySql`. */
export interface IQueryOptions {
    timeOut?: number;
    tags?: object;
    transaction?: any;
}

/** Общие опции DML-операций (insert / update / delete / bulkInsert). */
export interface IConnectorWriteOptions {
    schema?: string;
    onConflict?: {
        fields: string[];
        action?: 'update' | 'nothing';
        updateOn?: string[];
    };
    returning?: string[] | boolean;
    where?: any;
    rls?: boolean;
    transaction?: any;
}

/** Результат выполнения DML через `exec` / `synch`. */
export type IConnectorExecResult =
    | any[]
    | string
    | { result: boolean; data: any };

/** Интерфейс, описывающий публичный контракт `AbstractConnector`. */
export interface IConnector {
    // ── Поля ──
    settings: Record<string, any>;
    dbhash: string;
    connector: any;
    dialect: Dialect;

    // ── Подключение ──
    connect(): Promise<void>;
    close(): Promise<void>;
    transaction(
        transaction?: any
    ): { commit: () => void; rollback: () => void };

    // ── Компиляция AST -> SQL ──
    compile(
        ast: INode,
        options?: { split?: boolean; hoist?: boolean }
    ): PrintResult;

    // ── Выборка ──
    query(ast: string | INode, options?: IQueryOptions): Promise<object[]>;
    stream(ast: INode, options?: any): AsyncGenerator<any[], void, unknown>;

    // deprecated: текст-SQL поверхность (обратная совместимость)
    querySql(sql: string, options?: any): Promise<object[]>;
    findAll(
        from: string | { table: string; alias: string },
        options: any
    ): Promise<object[]>;
    count(
        table: string | { table: string; alias: string },
        options?: any
    ): Promise<number>;

    // ── DML ──
    exec(ast: INode, options?: any): Promise<IConnectorExecResult>;
    insert(
        table: string,
        row: object,
        options?: IConnectorWriteOptions
    ): Promise<IConnectorExecResult>;
    bulkInsert(
        table: string,
        rows: object[],
        options?: IConnectorWriteOptions
    ): Promise<IConnectorExecResult>;
    update(
        table: string,
        values: object,
        options: IConnectorWriteOptions
    ): Promise<boolean>;
    delete(table: string, options: IConnectorWriteOptions): Promise<boolean>;

    // deprecated
    upsert(table: any, values: any, options: any): Promise<any>;
    create(table: any, values: any, options?: any): Promise<any>;
    bulkCreate(table: any, values: any, options: any): Promise<any>;

    // ── Интроспекция ──
    introspectColumns(
        table: string,
        schema?: string
    ): Promise<Record<string, { name: string; type: string }>>;
    isTableExist(table: string, schema?: string): Promise<boolean>;
    model(
        table: string,
        options?: any
    ): Promise<Record<string, { name: string; type: string }>>;

    // ── DDL / schema sync ──
    synch(table: string, options?: ISynch): Promise<any>;
    drop(table: any, options: any): Promise<any>;
    getAllActiveIndexes(table: string, schema?: string): Promise<Array<any>>;
    getAllConstrains(table: string, schema?: string): Promise<Array<any>>;
    _typeToDataType(
        rawType: string,
        options?: {
            typeMapping?: Record<string, string>;
            noSupportSerial?: boolean;
        }
    ): INode;
    buildAddIndexSQL(schema: string, table: string, fields: string[]): INode;
    buildDropIndexSQL(schema: string, table: string, key: any): INode;
}

/**
 * Внутренние (protected) helper-методы AbstractConnector.
 * Описывают реализационные детали DML/DML-sync, не входящие в публичный контракт.
 */
export interface IConnectorProtected {
    getSslCredentials(opts: {
        ca?: string;
        cert?: string;
        key?: string;
    }): Promise<{ ca?: string; cert?: string; key?: string }>;
    _bulkInsert(
        table: string,
        rows: object[],
        options?: IConnectorWriteOptions
    ): Promise<INode | null>;
    _insert(
        table: string,
        row: object,
        options?: IConnectorWriteOptions
    ): Promise<INode | null>;
    _update(
        table: string,
        values: object,
        options: IConnectorWriteOptions
    ): INode;
    _delete(table: string, options: IConnectorWriteOptions): INode;
    _synch(table: string, options?: ISynch): Promise<INode | INode[]>;
    _drop(
        table: string,
        options?: { ifExists?: boolean; cascade?: boolean; temp?: boolean }
    ): INode;
    _getRlsFilter(table: string, type?: string): any;
    _queuedBulkInsert(
        table: any,
        values: any,
        options: any,
        callback: Function
    ): Promise<any>;
}

/**
 * Статическое «лицо» AbstractConnector — статические методы-хелперы.
 * Проверяется типом конструктора класса (typeof AbstractConnector).
 */
export interface IConnectorStatic {
    /** Вычисление хэша настроек подключения для пула. */
    getHash(settings: Record<string, any>): string;
    generateKeys(keys?: object | null): {
        primaryKeys: string[];
        uniqueKeys: Array<{ name?: string; fields: string[] }>;
        indexes: Array<{ name?: string; fields: string[]; unique?: boolean }>;
    };
    _extractFields(fields: any): string[];
}

export type TConnectionMeta = {
    field: string;
    type?: ICastType;
};

export interface IConnectionField {
    left: TConnectionMeta;
    right: TConnectionMeta;
}

export interface IFieldMapping {
    left: TConnectionMeta;
    right: TConnectionMeta;
}

export interface IWithOption {
    connectionFields: IConnectionField[];
    mapping: IFieldMapping[];
    type: IJoinType;
    query: string;
    name?: string;
    cast?: boolean;
    id?: string;
}

export interface IFieldRecursive {
    field: string;
    type: string;
}

export interface IFindAllChildren {
    pk: IFieldRecursive; // PRIMARY KEY
    view?: IFieldRecursive; // VIEW FIELD
    parent: IFieldRecursive; // PARENT FIELD
    where?: object; // FILTRATION OBJECT OB GUIDE
    guideAttrs: string[]; // GUIDE ATTRIBUTES TO RETURN
}

export type ICastType =
    | 'UUID'
    | 'REF'
    | 'TEXT'
    | 'STRING'
    | 'INTEGER'
    | 'FLOAT'
    | 'DATE'
    | 'DATETIME'
    | 'TIMESTAMP'
    | 'BOOLEAN';
