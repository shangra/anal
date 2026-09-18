import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TUserRoleAttributes = Omit<TDBAttributes, 'markdel'> & {
    user_id: string;
    role_id: string;
};

export type TUserRoleCreationAttributes = Omit<
    TDBCreationAttributes,
    'markdel'
> &
    TUserRoleAttributes;
