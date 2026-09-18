import { IPluginExportData } from '../../AdapterSpreadSheet/types';
import { PIVOT_ACTION, PIVOT_PLUGIN_KEY } from './constants';
import { NewPluginPivot } from './NewPluginPivot';
import { IPivotCellMetadata, IPivotState } from './services/PivotTableService/types';

export interface IFetchOptions {
    ignoreCache?: boolean;
    sliceTraceId?: string;
    signal?: AbortSignal;
}

// ── Диапазон рендеринга таблицы в spreadsheet ─────────────────────────────
export type TNewPluginPivotRange = {
    x: number;
    y: number;
    height: number;
    width: number;
};

export enum ENewPluginPivotTypeEnum {
    DEFAULT = 'default',
    FINANCE = 'finance',
    NUMBER = 'number',
    PERCENT = 'percent',
    EXPONENTIAL = 'exponential',
    FRACTIONAL = 'fractional',
}

// ── Опции плагина (передаются через PluginEntry.options) ──────────────────
export interface NewPluginPivotOptions {
    cubeId: string;
    pluginRange?: TNewPluginPivotRange;
    server?: string;
    reqLimit?: number;
}

export interface IRequestContext {
    signal?: AbortSignal;
    priority?: number;
}

// ── Фильтр элемента аргументов ────────────────────────────────────────────
export interface INewPluginPivotArgFilter {
    value: string | number;
    from: string | number;
    to: string | number;
    field: string;
    filterBy: string;
    label?: string;
    level?: number;
    __level__?: number;
    comparison?: 'or' | 'and';
}

export interface INewPluginPivotArg {
    parentId: string;
    filter?: INewPluginPivotArgFilter[];
    name: string;
    label: string;
    description: string;
    hasChild: boolean;
    child: INewPluginPivotArg[];
    id: string;
    isActiveDropdown?: boolean;
    isActiveTableItem?: boolean;
    isUsed?: boolean;
    isSelected?: boolean;
    format?: ENewPluginPivotTypeEnum;
    type?: string;
    typeParam?: string;
    totalsOnoff?: boolean;
    sort?: { field: string; order: 'ASC' | 'DESC' };
    sqlName?: string;
    ref?: object;
    manifest?: object;
}

export interface INewPluginPivotSchemaInfo {
    name: string;
    isChanged: boolean;
}

export interface INewPluginPivotArgs {
    columns: INewPluginPivotArg[];
    filter: INewPluginPivotArg[];
    layers: INewPluginPivotArg[];
    rows: INewPluginPivotArg[];
    values: INewPluginPivotArg[];
    totals: {
        indices: boolean;
        columns: boolean;
    };
    isMask: boolean;
    isClassic: boolean;
    /** @deprecated */
    rowsTotal?: boolean;
    /** @deprecated */
    columnsTotal?: boolean;
}

type NewPluginPivotActionMap = {
    [PIVOT_ACTION.SET_ARGS]: INewPluginPivotArgs;
    [PIVOT_ACTION.SET_SCHEMA_INFO]: INewPluginPivotSchemaInfo;
    [PIVOT_ACTION.DROP]: undefined;
    [PIVOT_ACTION.ON_FETCH_START]: undefined;
    [PIVOT_ACTION.ON_FETCH_WAIT]: undefined;
    [PIVOT_ACTION.ON_FETCH_END]: undefined;
    PLUGIN_PIVOT_IMPORT: { schemaData: any };
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends NewPluginPivotActionMap {}
}

// ── Slice-состояние плагина (управляется reducer-ом) ─────────────────────
export interface NewPluginPivotState {
    args: INewPluginPivotArgs;
    fields: INewPluginPivotArg[];
    schemaInfo: INewPluginPivotSchemaInfo;
    /** Сериализованное состояние PivotTableService (для import/export) */
    pivotServiceState?: IPivotState;
}

// ── Формат сериализации при полном экспорте ───────────────────────────────
export interface INewPluginPivotPluginData
    extends IPluginExportData<typeof PIVOT_PLUGIN_KEY, NewPluginPivotState, NewPluginPivotOptions> {
    options: NewPluginPivotOptions;
    tableParams?: {
        columnsCount: number;
        rowsCount: number;
        columnsMeta: Record<number, { width: number }>;
        rowsMeta: Record<number, { height: number }>;
    };
}

type NewPluginPivotCellPluginConfig = {
    [PIVOT_PLUGIN_KEY]?: IPivotCellMetadata | { filter?: { field: string } };
};

interface NewPluginPivotPluginRegistry {
    [PIVOT_PLUGIN_KEY]: NewPluginPivot;
}

// ── Расширение типов ячеек через declaration merging ─────────────────────
declare module '../../AdapterSpreadSheet/types' {
    export interface ICellPluginsConfig extends NewPluginPivotCellPluginConfig {}
    export interface PluginRegistry extends NewPluginPivotPluginRegistry {}
}
