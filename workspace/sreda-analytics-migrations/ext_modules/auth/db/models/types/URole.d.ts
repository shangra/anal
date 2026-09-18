import { Optional } from 'sequelize';
import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TURolesAttributes = TDBAttributes & {
    name: string;
    details: string;
    color: string;
};

export type TURolesCreationAttributes = TDBCreationAttributes &
    Optional<TURolesAttributes, 'details' | 'logo' | 'color'>;
