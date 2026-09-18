import {
    FindOptions as SFindOptions,
    FindOrCreateOptions as SFindOrCreateOptions,
    CreateOptions as SCreateOptions,
    BulkCreateOptions as SBulkCreateOptions,
    UpdateOptions as SUpdateOptions,
    DestroyOptions as SDestroyOptions,
} from 'sequelize';
import { TDBAttributes, TDBCreationAttributes } from '.';

export interface FindOptions<TAttributes extends TDBAttributes = TDBAttributes>
    extends SFindOptions<TAttributes> {
    /**
     * Игнорировать RLS
     */
    force?: boolean;
    rls?: boolean;
    table?: string;
    all?: boolean;
    withOutCount?: boolean;
    withOutRefs?: boolean;
}

export interface FindOrCreateOptions<
    TAttributes extends TDBAttributes = TDBAttributes,
    TCreationAttributes = TDBCreationAttributes
> extends SFindOrCreateOptions<TAttributes, TCreationAttributes> {
    /**
     * Игнорировать RLS
     */
    force?: boolean;
    rls?: boolean;
    table?: string;
    all?: boolean;
    withOutCount?: boolean;
    withOutRefs?: boolean;
}

export interface CreateOptions<
    TAttributes extends TDBAttributes = TDBAttributes
> extends SCreateOptions<TAttributes> {
    /**
     * Игнорировать RLS
     */
    force?: boolean;
}

export interface BulkCreateOptions<
    TAttributes extends TDBAttributes = TDBAttributes
> extends SBulkCreateOptions<TAttributes> {
    /**
     * Игнорировать RLS
     */
    force?: boolean;
}

export interface UpdateOptions<
    TAttributes extends TDBAttributes = TDBAttributes
> extends SUpdateOptions<TAttributes> {
    /**
     * Игнорировать RLS
     */
    force?: boolean;
}

export interface DestroyOptions<
    TAttributes extends TDBAttributes = TDBAttributes
> extends SDestroyOptions<TAttributes> {
    /**
     * Игнорировать RLS
     */
    force?: boolean;
}
