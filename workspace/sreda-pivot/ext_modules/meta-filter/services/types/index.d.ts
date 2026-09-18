export interface IRow {
    _path: string[];
    _v: string[];
    __level__?: number;
}

export interface IFilterResult {
    id: string;
    name: string;
    description: string;
    children: IFilterResult[];
}
