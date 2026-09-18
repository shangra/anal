declare namespace _exports {
    export { Options, ISequelize };
}
declare const _exports: {
    fn: typeof import("sequelize").fn;
    col: typeof import("sequelize").col;
    cast: typeof import("sequelize").cast;
    literal: typeof import("sequelize").literal;
    and: typeof import("sequelize").and;
    or: typeof import("sequelize").or;
    json: typeof import("sequelize").json;
    where: typeof import("sequelize").where;
    Sequelize: typeof Sequelize;
    readonly config: import("sequelize").Config;
    readonly modelManager: import("sequelize/types/model-manager").ModelManager;
    readonly connectionManager: import("sequelize/types/dialects/abstract/connection-manager").ConnectionManager;
    readonly models: {
        [key: string]: import("sequelize").ModelCtor<import("sequelize").Model>;
    };
    beforeValidate(name: string, fn: (instance: import("sequelize").Model, options: import("sequelize/types/instance-validator").ValidationOptions) => void): void;
    beforeValidate(fn: (instance: import("sequelize").Model, options: import("sequelize/types/instance-validator").ValidationOptions) => void): void;
    afterValidate(name: string, fn: (instance: import("sequelize").Model, options: import("sequelize/types/instance-validator").ValidationOptions) => void): void;
    afterValidate(fn: (instance: import("sequelize").Model, options: import("sequelize/types/instance-validator").ValidationOptions) => void): void;
    beforeCreate(name: string, fn: (attributes: import("sequelize").Model, options: import("sequelize").CreateOptions<any>) => void): void;
    beforeCreate(fn: (attributes: import("sequelize").Model, options: import("sequelize").CreateOptions<any>) => void): void;
    afterCreate(name: string, fn: (attributes: import("sequelize").Model, options: import("sequelize").CreateOptions<any>) => void): void;
    afterCreate(fn: (attributes: import("sequelize").Model, options: import("sequelize").CreateOptions<any>) => void): void;
    beforeDestroy(name: string, fn: (instance: import("sequelize").Model, options: import("sequelize").InstanceDestroyOptions) => void): void;
    beforeDestroy(fn: (instance: import("sequelize").Model, options: import("sequelize").InstanceDestroyOptions) => void): void;
    afterDestroy(name: string, fn: (instance: import("sequelize").Model, options: import("sequelize").InstanceDestroyOptions) => void): void;
    afterDestroy(fn: (instance: import("sequelize").Model, options: import("sequelize").InstanceDestroyOptions) => void): void;
    beforeUpdate(name: string, fn: (instance: import("sequelize").Model, options: import("sequelize").UpdateOptions<any>) => void): void;
    beforeUpdate(fn: (instance: import("sequelize").Model, options: import("sequelize").UpdateOptions<any>) => void): void;
    afterUpdate(name: string, fn: (instance: import("sequelize").Model, options: import("sequelize").UpdateOptions<any>) => void): void;
    afterUpdate(fn: (instance: import("sequelize").Model, options: import("sequelize").UpdateOptions<any>) => void): void;
    beforeBulkCreate(name: string, fn: (instances: import("sequelize").Model[], options: import("sequelize").BulkCreateOptions<any>) => void): void;
    beforeBulkCreate(fn: (instances: import("sequelize").Model[], options: import("sequelize").BulkCreateOptions<any>) => void): void;
    afterBulkCreate(name: string, fn: (instances: import("sequelize").Model[], options: import("sequelize").BulkCreateOptions<any>) => void): void;
    afterBulkCreate(fn: (instances: import("sequelize").Model[], options: import("sequelize").BulkCreateOptions<any>) => void): void;
    beforeBulkDestroy(name: string, fn: (options: import("sequelize").BulkCreateOptions<any>) => void): void;
    beforeBulkDestroy(fn: (options: import("sequelize").BulkCreateOptions<any>) => void): void;
    afterBulkDestroy(name: string, fn: (options: import("sequelize").DestroyOptions<any>) => void): void;
    afterBulkDestroy(fn: (options: import("sequelize").DestroyOptions<any>) => void): void;
    beforeBulkUpdate(name: string, fn: (options: import("sequelize").UpdateOptions<any>) => void): void;
    beforeBulkUpdate(fn: (options: import("sequelize").UpdateOptions<any>) => void): void;
    afterBulkUpdate(name: string, fn: (options: import("sequelize").UpdateOptions<any>) => void): void;
    afterBulkUpdate(fn: (options: import("sequelize").UpdateOptions<any>) => void): void;
    beforeFind(name: string, fn: (options: import("sequelize").FindOptions<any>) => void): void;
    beforeFind(fn: (options: import("sequelize").FindOptions<any>) => void): void;
    beforeFindAfterExpandIncludeAll(name: string, fn: (options: import("sequelize").FindOptions<any>) => void): void;
    beforeFindAfterExpandIncludeAll(fn: (options: import("sequelize").FindOptions<any>) => void): void;
    beforeFindAfterOptions(name: string, fn: (options: import("sequelize").FindOptions<any>) => void): void;
    beforeFindAfterOptions(fn: (options: import("sequelize").FindOptions<any>) => void): void;
    afterFind(name: string, fn: (instancesOrInstance: import("sequelize").Model[] | import("sequelize").Model | null, options: import("sequelize").FindOptions<any>) => void): void;
    afterFind(fn: (instancesOrInstance: import("sequelize").Model[] | import("sequelize").Model | null, options: import("sequelize").FindOptions<any>) => void): void;
    beforeDefine(name: string, fn: (attributes: import("sequelize").ModelAttributes<import("sequelize").Model, any>, options: import("sequelize").ModelOptions) => void): void;
    beforeDefine(fn: (attributes: import("sequelize").ModelAttributes<import("sequelize").Model, any>, options: import("sequelize").ModelOptions) => void): void;
    afterDefine(name: string, fn: (model: import("sequelize").ModelType) => void): void;
    afterDefine(fn: (model: import("sequelize").ModelType) => void): void;
    beforeInit(name: string, fn: (config: import("sequelize").Config, options: import("sequelize").Options) => void): void;
    beforeInit(fn: (config: import("sequelize").Config, options: import("sequelize").Options) => void): void;
    afterInit(name: string, fn: (sequelize: Sequelize) => void): void;
    afterInit(fn: (sequelize: Sequelize) => void): void;
    beforeBulkSync(name: string, fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    beforeBulkSync(fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterBulkSync(name: string, fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterBulkSync(fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    beforeSync(name: string, fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    beforeSync(fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterSync(name: string, fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterSync(fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    getDialect(): string;
    getDatabaseName(): string;
    getQueryInterface(): import("sequelize").QueryInterface;
    define<M extends import("sequelize").Model, TAttributes = import("sequelize").Attributes<M>>(modelName: string, attributes: import("sequelize").ModelAttributes<M, TAttributes>, options?: import("sequelize").ModelOptions<M>): import("sequelize").ModelCtor<M>;
    model(modelName: string): import("sequelize").ModelCtor<import("sequelize").Model>;
    isDefined(modelName: string): boolean;
    query(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").UPDATE>): Promise<[undefined, number]>;
    query(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").BULKUPDATE>): Promise<number>;
    query(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").INSERT>): Promise<[number, number]>;
    query(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").UPSERT>): Promise<number>;
    query(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").DELETE>): Promise<void>;
    query(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").BULKDELETE>): Promise<number>;
    query(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").SHOWTABLES>): Promise<string[]>;
    query(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").DESCRIBE>): Promise<import("sequelize").ColumnsDescription>;
    query<M extends import("sequelize").Model>(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithModel<M> & {
        plain: true;
    }): Promise<M | null>;
    query<M extends import("sequelize").Model>(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithModel<M>): Promise<M[]>;
    query<T extends object>(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").SELECT> & {
        plain: true;
    }): Promise<T | null>;
    query<T extends object>(sql: string | {
        query: string;
        values: unknown[];
    }, options: import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").SELECT>): Promise<T[]>;
    query(sql: string | {
        query: string;
        values: unknown[];
    }, options: (import("sequelize").QueryOptions | import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").RAW>) & {
        plain: true;
    }): Promise<{
        [key: string]: unknown;
    } | null>;
    query(sql: string | {
        query: string;
        values: unknown[];
    }, options?: import("sequelize").QueryOptions | import("sequelize").QueryOptionsWithType<import("sequelize/types/query-types").RAW>): Promise<[unknown[], unknown]>;
    random(): import("sequelize/types/utils").Fn;
    set(variables: object, options: import("sequelize").QueryOptionsTransactionRequired): Promise<unknown>;
    escape(value: string | number | Date): string;
    createSchema(schema: string, options: import("sequelize").Logging): Promise<unknown>;
    showAllSchemas(options: import("sequelize").Logging): Promise<object[]>;
    dropSchema(schema: string, options: import("sequelize").Logging): Promise<unknown[]>;
    dropAllSchemas(options: import("sequelize").Logging): Promise<unknown[]>;
    sync(options?: import("sequelize").SyncOptions): Promise<Sequelize>;
    truncate(options?: import("sequelize").DestroyOptions<any>): Promise<unknown[]>;
    drop(options?: import("sequelize").DropOptions): Promise<unknown[]>;
    authenticate(options?: import("sequelize").QueryOptions): Promise<void>;
    validate(options?: import("sequelize").QueryOptions): Promise<void>;
    transaction<T>(options: import("sequelize").TransactionOptions, autoCallback: (t: import("sequelize").Transaction) => PromiseLike<T>): Promise<T>;
    transaction<T>(autoCallback: (t: import("sequelize").Transaction) => PromiseLike<T>): Promise<T>;
    transaction(options?: import("sequelize").TransactionOptions): Promise<import("sequelize").Transaction>;
    close(): Promise<void>;
    databaseVersion(): Promise<string>;
    _model: import("sequelize").Model<any, any>;
    _attributes: any;
    _creationAttributes: any;
    addHook<K extends keyof import("sequelize/types/hooks").SequelizeHooks<M, TModelAttributes, TCreationAttributes>>(hookType: K, name: string, fn: import("sequelize/types/hooks").SequelizeHooks<import("sequelize").Model<any, any>, any, any>[K]): Sequelize;
    addHook<K extends keyof import("sequelize/types/hooks").SequelizeHooks<M, TModelAttributes, TCreationAttributes>>(hookType: K, fn: import("sequelize/types/hooks").SequelizeHooks<import("sequelize").Model<any, any>, any, any>[K]): Sequelize;
    removeHook<K extends keyof import("sequelize/types/hooks").SequelizeHooks<M, TModelAttributes, TCreationAttributes>>(hookType: K, name: string): Sequelize;
    hasHook<K extends keyof import("sequelize/types/hooks").SequelizeHooks<M, TModelAttributes, TCreationAttributes>>(hookType: K): boolean;
    hasHooks<K extends keyof import("sequelize/types/hooks").SequelizeHooks<M, TModelAttributes, TCreationAttributes>>(hookType: K): boolean;
};
export = _exports;
type Options = import("sequelize").Options;
type ISequelize = import("sequelize").Sequelize;
import { Sequelize } from "sequelize/types/sequelize";
//# sourceMappingURL=connection.d.ts.map