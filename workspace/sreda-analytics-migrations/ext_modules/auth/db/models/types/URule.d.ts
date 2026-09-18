import { Optional } from 'sequelize';
import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TURulesAttributes = TDBAttributes & {
    name: string;
    details: string;
};

export type TURulesCreationAttributes = TDBCreationAttributes &
    Optional<TURulesAttributes, 'details'>;
