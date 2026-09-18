import { IPluginExportData } from '../../AdapterSpreadSheet/types';
import { CellFormattingType } from '../PluginCellFormatting/types';
import { PluginPivotArg, TPluginRange } from '../PluginPivot/types';
import { PLUGIN_REPORTS_KEY, REPORTS_ACTION } from './constants';
import { PluginReports } from './PluginReports';

export type FeatureFlags = {};

export type PluginReportsArgFilter = {
    value: string | number;
    from: string | number;
    to: string | number;
    field: string;
    filterBy: string;
    name: string;
    label?: string;
};

export enum PluginReportsTypeEnum {
    DEFAULT = 'default',
    FINANCE = 'finance',
    NUMBER = 'number',
    PERCENT = 'percent',
    EXPONENTIAL = 'exponential',
    FRACTIONAL = 'fractional',
}

export type PluginReportsArg = {
    filter?: PluginReportsArgFilter[];
    name: string;
    label: string;
    description: string;
    hasChild: boolean;
    child: PluginReportsArg[];
    format?: PluginReportsTypeEnum;
    typeParam?: string;
};

export type PluginReportsArgs = {
    columns: PluginReportsArg[];
    fields: PluginReportsArg[];
    filter: PluginReportsArg[];
    layers: PluginReportsArg[];
    rows: PluginReportsArg[];
    values: PluginReportsArg[];
};

export type PluginReportsDataSettingsParamsHeader = {
    child: PluginReportsDataSettingsParamsHeader[];
    name: string;
    label: string;
};

export type PluginReportsSort = [string, 'ASC' | 'DESC'];

export type PluginReportsDataSettingsParams = {
    columns: PluginReportsDataSettingsParamsHeader[];
    rows: PluginReportsDataSettingsParamsHeader[];
    values: {
        name: string;
        label: string;
    }[];
    where: {
        __parent__?: number | string;
    };
    order: {
        columns?: PluginReportsSort[];
        rows?: PluginReportsSort[];
        values?: PluginReportsSort[];
        filter?: PluginReportsSort[];
    };
};

export type Measure = {
    alias: string;
    field: string;
    func: string;
};

export function isColumnMeasure(column: string | Measure): column is Measure {
    return typeof column !== 'string';
}

export type PluginReportsSchemaInfo = {
    name: string;
    isChanged: boolean;
};

export type PluginReportsResponseData = {
    params?: {
        columns: PluginPivotArg[];
        rows: PluginPivotArg[];
        values: PluginPivotArg[];
        where: {};
        order: {};
        layers: PluginPivotArg[];
    };
    table?: {
        columns: string[];
        index: string[];
        data: string[][];
        settings: {
            columns: {
                hierarchy?: boolean;
                open?: boolean;
            };
            index: {
                hierarchy?: boolean;
                open?: boolean;
            };
            params: PluginReportsDataSettingsParams;
        };
    };
    refFields?: Record<string, Record<string, Record<string, string | number>>>;
    refs?: Record<string, Record<string, string>>;
    treeObject?: {
        Measures: Record<string, { description: string; format?: CellFormattingType }>;
        Dimensions: Record<string, { description: string; format?: CellFormattingType }>;
    };
    totalRows?: number;

    // Псевдо данные (они не возвращаются с сервера, а генерирутся при ответе)
    isLoadingTable: boolean;
    loadedRows: number;
};

export interface PluginReportsOptions {
    infoserviceId: string;
    server?: string;
    defaultMeasureFormat?: CellFormattingType;
    featureFlags?: FeatureFlags;
    /** Область отчёта на листе (по умолчанию x=0, y=1) */
    pluginRange?: TPluginRange;
}

export interface PluginReportsState {
    data?: PluginReportsResponseData;
    args: PluginReportsArgs;
    pivotParams: Record<string, any>;
    isLoading: boolean;
    refs: Record<string, Record<string, string>>;
    page: number;
    pagesAmount: number;
    computedFilters?: PluginReportsArgFilter[];
    schemaInfo: {
        name?: string;
        isChanged?: boolean;
    };
}

export interface IPluginReportsPluginData
    extends IPluginExportData<typeof PLUGIN_REPORTS_KEY, PluginReportsState, PluginReportsOptions> {
    state: PluginReportsState & {
        infoserviceId: string;
        pivotParams: Record<string, any>;
        /** @deprecated */
        schemaSettings?: PluginReportsArgs;
        args: PluginReportsArgs;
        history: Array<any>;
        // TODO: Тут этого быть не должно. TableAdapter должен сохранять свой стейт
        tableParams: any;
    };
}

type PluginReportsMap = {
    [REPORTS_ACTION.STATE_UPDATE]: PluginReportsState;
    [REPORTS_ACTION.FORCE_UPDATE]: undefined;
    [REPORTS_ACTION.ON_FETCH_START]: { options: undefined };
    [REPORTS_ACTION.ON_FETCH_WAIT]: { options: undefined };
    [REPORTS_ACTION.ON_FETCH_END]: {
        data: { answerId: string } | { status: any; message: any; errors: any; stack: any; answerId: string; payload: any };
    };
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginReportsMap {}
}

interface PluginReportsPluginRegistry {
    [PLUGIN_REPORTS_KEY]: PluginReports;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginReportsPluginRegistry {}
}
