export interface FieldI {
    field: string,
    type: string,
    default: string,
    increment: boolean,
    len: number,
    notnull: boolean,
    unique: boolean,
};

export interface KeyI {
    name: string;
    fields: Record<string, Record<string, string>>;
    settings: {
        primaryKey: boolean,
        unique: boolean,
    }
};

export interface FieldsSettingsI {
    insert: Record<string, boolean>,
    update: Record<string, FieldI>,
    delete: Record<string, boolean>,
};

export interface SynchI {
    Fields?: Record<string, FieldI>;
    fieldsSettings?: FieldsSettingsI,
    Keys?: Record<string, KeyI>;
    typeMapping?: Record<string, string>;
    resultAsArray?: boolean;
    noSupportSerial?: boolean;
    noSupportDefault?: boolean;
    noSupportUnique?: boolean;
    noSupportNotNull?: boolean;
    noSupportPK?: boolean;
    recreateKeys?: boolean,
};

export type CastTypeI = 'UUID' | 'REF' | 'TEXT' | 'STRING' | 'INTEGER' | 'FLOAT' | 'DATE' | 'DATETIME' | 'TIMESTAMP' | 'BOOLEAN';

export type JoinTypeI = 'inner' | 'left' | 'right' | 'cross' | 'no';

export type TConnectionMeta = {
    field: string,
    type?: CastTypeI
};

export interface IConnectionField {
    left: TConnectionMeta,
    right: TConnectionMeta,
}

export interface IFieldMapping {
    left: TConnectionMeta,
    right: TConnectionMeta
}

export interface IWithOption {
    connectionFields: IConnectionField[],
    mapping: IFieldMapping[],
    type: JoinTypeI,
    query: string,
    name?: string,
    cast?: boolean,
    id?: string,
}

export interface IFieldRecursive {
    field: string,
    type: string,
}

export interface IFindAllChildren {
    pk: IFieldRecursive, // PRIMARY KEY
    view?: IFieldRecursive, // VIEW FIELD
    parent: IFieldRecursive, // PARENT FIELD
    where?: object, // FILTRATION OBJECT OB GUIDE
    guideAttrs: string[] // GUIDE ATTRIBUTES TO RETURN
}

export type CastTypeI = 'UUID' | 'REF' | 'TEXT' | 'STRING' | 'INTEGER' | 'FLOAT' | 'DATE' | 'DATETIME' | 'TIMESTAMP' | 'BOOLEAN';