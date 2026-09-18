import { Optional } from 'sequelize';
import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TURoleAttributes = TDBAttributes & {
    name: string;
    details: string;
    color: string;
};

export type TURoleCreationAttributes = TDBCreationAttributes &
    Optional<TURoleAttributes, 'details' | 'logo' | 'color'>;
