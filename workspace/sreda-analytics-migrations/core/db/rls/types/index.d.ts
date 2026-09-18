import { Model, ModelStatic, Optional } from 'sequelize';

import * as DB from '../DB';

export interface RLSExtensionMethods {
    RLSRule?: () => Record<string, string[]>;
}

export interface DumpExtensionMethods {
    afterRestore?: () => Promise<any>;
    forDump?: (data: any) => object;
    DumpInstruction?: (data: any) => object;
}

export interface AssociateMethods {
    static associate<M extends DB>(
        this: ModelStatic<M>,
        models: Record<string, ModelStatic<M>>
    ): void;
}

export type TDBAttributes = {
    id: string;
    code: number;
    markdel: 0 | 1;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
    createdUser: string;
    updatedUser: string;
    deletedUser: string;
};

export type TDBCreationAttributes = Optional<
    TDBAttributes,
    | 'id'
    | 'code'
    | 'markdel'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
    | 'createdUser'
    | 'updatedUser'
    | 'deletedUser'
>;

export type DBStatic<M extends DB> = ModelStatic<M> &
    AssociateMethods &
    RLSExtensionMethods &
    DumpExtensionMethods;
