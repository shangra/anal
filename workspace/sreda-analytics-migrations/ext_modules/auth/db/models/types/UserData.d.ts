import {
    TDBAttributes,
    TDBCreationAttributes,
} from '../../../../../core/db/rls/types';

export type TUserDataAttributes = TDBAttributes & {
    user_id: string;
    attribute_id: string;
    value: string;
};

export type TUserDataCreationAttributes = TDBCreationAttributes &
    TUserDataAttributes;
