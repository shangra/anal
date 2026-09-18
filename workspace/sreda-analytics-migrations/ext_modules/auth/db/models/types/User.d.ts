import { Optional } from 'sequelize';
import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TUserAttributes = TDBAttributes & {
    login: string;
    password: string;
    status: number;
    lastAccessDate: Date;
};

export type TUserCreationAttributes = TDBCreationAttributes &
    Optional<TUserAttributes, 'status' | 'lastAccessDate'>;
