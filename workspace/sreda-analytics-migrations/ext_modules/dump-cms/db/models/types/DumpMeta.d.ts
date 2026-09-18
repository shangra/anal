import { Optional } from 'sequelize';

export type TDumpMetaAttributes = {
    id: string;
    hash: string;
    name: string;
    updatedAt: string;
    createdAt: string;
};

export type TDumpMetaCreationAttributes = Optional<
    TDumpMetaAttributes,
    'id' | 'updatedAt' | 'createdAt'
>;
