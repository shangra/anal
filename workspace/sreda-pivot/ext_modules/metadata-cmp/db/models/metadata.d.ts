declare namespace _exports {
    export { IMetadata };
}
declare function _exports(sequelize: any, DataTypes: any): {
    new (values?: import("sequelize").Optional<any, string>, options?: import("sequelize").BuildOptions): {
        _attributes: any;
        dataValues: any;
        _creationAttributes: any;
        isNewRecord: boolean;
        sequelize: import("sequelize").Sequelize;
        where(): object;
        getDataValue<K extends string | number | symbol>(key: K): any;
        setDataValue<K extends string | number | symbol>(key: K, value: any): void;
        get(options?: {
            plain?: boolean;
            clone?: boolean;
        }): any;
        get<K extends keyof any>(key: K, options?: {
            plain?: boolean;
            clone?: boolean;
        }): any[K];
        get(key: string, options?: {
            plain?: boolean;
            clone?: boolean;
        }): unknown;
        set<K extends string | number | symbol>(key: K, value: any, options?: import("sequelize").SetOptions): any;
        set(keys: Partial<any>, options?: import("sequelize").SetOptions): any;
        setAttributes<K extends string | number | symbol>(key: K, value: any, options?: import("sequelize").SetOptions): any;
        setAttributes(keys: Partial<any>, options?: import("sequelize").SetOptions): any;
        changed<K extends keyof any>(key: K): boolean;
        changed<K extends keyof any>(key: K, dirty: boolean): void;
        changed(): false | string[];
        previous(): Partial<any>;
        previous<K extends string | number | symbol>(key: K): any;
        save(options?: import("sequelize").SaveOptions<any>): Promise<any>;
        reload(options?: import("sequelize").FindOptions<any>): Promise<any>;
        validate(options?: import("sequelize/types/instance-validator").ValidationOptions): Promise<void>;
        update<K extends string | number | symbol>(key: K, value: any, options?: import("sequelize").InstanceUpdateOptions<any>): Promise<any>;
        update(keys: {
            [x: string]: any;
        }, options?: import("sequelize").InstanceUpdateOptions<any>): Promise<any>;
        destroy(options?: import("sequelize").InstanceDestroyOptions): Promise<void>;
        restore(options?: import("sequelize").InstanceRestoreOptions): Promise<void>;
        increment<K extends string | number | symbol>(fields: Partial<any> | K | readonly K[], options?: import("sequelize").IncrementDecrementOptionsWithBy<any>): Promise<any>;
        decrement<K extends string | number | symbol>(fields: Partial<any> | K | readonly K[], options?: import("sequelize").IncrementDecrementOptionsWithBy<any>): Promise<any>;
        equals(other: any): boolean;
        equalsOneOf(others: readonly any[]): boolean;
        toJSON<T extends any>(): T;
        toJSON(): object;
        isSoftDeleted(): boolean;
        _model: import("sequelize").Model<any, any>;
        addHook<K extends keyof import("sequelize/types/hooks").SequelizeHooks<import("sequelize").Model<any, any>, any, any>>(hookType: K, name: string, fn: import("sequelize/types/hooks").SequelizeHooks<import("sequelize").Model<any, any>, any, any>[K]): any;
        addHook<K extends keyof import("sequelize/types/hooks").SequelizeHooks<import("sequelize").Model<any, any>, any, any>>(hookType: K, fn: import("sequelize/types/hooks").SequelizeHooks<import("sequelize").Model<any, any>, any, any>[K]): any;
        removeHook<K extends keyof import("sequelize/types/hooks").SequelizeHooks<import("sequelize").Model<any, any>, any, any>>(hookType: K, name: string): any;
        hasHook<K extends keyof import("sequelize/types/hooks").SequelizeHooks<import("sequelize").Model<any, any>, any, any>>(hookType: K): boolean;
        hasHooks<K extends keyof import("sequelize/types/hooks").SequelizeHooks<import("sequelize").Model<any, any>, any, any>>(hookType: K): boolean;
    };
    associate({ Page, PageParam, Template, User, UserInfo, UserData }: {
        Page: any;
        PageParam: any;
        Template: any;
        User: any;
        UserInfo: any;
        UserData: any;
    }): void;
    showAll<T>(this: ModelThis<T>, options: Where<T>): Promise<T[]>;
    countShow<T_1 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_1>, options: Where<T_1>): Promise<import("sequelize").GroupedCountResultItem[]>;
    countFind<T_2 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_2>, options: Where<T_2>): Promise<import("sequelize").GroupedCountResultItem[]>;
    showOne<T_3 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_3>, options: Where<T_3>): Promise<T_3>;
    findAll<T_4 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_4>, options: Where<T_4>): Promise<T_4[]>;
    findOne<T_5 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_5>, options: Where<T_5>): Promise<T_5>;
    setPermission<T_6 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_6>, rls: any, tableId: any, ownerIds: any, owner: any, type: any): any;
    setPermissions<T_7 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_7>, rls: import("../../../../db/rls/RLSManager").RLSManager, rlsOptions: Record<string, string[]> & {
        default: {
            [key: string]: {
                [key: string]: string[];
            };
        };
    }, records: object[]): Promise<void>;
    create<M extends import("sequelize").Model<any, any>>(this: ModelThis<M>, values: CreationAttributes<M>, options?: Where<M>): Promise<void | M>;
    bulkCreate<T_8 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_8>, values: any, bulkOptions: any): Promise<import("sequelize").Model<{}, {}>[]>;
    getIds<T_9 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_9>, options: Where<T_9> & {
        where: {
            id: string | string[];
        };
    }): Promise<DataValueIds[]>;
    update<T_10 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_10>, values: any, options: any): Promise<[affectedCount: number, affectedRows: import("sequelize").Model<{}, {}>[]]>;
    findOrCreate<T_11 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_11>, options: any): Promise<[T_11 & {
        created: boolean;
    }, boolean]>;
    destroy<T_12 extends import("sequelize").Model<{}, {}>>(this: ModelThis<T_12>, options: Where): Promise<number>;
    readonly tableName: string;
    readonly primaryKeyAttribute: string;
    readonly primaryKeyAttributes: readonly string[];
    readonly associations: {
        [key: string]: import("sequelize").Association;
    };
    readonly options: import("sequelize").InitOptions;
    readonly rawAttributes: {
        [attribute: string]: import("sequelize").ModelAttributeColumnOptions;
    };
    getAttributes<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>): { readonly [Key in keyof import("sequelize").Attributes<M>]: import("sequelize").ModelAttributeColumnOptions; };
    readonly sequelize?: import("sequelize").Sequelize;
    init<MS extends import("sequelize").ModelStatic<import("sequelize").Model>, M extends InstanceType<MS>>(this: MS, attributes: import("sequelize").ModelAttributes<M, import("sequelize").Optional<import("sequelize").Attributes<M>, (import("sequelize").Attributes<M> extends infer T_3 ? { [P in keyof T_3]-?: (keyof NonNullable<import("sequelize").Attributes<M>[P]> extends Exclude<keyof NonNullable<import("sequelize").Attributes<M>[P]>, unique symbol> ? false : true) extends true ? P : never; } : never)[keyof import("sequelize").Attributes<M>]>>, options: import("sequelize").InitOptions<M>): MS;
    removeAttribute(attribute: string): void;
    sync<M extends import("sequelize").Model>(options?: import("sequelize").SyncOptions): Promise<M>;
    drop(options?: import("sequelize").DropOptions): Promise<void>;
    schema<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, schema: string, options?: import("sequelize").SchemaOptions): import("sequelize").ModelCtor<M>;
    getTableName(): string | {
        tableName: string;
        schema: string;
        delimiter: string;
    };
    scope<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, options?: string | import("sequelize").ScopeOptions | readonly (string | import("sequelize").ScopeOptions)[] | import("sequelize").WhereAttributeHash<M>): import("sequelize").ModelCtor<M>;
    addScope<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, scope: import("sequelize").FindOptions<import("sequelize").Attributes<M>>, options?: import("sequelize").AddScopeOptions): void;
    addScope<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, scope: (...args: readonly any[]) => import("sequelize").FindOptions<import("sequelize").Attributes<M>>, options?: import("sequelize").AddScopeOptions): void;
    findByPk<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, identifier: import("sequelize").Identifier, options: Omit<import("sequelize").NonNullFindOptions<import("sequelize").Attributes<M>>, "where">): Promise<M>;
    findByPk<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, identifier?: import("sequelize").Identifier, options?: Omit<import("sequelize").FindOptions<import("sequelize").Attributes<M>>, "where">): Promise<M | null>;
    aggregate<T, M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, field: keyof import("sequelize").Attributes<M> | "*", aggregateFunction: string, options?: import("sequelize").AggregateOptions<T, import("sequelize").Attributes<M>>): Promise<T>;
    count<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, options: import("sequelize").CountWithOptions<import("sequelize").Attributes<M>>): Promise<import("sequelize").GroupedCountResultItem[]>;
    count<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, options?: Omit<import("sequelize").CountOptions<import("sequelize").Attributes<M>>, "group">): Promise<number>;
    findAndCountAll<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, options?: Omit<import("sequelize").FindAndCountOptions<import("sequelize").Attributes<M>>, "group">): Promise<{
        rows: M[];
        count: number;
    }>;
    findAndCountAll<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, options: import("sequelize/types/utils/set-required").SetRequired<import("sequelize").FindAndCountOptions<import("sequelize").Attributes<M>>, "group">): Promise<{
        rows: M[];
        count: import("sequelize").GroupedCountResultItem[];
    }>;
    max<T extends import("sequelize").DataType | unknown, M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, field: keyof import("sequelize").Attributes<M>, options?: import("sequelize").AggregateOptions<T, import("sequelize").Attributes<M>>): Promise<T>;
    min<T extends import("sequelize").DataType | unknown, M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, field: keyof import("sequelize").Attributes<M>, options?: import("sequelize").AggregateOptions<T, import("sequelize").Attributes<M>>): Promise<T>;
    sum<T extends import("sequelize").DataType | unknown, M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, field: keyof import("sequelize").Attributes<M>, options?: import("sequelize").AggregateOptions<T, import("sequelize").Attributes<M>>): Promise<number>;
    build<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, record?: import("sequelize").CreationAttributes<M>, options?: import("sequelize").BuildOptions): M;
    bulkBuild<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, records: ReadonlyArray<import("sequelize").CreationAttributes<M>>, options?: import("sequelize").BuildOptions): M[];
    findOrBuild<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, options: import("sequelize").FindOrBuildOptions<import("sequelize").Attributes<M>, import("sequelize").CreationAttributes<M>>): Promise<[M, boolean]>;
    findCreateFind<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, options: import("sequelize").FindOrCreateOptions<import("sequelize").Attributes<M>, import("sequelize").CreationAttributes<M>>): Promise<[M, boolean]>;
    upsert<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, values: import("sequelize").CreationAttributes<M>, options?: import("sequelize").UpsertOptions<import("sequelize").Attributes<M>>): Promise<[M, boolean | null]>;
    truncate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, options?: import("sequelize").TruncateOptions<import("sequelize").Attributes<M>>): Promise<void>;
    restore<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, options?: import("sequelize").RestoreOptions<import("sequelize").Attributes<M>>): Promise<void>;
    increment<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fields: import("sequelize").AllowReadonlyArray<keyof import("sequelize").Attributes<M>>, options: import("sequelize").IncrementDecrementOptionsWithBy<import("sequelize").Attributes<M>>): Promise<[affectedRows: M[], affectedCount?: number]>;
    increment<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fields: { [key in keyof import("sequelize").Attributes<M>]?: number; }, options: import("sequelize").IncrementDecrementOptions<import("sequelize").Attributes<M>>): Promise<[affectedRows: M[], affectedCount?: number]>;
    decrement<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fields: import("sequelize").AllowReadonlyArray<keyof import("sequelize").Attributes<M>>, options: import("sequelize").IncrementDecrementOptionsWithBy<import("sequelize").Attributes<M>>): Promise<[affectedRows: M[], affectedCount?: number]>;
    decrement<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fields: { [key in keyof import("sequelize").Attributes<M>]?: number; }, options: import("sequelize").IncrementDecrementOptions<import("sequelize").Attributes<M>>): Promise<[affectedRows: M[], affectedCount?: number]>;
    describe(): Promise<object>;
    unscoped<M extends import("sequelize").ModelType>(this: M): M;
    beforeValidate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instance: M, options: import("sequelize/types/instance-validator").ValidationOptions) => import("sequelize/types/hooks").HookReturn): void;
    beforeValidate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instance: M, options: import("sequelize/types/instance-validator").ValidationOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterValidate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instance: M, options: import("sequelize/types/instance-validator").ValidationOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterValidate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instance: M, options: import("sequelize/types/instance-validator").ValidationOptions) => import("sequelize/types/hooks").HookReturn): void;
    beforeCreate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instance: M, options: import("sequelize").CreateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeCreate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instance: M, options: import("sequelize").CreateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterCreate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instance: M, options: import("sequelize").CreateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterCreate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instance: M, options: import("sequelize").CreateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeDestroy<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instance: M, options: import("sequelize").InstanceDestroyOptions) => import("sequelize/types/hooks").HookReturn): void;
    beforeDestroy<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instance: M, options: import("sequelize").InstanceDestroyOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterDestroy<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instance: M, options: import("sequelize").InstanceDestroyOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterDestroy<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instance: M, options: import("sequelize").InstanceDestroyOptions) => import("sequelize/types/hooks").HookReturn): void;
    beforeUpdate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instance: M, options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeUpdate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instance: M, options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterUpdate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instance: M, options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterUpdate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instance: M, options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeSave<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instance: M, options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>> | import("sequelize").SaveOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeSave<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instance: M, options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>> | import("sequelize").SaveOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterSave<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instance: M, options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>> | import("sequelize").SaveOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterSave<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instance: M, options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>> | import("sequelize").SaveOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeBulkCreate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instances: M[], options: import("sequelize").BulkCreateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeBulkCreate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instances: M[], options: import("sequelize").BulkCreateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterBulkCreate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instances: readonly M[], options: import("sequelize").BulkCreateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterBulkCreate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instances: readonly M[], options: import("sequelize").BulkCreateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeBulkDestroy<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (options: import("sequelize").BulkCreateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeBulkDestroy<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (options: import("sequelize").BulkCreateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterBulkDestroy<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (options: import("sequelize").DestroyOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterBulkDestroy<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (options: import("sequelize").DestroyOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeBulkUpdate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeBulkUpdate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterBulkUpdate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterBulkUpdate<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (options: import("sequelize").UpdateOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeFind<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (options: import("sequelize").FindOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeFind<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (options: import("sequelize").FindOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeCount<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (options: import("sequelize").CountOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeCount<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (options: import("sequelize").CountOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeFindAfterExpandIncludeAll<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (options: import("sequelize").FindOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeFindAfterExpandIncludeAll<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (options: import("sequelize").FindOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeFindAfterOptions<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (options: import("sequelize").FindOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeFindAfterOptions<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (options: import("sequelize").FindOptions<import("sequelize").Attributes<M>>) => void): import("sequelize/types/hooks").HookReturn;
    afterFind<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, name: string, fn: (instancesOrInstance: readonly M[] | M | null, options: import("sequelize").FindOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    afterFind<M extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, fn: (instancesOrInstance: readonly M[] | M | null, options: import("sequelize").FindOptions<import("sequelize").Attributes<M>>) => import("sequelize/types/hooks").HookReturn): void;
    beforeBulkSync(name: string, fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    beforeBulkSync(fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterBulkSync(name: string, fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterBulkSync(fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    beforeSync(name: string, fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    beforeSync(fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterSync(name: string, fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    afterSync(fn: (options: import("sequelize").SyncOptions) => import("sequelize/types/hooks").HookReturn): void;
    hasOne<M extends import("sequelize").Model, T extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, target: import("sequelize").ModelStatic<T>, options?: import("sequelize").HasOneOptions): import("sequelize").HasOne<M, T>;
    belongsTo<M extends import("sequelize").Model, T extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, target: import("sequelize").ModelStatic<T>, options?: import("sequelize").BelongsToOptions): import("sequelize").BelongsTo<M, T>;
    hasMany<M extends import("sequelize").Model, T extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, target: import("sequelize").ModelStatic<T>, options?: import("sequelize").HasManyOptions): import("sequelize").HasMany<M, T>;
    belongsToMany<M extends import("sequelize").Model, T extends import("sequelize").Model>(this: import("sequelize").ModelStatic<M>, target: import("sequelize").ModelStatic<T>, options: import("sequelize").BelongsToManyOptions): import("sequelize").BelongsToMany<M, T>;
    addHook<H extends import("sequelize/types/hooks").Hooks, K extends keyof import("sequelize/types/hooks").SequelizeHooks<H["_model"], import("sequelize").Attributes<H>, import("sequelize").CreationAttributes<H>>>(this: import("sequelize/types/hooks").HooksStatic<H>, hookType: K, name: string, fn: import("sequelize/types/hooks").SequelizeHooks<H["_model"], import("sequelize").Attributes<H>, import("sequelize").CreationAttributes<H>>[K]): import("sequelize/types/hooks").HooksCtor<H>;
    addHook<H extends import("sequelize/types/hooks").Hooks, K extends keyof import("sequelize/types/hooks").SequelizeHooks<H["_model"], import("sequelize").Attributes<H>, import("sequelize").CreationAttributes<H>>>(this: import("sequelize/types/hooks").HooksStatic<H>, hookType: K, fn: import("sequelize/types/hooks").SequelizeHooks<H["_model"], import("sequelize").Attributes<H>, import("sequelize").CreationAttributes<H>>[K]): import("sequelize/types/hooks").HooksCtor<H>;
    removeHook<H extends import("sequelize/types/hooks").Hooks>(this: import("sequelize/types/hooks").HooksStatic<H>, hookType: keyof import("sequelize/types/hooks").SequelizeHooks<H["_model"], import("sequelize").Attributes<H>, import("sequelize").CreationAttributes<H>>, name: string): import("sequelize/types/hooks").HooksCtor<H>;
    hasHook<H extends import("sequelize/types/hooks").Hooks>(this: import("sequelize/types/hooks").HooksStatic<H>, hookType: keyof import("sequelize/types/hooks").SequelizeHooks<H["_model"], import("sequelize").Attributes<H>, import("sequelize").CreationAttributes<H>>): boolean;
    hasHooks<H extends import("sequelize/types/hooks").Hooks>(this: import("sequelize/types/hooks").HooksStatic<H>, hookType: keyof import("sequelize/types/hooks").SequelizeHooks<H["_model"], import("sequelize").Attributes<H>, import("sequelize").CreationAttributes<H>>): boolean;
};
export = _exports;
type IMetadata = {
    id?: string;
    manifest?: any;
    class?: string;
    class_id?: string;
    name?: string;
    description?: string;
    owner_id?: string;
};
//# sourceMappingURL=metadata.d.ts.map