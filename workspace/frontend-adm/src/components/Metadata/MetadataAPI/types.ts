export type MetadataSearchOptionsType = {
    limit: number;
    offset: number;
    where?: {
        [key in string]: Record<string, string> | string;
    };
    order?: [string, 'ASC' | 'DESC'];
    attributes?: string[];
    hierarchy?: boolean;
};

export type MetadataHierarchyType = {
    on: boolean;
    codeField: { name: string; field: string; description: string; value: string };
    parentField: any;
    parentFilter: any;
};

export type UUIDType = string;

type FieldType = { field: string; name: string; description: string; value: string };

type SettingsType = { id: UUIDType; primarykey: boolean; fieldview: string };

export type TabularPartType = {
    id: UUIDType;
    name: string;
    description: string;
};

export type TabularPartsType = Record<UUIDType, TabularPartType>;

type FieldGUIDType = {
    id: UUIDType;
    field: string;
    name: string;
    description: string;
    increment: boolean;
    notnull: boolean;
    type: string;
    default: string;
    ref?: { value: string; link: string };
    show?: boolean;
};

type FieldsGUIDType = Record<UUIDType, FieldGUIDType>;

export interface IMetadataObjectResponse {
    routes: string;
    treeObject: {
        Fields: {};
        FieldsGUID: FieldsGUIDType;
        Keys: Record<string, { settings: SettingsType; fields: Record<string, FieldType> }>;
        KeysGUID: {};
        Indexes: {};
        Refs: {};
        TabularParts: TabularPartsType;
    };
    manifest: any;
}

export type MetadataRowType<AdditionalFieldType = {}> = {
    id?: UUIDType;
    code?: number;
    markdel?: number;
    createdAt?: string;
    updatedAt?: string;
    createdUser?: UUIDType;
    updatedUser?: UUIDType;
} & AdditionalFieldType;

export interface IMetadataForTable<AdditionalFieldType = any> {
    rows: MetadataRowType<AdditionalFieldType>[];
    cols: FieldGUIDType[];
    refs: {};
    count: number;
    offset: number;
    limit: number;
    options: MetadataSearchOptionsType;
    metadata: any;
    hierarchy?: MetadataHierarchyType;
    hierarchyBreadCrumbs?: MetadataHierarchyType[];
    forceMetadataUpdateWithLastSettings: (options: MetadataSearchOptionsType) => void;
    filterAndSortMetadataCallback: () => void;
    route?: string | undefined;
}
