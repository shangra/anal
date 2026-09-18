import { MaybeArray, TField } from '../../../../../../../db/rls/types/WhereOptions';
import { IConnector } from '../../../../../../metadata-connector/services/metadata/Connector.class';

export interface ILevel {
    ignoreGroup?: string;
    ignoreAttribute?: TField;
    isGroup?: boolean;
    withOption?: {
        mergeName?: string;
        query: string;
        viewNames?: MaybeArray<string>;
        connectionField?: string;
        attributeFields?: string[];
        attributeName: string;
        joinField: string;
    };
    group?: string;
    attribute?: TField;
    where?: object;
    field?: string;
    children?: string[];
    join?: string;
    additionalAttributes?: string[];
}

export interface IBehaviourQueryOptions {
    dictionaryWhere: object;
    metaAccessWhere?: object;
    systemWhere: object;
    where: object;
    settings: { fields: string[]; columns: string[]; index: string[] };
}

export interface IBehaviourOptions {
    viewAlias?: string;

    before?: ILevel[];
    current?: ILevel[];
    after?: ILevel[];
}

export interface IRefItem {
    ref: string | { value: string; link: string };
    SQLQueryFormat: string;
    useWith?: string;
}

export interface IFactoryInit {
    isBehaviour: boolean;
    refItem: IRefItem;
    field: TField;
    table: string;
    delimeter: string;
    connector: IConnector;
}

export interface IFactory {
    init(data: IFactoryInit): Promise<IQueryBuilerBehavior>;
}

export interface IQueryBuilerBehavior {
    query: (
        options: IBehaviourQueryOptions,
        attribute: TField,
        viewName?: string
    ) => Promise<IBehaviourOptions>;

    getSubQuery: (data: object, key: TField, viewName?: string) => Promise<IBehaviourOptions>;
}
