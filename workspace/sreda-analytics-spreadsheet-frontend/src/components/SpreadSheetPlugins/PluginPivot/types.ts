import { IPluginExportData } from '../../AdapterSpreadSheet/types';
import { INode } from '../../FilterRef/types';
import { CellFormattingType } from '../PluginCellFormatting/types';
import { PluginPivotChunksChunkParentHeaders, PluginPivotChunksChunkParentHeadersForHash } from './classes/PluginPivotChunks';
import { PluginPivotDataColumnCell, PluginPivotDataDataCell, PluginPivotDataIndexCell } from './classes/PluginPivotData';
import { PIVOT_ACTION, PLUGIN_PIVOT_CHANK_TYPE, PLUGIN_PIVOT_KEY } from './constants';
import { PluginPivot } from './PluginPivot';

export type NumericScale = 'none' | 'thousands' | 'millions' | 'billions';

export type TPluginRange = {
    x: number;
    y: number;
    height: number;
    width: number;
};

export type PluginPivotArgFilter = {
    value: string | number;
    from: string | number;
    to: string | number;
    field: string;
    filterBy: string;
    label?: string;
    level?: number;
    __level__?: number;
    comparison?: 'or' | 'and';
    cached: any;
};

export enum PluginPivotTypeEnum {
    DEFAULT = 'default',
    FINANCE = 'finance',
    NUMBER = 'number',
    PERCENT = 'percent',
    EXPONENTIAL = 'exponential',
    FRACTIONAL = 'fractional',
}

export type PluginPivotArg = {
    parentId: string;
    filter?: PluginPivotArgFilter[];
    filterCached?: INode[];
    name: string;
    label: string;
    description: string;
    hasChild: boolean;
    child: PluginPivotArg[];
    id: string;
    isActiveDropdown?: boolean;
    isActiveTableItem?: boolean;
    isUsed?: boolean;
    isSelected?: boolean;
    format?: CellFormattingType;
    useMeasure?: boolean;
    type?: string;
    typeParam?: string;
    totalsOnoff?: boolean;
    sort?: {
        field: string;
        order: 'ASC' | 'DESC';
    };
    sqlName?: string;
    ref?: object;
    manifest?: object;
};

export type PluginPivotSchemaInfo = {
    name: string;
    isChanged: boolean;
    values: PluginPivotArg[];
    measureUnit: NumericScale;
};

export type PluginPivotArgs = {
    columns: PluginPivotArg[];
    fields: PluginPivotArg[];
    filter: PluginPivotArg[];
    layers: PluginPivotArg[];
    rows: PluginPivotArg[];
    values: PluginPivotArg[];
    rowsTotal: boolean;
    columnsTotal: boolean;
    recalculate: boolean;
    repeatHeaders: boolean;
    isMask: boolean;
    columnsAllValues: boolean;
    rowsAllValues: boolean;
    measureUnit?: NumericScale;
};

export type PluginPivotDataSettingsParamsHeader = {
    id: string;
    name: string;
    label: string;
    description: string;
    type: string;
    ref?: object;
    manifest?: object;
    sqlName?: string;
    /** @deprecated */
    layers?: PluginPivotDataSettingsParamsHeader[];
    child: PluginPivotDataSettingsParamsHeader[];
};

export interface PluginPivotOptions {
    infoserviceId: string;
    pluginRange?: TPluginRange;
    defaultPluginArg?: any;
    server?: string;
    defaultMeasureFormat?: CellFormattingType;
    defaultDimensionFormat?: CellFormattingType;
    reqLimit?: number;
}

export interface PluginPivotState {
    args: PluginPivotArgs;
    refs: Record<string, Record<string, string>>;
    pivotParams: Record<string, any>;
}

export interface PluginPivotFilterConfig {
    field: string;
    formatedValues?: string[];
}

export interface IPluginPivotCellConfig {
    index?: PluginPivotDataIndexCell['meta'];
    columns?: PluginPivotDataColumnCell['meta'];
    data?: PluginPivotDataDataCell['meta'];
    /** @deprecated Временное решение для разметки к кому применять ед. измерения */
    scalable?: boolean;
    filter?: PluginPivotFilterConfig;
}

type IPluginPivotCellPluginConfig = {
    [PLUGIN_PIVOT_KEY]?: IPluginPivotCellConfig;
};

interface PluginPivotPluginRegistry {
    [PLUGIN_PIVOT_KEY]: PluginPivot;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface ICell {
        position?: 'index' | 'column';
    }

    export interface ICellPluginsConfig extends IPluginPivotCellPluginConfig {}
    export interface PluginRegistry extends PluginPivotPluginRegistry {}
}

export type PluginPivotSort = [string, 'ASC' | 'DESC'];

export type PluginPivotEqualFilter = {
    $eq: string | number;
};

export type PluginPivotBetweenFilter = {
    $lte?: string | number;
    $gte?: string | number;
};

export type PluginPivotLevelFilter = {
    __level__: number | string;
};
export type PluginPivotParentFilter = {
    __parent__: number | string;
};

export type PluginPivotFilter = {
    [key: string]:
        | number
        | string
        | boolean
        | PluginPivotEqualFilter
        | PluginPivotBetweenFilter
        | PluginPivotLevelFilter
        | PluginPivotParentFilter;
};

export type PluginPivotFilterGroup = {
    $and?: (PluginPivotFilterGroup | PluginPivotFilter)[];
    $or?: (PluginPivotFilterGroup | PluginPivotFilter)[];
};

export type PluginPivotDataSettingsParams = {
    columns?: PluginPivotDataSettingsParamsHeader[];
    rows?: PluginPivotDataSettingsParamsHeader[];
    values?: (PluginPivotDataSettingsParamsHeader & {
        child: (PluginPivotDataSettingsParamsHeader & {
            /** @deprecated */
            layers?: PluginPivotDataSettingsParamsHeader[];
        })[];
    })[];
    layers?: PluginPivotDataSettingsParamsHeader[];
    where?: PluginPivotFilterGroup | PluginPivotFilter;
    order?: {
        columns?: PluginPivotSort[];
        rows?: PluginPivotSort[];
        values?: PluginPivotSort[];
        filter?: PluginPivotSort[];
    };
    totals?: {
        indexes?: boolean;
        columns?: boolean;
        totals?: boolean;
    };
    isMask?: boolean;
    recalculate?: boolean;
    repeatHeaders?: boolean;
    showAll?: {
        columns?: boolean;
        rows?: boolean;
    };
    measureUnit?: string;
};

type MeasureId = string;
type LayerId = string;
type ColumnValue = string;
type AggrFunc = string;
export type TotalKey = `${MeasureId}:->:${LayerId}:->:${ColumnValue}:->:${AggrFunc}`;
export type Totals = {
    columns: Record<TotalKey, number>;
    indexes: Record<TotalKey, number>;
    totals: Record<TotalKey, number>;
};

export type PluginPivotResponseData = {
    data?: {
        columns: string[][];
        index: string[];
        data: (string | null)[][];
        settings: {
            columns: {
                hierarchy?: boolean;
                open?: boolean;
            };
            index: {
                hierarchy?: boolean;
                open?: boolean;
            };
            params: PluginPivotDataSettingsParams;
        };
        totals: Totals;
    };
    isLoadingTable: boolean;
    loadedRows: number;
    refFields: Record<string, Record<string, Record<string, string | number>>>;
    refs: Record<string, Record<string, string>>;
    totalRows: number;
};

export interface IFetchOptions {
    ignoreCache?: boolean;
    sliceTraceId?: string;
    signal?: AbortSignal;
}

export type HistoryCacheType = {
    /** @deprecated Backwards compatibility for old schemas */
    onClickGetData?: {
        data?: any;
        args?: PluginPivotArgs;
    };
    loadRootChunk: {
        data?: any;
        params?: PluginPivotDataSettingsParams;
        options?: IFetchOptions;
    };
    loadNewChunk: Record<
        string,
        {
            /** @deprecated */
            headerKeys?: PluginPivotChunksChunkParentHeadersForHash;
            parentHeader?: PluginPivotChunksChunkParentHeaders;
            params: PluginPivotDataSettingsParams;
            /** @deprecated */
            args?: PluginPivotDataSettingsParams;
            data?: any;
            dependencies?: string[];
        }
    >;
};

// ----  new
export type PluginPivotChunkTypes = (typeof PLUGIN_PIVOT_CHANK_TYPE)[keyof typeof PLUGIN_PIVOT_CHANK_TYPE];

export interface IPluginPivotPluginData
    extends IPluginExportData<typeof PLUGIN_PIVOT_KEY, PluginPivotState, PluginPivotOptions> {
    state: PluginPivotState &
        PluginPivotOptions & {
            history: (keyof HistoryCacheType['loadNewChunk'])[];
            historyCache: HistoryCacheType;
            args: PluginPivotArgs;
            /** @deprecated */
            schemaSettings?: PluginPivotArgs;
            // TODO: Тут этого быть не должно. TableAdapter должен сохранять свой стейт
            tableParams: any;
        };
}

// ── Расширение типов ячеек через declaration merging ─────────────────────

type PluginPivotActionMap = {
    [PIVOT_ACTION.STATE_UPDATE]: PluginPivotState;
    [PIVOT_ACTION.FORCE_UPDATE]: undefined;
    [PIVOT_ACTION.RESET_CACHE]: undefined;
    [PIVOT_ACTION.ON_FETCH_START]: { options: IFetchOptions };
    [PIVOT_ACTION.ON_FETCH_WAIT]: { options: IFetchOptions };
    [PIVOT_ACTION.ON_FETCH_END]: {
        data:
            | {
                  answerId: any;
                  data: any;
                  refs: any;
                  refFields: any;
                  loadedRows: any;
                  totalRows: any;
                  isLoadingTable: boolean;
                  status: any;
              }
            | { status: any; message: any; stack: any; errors: any; answerId: any; payload: any };
    };
    [PIVOT_ACTION.DRP_DATA_LOADED]: undefined;
    [PIVOT_ACTION.DRP_DATA_LOADED_RESET]: undefined;
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginPivotActionMap {}
}
