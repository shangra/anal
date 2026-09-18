import { Optional } from 'sequelize';
import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TURuleAttributes = TDBAttributes & {
    name: string;
    details: string;
};

export type TURuleCreationAttributes = TDBCreationAttributes &
    Optional<TURuleAttributes, 'details'>;
