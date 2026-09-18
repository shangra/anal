export interface TRlsAttributes {
    table_name: string;
    table_id: string;
    owner_id: string;
    type: string;
    owner: string;
    createdAt: string;
    updatedAt: string;
}

export type TRlsCreationAttributes = TRlsAttributes & {};
