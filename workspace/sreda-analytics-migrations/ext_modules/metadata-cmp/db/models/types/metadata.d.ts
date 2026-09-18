import { Optional } from 'sequelize';
import { TDBAttributes, TDBCreationAttributes } from "../../../../../core/db/rls/types"

export type TMetadataAttributes = TDBAttributes & {
    class_id: string;
    class: string;
    parent: string;
    name: string;
    description?: string;
    manifest?: string;
    rank?: number;
};

export type TMetadataCreationAttributes = TDBCreationAttributes & Optional<TMetadataAttributes, 'description' | 'manifest' | 'rank'>;
