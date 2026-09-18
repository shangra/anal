import { Optional } from 'sequelize';
import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TGroupAttributes = TDBAttributes & {
    name: string;
    description: string;
    open: boolean;
    private: number;
    logo: string;
};

export type TGroupCreationAttributes = TDBCreationAttributes &
    Optional<TGroupAttributes, 'logo'>;
