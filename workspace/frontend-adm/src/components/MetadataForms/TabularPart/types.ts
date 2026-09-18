export interface IFieldMetadata {
    type: 'uuid';
    ref: { link: string; value: string };
}

export type RefType = { value: string; label: string };
export type CommonTypes = string | number | boolean | Date;
export type CompositeType<TypeT> = CommonCompositeType<TypeT> | RefCompositeType<TypeT>;
export type CommonCompositeType<TypeT> = { type: TypeT; value: CommonTypes };
export type RefCompositeType<TypeT> = { type: TypeT; value: string; label: string; link: string };
export type CellType<TypeT> = CommonTypes | CompositeType<TypeT>;
export type DataManagerTableType = Record<string, CellType<string>>[];
export type TabularPartNameType = string;
export type TabularPartRowIndexType = number;
export type TabularPartColumnNameType = string;

export type TablePathType = `TabularParts.${TabularPartNameType}`;
export type CellPathType = `TabularParts.${TabularPartNameType}.${TabularPartRowIndexType}.${TabularPartColumnNameType}`;

export interface CellCoordinates {
    rowIndex: number;
    columnIndex: number;
    groupIndex?: number;
    colInGroupIndex?: number;
}
