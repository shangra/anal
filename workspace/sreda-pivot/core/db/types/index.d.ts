export type TField =
    MayBeArray<string>
    | TAggField

export type MayBeArray<T> = T | T[];

export type TAggField = {
    func: string,
    field: string,
    alias: string,
    ecran?: boolean,
    aggrFields?: string[],
    windowFunc?: string,
    order?: string[],
    bounds?: string,
    skipCheck?: boolean,
};
