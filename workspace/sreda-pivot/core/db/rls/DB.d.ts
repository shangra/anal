export = DB;
/**
 * @import { DBStatic, TDBAttributes, TDBCreationAttributes } from "./types"
 * @import { FindOptions, FindOrCreateOptions, CreateOptions, BulkCreateOptions, UpdateOptions, DestroyOptions } from './types/Options'
 * @import { ModelAttributeColumnOptions, Attributes, CreationAttributes } from 'sequelize'
 * @import { Fn, Col, Literal } from 'sequelize/types/utils'
 */
/**
 * @abstract
 * @class DB
 * @template {TDBAttributes} [TModelAttributes=TDBAttributes]
 * @template {TDBCreationAttributes} [TModelCreationAttributes=TModelAttributes]
 * @extends {Model<TModelAttributes, TModelCreationAttributes>}
 */
declare class DB<TModelAttributes extends TDBAttributes = TDBAttributes, TModelCreationAttributes extends TDBCreationAttributes = TModelAttributes> extends Model<TModelAttributes, TModelCreationAttributes> {
    /**
     * @public
     * @template {DB} [M=DB]
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<number>}
     */
    public static countShow<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, options: FindOptions<Attributes<M>>): Promise<number>;
    /**
     * @public
     * @template {DB} [M=DB]
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<number>}
     */
    public static countFind<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, options: FindOptions<Attributes<M>>): Promise<number>;
    /**
     * @public
     * @template {DB} [M=DB]
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<M[]>}
     */
    public static showAll<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, options: FindOptions<Attributes<M>>): Promise<M[]>;
    /**
     * @public
     * @template {DB} [M=DB]
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<M | null>}
     */
    public static showOne<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, options: FindOptions<Attributes<M>>): Promise<M | null>;
    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<M[]>}
     */
    public static override findAll<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, options: FindOptions<Attributes<M>>): Promise<M[]>;
    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @this {DBStatic<M>}
     * @param {FindOptions<Attributes<M>>} options
     * @returns {Promise<M | null>}
     */
    public static override findOne<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, options: FindOptions<Attributes<M>>): Promise<M | null>;
    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @template {CreateOptions<Attributes<M>>} [O=CreateOptions<Attributes<M>>]
     * @this {DBStatic<M>}
     * @param {CreationAttributes<M>} [values]
     * @param {O} [options]
     * @returns {Promise<(O extends { returning: false; } | { ignoreDuplicates: true; } ? void : M) | null>}
     */
    public static override create<M extends DB = DB<TDBAttributes, TDBAttributes>, O extends CreateOptions<Attributes<M>> = CreateOptions<Attributes<M>>>(this: DBStatic<M>, values?: CreationAttributes<M>, options?: O): Promise<(O extends {
        returning: false;
    } | {
        ignoreDuplicates: true;
    } ? void : M) | null>;
    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @this {DBStatic<M>}
     * @param {FindOrCreateOptions<Attributes<M>, CreationAttributes<M>>} options
     * @returns {Promise<[M | null, boolean]>}
     */
    public static override findOrCreate<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, options: FindOrCreateOptions<Attributes<M>, CreationAttributes<M>>): Promise<[M | null, boolean]>;
    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @this {DBStatic<M>}
     * @param {CreationAttributes<M>[]} values
     * @param {BulkCreateOptions<Attributes<M>>} options
     * @returns {Promise<M[] | null>}
     */
    public static override bulkCreate<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, values: CreationAttributes<M>[], options: BulkCreateOptions<Attributes<M>>): Promise<M[] | null>;
    /**
     * @public
     * @override
     * @template {DB} [M=DB]
     * @overload
     * @this {DBStatic<M>}
     * @param {{
     *   [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal;
     * }} values
     * @param {Omit<UpdateOptions<Attributes<M>>, 'returning'>
     *   & { returning: Exclude<UpdateOptions<Attributes<M>>['returning'], undefined | false> }
     * } options
     * @returns {Promise<[affectedCount: number, affectedRows: M[]]>}
     */
    public static override update<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, values: { [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal; }, options: Omit<UpdateOptions<Attributes<M>>, "returning"> & {
        returning: Exclude<UpdateOptions<Attributes<M>>["returning"], undefined | false>;
    }): Promise<[affectedCount: number, affectedRows: M[]]>;
    /**
     * @public
     * @override
     * @template {DB} [M=DB]
     * @overload
     * @this {DBStatic<M>}
     * @param {{
     *   [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal;
     * }} values
     * @param {UpdateOptions<Attributes<M>>} options
     * @returns {Promise<[affectedCount: number]>}
     */
    public static override update<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, values: { [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal; }, options: UpdateOptions<Attributes<M>>): Promise<[affectedCount: number]>;
    /**
     * @public
     * @template {DB} [M=DB]
     * @override
     * @this {DBStatic<M>}
     * @param {DestroyOptions<Attributes<M>>} [options]
     * @returns {Promise<number>}
     */
    public static override destroy<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, options?: DestroyOptions<Attributes<M>>): Promise<number>;
    /**
     * @public
     * @template {DB} [M=DB]
     * @this {DBStatic<M>}
     * @param {string} sqltype
     * @param {string} rlstype
     * @param {FindOptions<Attributes<M>>} options
     * @returns {FindOptions<Attributes<M>>}
     */
    public static mkRlsOptions<M extends DB = DB<TDBAttributes, TDBAttributes>>(this: DBStatic<M>, sqltype: string, rlstype: string, options: FindOptions<Attributes<M>>): FindOptions<Attributes<M>>;
    constructor(values?: import("sequelize/types/utils").MakeNullishOptional<TModelCreationAttributes>, options?: import("sequelize").BuildOptions);
}
declare namespace DB {
    export { DB as default };
}
import type { TDBAttributes } from "./types";
import type { TDBCreationAttributes } from "./types";
import { Model } from "sequelize/types/model";
import type { Attributes } from 'sequelize';
import type { FindOptions } from './types/Options';
import type { DBStatic } from "./types";
import type { CreateOptions } from './types/Options';
import type { CreationAttributes } from 'sequelize';
import type { FindOrCreateOptions } from './types/Options';
import type { BulkCreateOptions } from './types/Options';
import type { Fn } from 'sequelize/types/utils';
import type { Col } from 'sequelize/types/utils';
import type { Literal } from 'sequelize/types/utils';
import type { UpdateOptions } from './types/Options';
import type { DestroyOptions } from './types/Options';
//# sourceMappingURL=DB.d.ts.map