import { TDBAttributes, TDBCreationAttributes } from '../../../../../core/db/rls/types';

export type TSystemSettingsAttributes = TDBAttributes & {
    parent: string;
    name: string;
    description: string;
    type: string;
    value: string;
};

export type TSystemSettingsCreationAttributes = TDBCreationAttributes & TSystemSettingsAttributes;
