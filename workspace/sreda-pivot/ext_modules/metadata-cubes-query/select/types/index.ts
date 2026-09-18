import { MayBeArray, TField } from "../../../../core/db/types";
import LevelClassI from "../../../metadata-cmp/services/metadata/source/type";

import { IConnector, Ifrom } from "../../../metadata-connector/services/metadata/Connector.class";
import { IWithOption } from "../../../metadata-connector/services/metadata/connectors/AbstractConnector";
import { CastTypeI } from "../../../metadata-connector/services/metadata/types";

export interface ISettings extends IBehaviourQueryOptions {
  // аттрибуты которые необходимы для построения среза но на них не должна работать логика иерархи и каких либо поведений кроме базового
  techAttributes?: string[];
  attributesForDel?: string[];
  attributes?: TField[];
  group?: string[];
  isMask?: boolean;
  order?: [string, string][];
  processing?: boolean;
  where?: object;
  dictionaryWhere?: object;
  metaAccessWhere?: object;
  systemWhere?: object;
  limit?: number;
  offset?: number;
  tags?: Record<string, string>;
  timeOut?: number;
  batchSize?: number;
  withOutCount?: boolean;
  withOutRefs?: boolean;
  withOutOrder?: boolean;
  maskFields?: string[];
  explain?: boolean;
  isReport?: boolean;
  totals?: {
    main?: boolean;
    indexes?: boolean;
    columns?: boolean;
    totals?: boolean;
  };
}

export interface IsValidI {
  isValid(data?: { guideConnector?: IConnector; viewName?: string }): Promise<boolean>;
}

export interface IBehaviourConstructorProps {
  meta: LevelClassI;
  table: string;
  field: string | object;
  delimeter: string;
}

export interface IConstructor<A, T> {
  new(data: A): T;
}

export interface IBehaviourConstructor extends IConstructor<IBehaviourConstructorProps, IQueryBuilerBehavior> { }

export interface IFactoryEntity<T> extends IsValidI, IBehaviourConstructor {
  rank(): number;
}

export interface ILevel {
  ignoreGroup?: string;
  ignoreAttribute?: TField;
  isGroup?: boolean;
  withOption?: IWithOption;
  group?: string;
  attribute?: MayBeArray<TField>;
  where?: object;
  field?: string | TField;
  children?: string[];
  join?: string;
  additionalAttributes?: TField[];
  removeAttribute?: string;
}

export interface IOptionSettings {
  fields: string[];
  columns: string[];
  // изначальные колонки которой пришели с фронта
  viewColumns: string[];
  index: string[];
  // изначальные индексы которой пришели с фронта
  viewIndex: string[];
  isReport?: boolean;
  disableHierarchy: true;
  accountDimension?: { field: string };
  dateDimension?: { field: string };
}

export interface IBehaviourQueryOptions {
  maskWhere?: object;
  dictionaryWhere?: object;
  metaAccessWhere?: object;
  systemWhere?: object;
  where?: object;
  settings?: IOptionSettings;
  previousLevels?: Ifrom;
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
  treeObject: object;
  viewName?: string;
  isProcessing: boolean;
  isBehaviour: boolean;
  field: TField;
  table: string;
  delimeter: string;
  connector: IConnector;
  logger: { console(msg: string, meta: any): Promise<void> };
}

export interface IFactory<T> {
  init(data: IFactoryInit): Promise<T>;
}

export interface IQueryBuilerBehavior extends IsValidI {
  query: (options: IBehaviourQueryOptions, attribute: TField, viewName?: string) => Promise<IBehaviourOptions>;
}

export interface IJoinOption extends IWithOption {
  additionalAttributes: string[]
}
