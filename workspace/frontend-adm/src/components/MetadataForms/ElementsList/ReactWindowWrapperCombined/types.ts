export interface IColumnData {
    name: string;
    label: string;
    order?: "ASC" | "DESC";
}

export interface IColumnMetadata {
    x: number;
    width: number;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
    data: IColumnData | IColumnData[];
}

export interface IInnerColumnMetadata {
    x: number;
    width: number;
}

