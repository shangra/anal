export type DB = import("./DB");
export const RLS_TYPE_READ: "read";
export const RLS_TYPE_WRITE: "write";
export const RLS_TYPE_DELETE: "delete";
export const RLS_TYPE_VIEW: "view";
/** @typedef {import('./DB')} DB */
/**
 * @import { FindOptions } from './types/Options'
 * @import { DBStatic } from './types'
 * @import { CreationAttributes, Attributes } from 'sequelize'
 * @import { Fn, Col, Literal } from 'sequelize/types/utils'
 */
/**
 * @class RLSManager
 */
export class RLSManager {
    static dbversion: bigint;
    /**
     * @constructor
     * @param {DBStatic<DB>} Model
     */
    constructor(Model: DBStatic<DB>);
    /**
     * @private
     * @param {DBStatic<DB>} model
     */
    private Model;
    /**
     * @public
     */
    public user: {
        id: string;
        rules: {
            '90499885-ae60-440b-a59f-cfd3958110cd': {
                name: string;
                details: string;
            };
        };
    };
    /**
     * @public
     * @template {DB} M
     * @param {FindOptions<Attributes<M>>} options
     * @returns {FindOptions<Attributes<M>>}
     */
    public getFindOptions<M extends DB>(options?: FindOptions<Attributes<M>>): FindOptions<Attributes<M>>;
    /**
     * @public
     * @template {DB} M
     * @param {FindOptions<Attributes<M>>} options
     * @returns {FindOptions<Attributes<M>>}
     */
    public getCountOptions<M extends DB>(options?: FindOptions<Attributes<M>>): FindOptions<Attributes<M>>;
    /**
     * @template {DB} M
     * @overload
     * @param {CreationAttributes<M>} values
     * @param {"insert"} type
     * @returns {CreationAttributes<M>}
     */
    public getValues<M extends DB>(values: CreationAttributes<M>, type: "insert"): CreationAttributes<M>;
    /**
     * @template {DB} M
     * @overload
     * @param {{ [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal }} values
     * @param {"update"} type
     * @returns {{ [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal }}
     */
    public getValues<M extends DB>(values: { [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal; }, type: "update"): { [key in keyof Attributes<M>]?: Attributes<M>[key] | Fn | Col | Literal; };
    /**
     * @public
     * @template {DB} M
     * @param {string} type
     * @param {FindOptions<Attributes<M>>} options
     * @returns {FindOptions<Attributes<M>>}
     */
    public getRlsOptions<M extends DB>(type: string, options?: FindOptions<Attributes<M>>): FindOptions<Attributes<M>>;
    /**
     * @public
     * @returns {string[]}
     */
    public getUserAccessIds(): string[];
    /**
     * @public
     * @param {"view" | "read" | "write" | "delete"} [type="read"]
     * @param {string[]} [ids=[]]
     * @param {{ transaction?: import('sequelize').Transaction }} [options={}]
     * @returns {Promise<Rls[]>}
     */
    public getPermissions(type?: "view" | "read" | "write" | "delete", ids?: string[], options?: {
        transaction?: import("sequelize").Transaction;
    }): Promise<Rls[]>;
    /**
     * @public
     * @param {Record<string, string[]> & { default?: { [key: string]: { [key: string]: string[] } } }} rules
     * @param {DB[]} records
     * @param {{ transaction?: import('sequelize').Transaction }} [options={}]
     * @returns {Promise<void>}
     */
    public setPermissions(rules: Record<string, string[]> & {
        default?: {
            [key: string]: {
                [key: string]: string[];
            };
        };
    }, records: DB[], options?: {
        transaction?: import("sequelize").Transaction;
    }): Promise<void>;
    /**
     * @public
     */
    public HaveCreateRule(tableOptions: any): boolean;
    /**
     * @public
     */
    public HaveSelfUpdateRule(tableOptions: any): boolean;
    /**
     * @public
     */
    public HaveUpdateRule(tableOptions: any): boolean;
    /**
     * @public
     */
    public HaveDeleteRule(tableOptions: any): boolean;
}
import type { Attributes } from 'sequelize';
import type { FindOptions } from './types/Options';
import type { CreationAttributes } from 'sequelize';
import type { Fn } from 'sequelize/types/utils';
import type { Col } from 'sequelize/types/utils';
import type { Literal } from 'sequelize/types/utils';
import { Rls } from "./rls";
import type { DBStatic } from './types';
//# sourceMappingURL=RLSManager.d.ts.map