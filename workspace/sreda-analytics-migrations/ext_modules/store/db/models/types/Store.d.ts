import { TDBAttributes, TDBCreationAttributes } from "../../../../../core/db/rls/types"

export type TStoreAttributes = Omit<TDBAttributes, "code" | "markdel"> & {
    key: string,
    value: string,
    typeValue: string
};

export type TStoreCreationAttributes = Omit<TDBCreationAttributes, "code" | "markdel">
    & TStoreAttributes;