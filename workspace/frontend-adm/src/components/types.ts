export interface IBasePage {
    parent?: string;
    id: string;
    name?: string;
    description?: string;
    rank?: number;
    uri?: string;
    urifind?: string;
    active?: number;
    content_type?: string;
    template?: string;
    link?: string;
    markdel?: number;
    createdAt?: string;
    updatedAt?: string;
    countChildren?: number;
}
