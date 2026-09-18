import { Optional } from 'sequelize';
import { TDBAttributes, TDBCreationAttributes } from "../../../../../core/db/rls/types"

export type TSchemaManagerAttributes = TDBAttributes & {
    id: string;
    name: string;
    code: number;
    markdel: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdUser?: string | null;
    updatedUser?: string | null;
    owner?: string | null;
    schema_owner: string;
    standart_schema?: boolean | null;
    schema?: string | null;
    snapshot?: string | null;
};

export type TSchemaManagerCreationAttributes = Optional<TSchemaManagerAttributes, 'id' | 'code' | 'createdAt' | 'updatedAt'>;