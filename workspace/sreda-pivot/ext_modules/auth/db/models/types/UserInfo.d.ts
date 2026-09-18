import { Optional } from 'sequelize';
import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TUserInfoAttributes = TDBAttributes & {
    name: string;
    email: string;
    details: string;
    avatar: string;
    session: string;
};

export type TUserInfoCreationAttributes = TDBCreationAttributes &
    Optional<
        TUserInfoAttributes,
        'name' | 'email' | 'details' | 'avatar' | 'session'
    >;
