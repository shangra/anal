import { Range } from '../../AdapterSpreadSheet/models';
import { CELL_FORMATTING_ACTION, PLUGIN_CELL_FORMATTING_KEY } from './constants';
import { PluginCellFormatting } from './PluginCellFormatting';

export enum CellFormattingType {
    default = 'default',
    number = 'number',
    money = 'money',
    finance = 'finance',
    count = 'count',
    date = 'date',
    datetime = 'datetime',
    percent = 'percent',
    fractional = 'fractional',
    exponential = 'exponential',
    text = 'text',
    additional = 'additional',
}

export enum CellFormattingTypeNames {
    default = 'Общий',
    number = 'Числовой',
    money = 'Денежный',
    finance = 'Финансовый',
    count = 'Количественный',
    date = 'Дата',
    datetime = 'Дата и время',
    percent = 'Процентный',
    fractional = 'Дробный',
    exponential = 'Экспоненциальный',
    text = 'Текстовый',
    additional = 'Другой',
}

export type PluginCellFormattingConfig = {
    format?: CellFormattingType;
    /** Знаков после запятой */
    decimalPlaces?: number;
    /** Показывать разделители разрядов (группировка) */
    useGrouping?: boolean;
};

export interface PluginCellFormattingOptions {}

export interface PluginCellFormattingState {}

type PluginCellFormattingCellPluginConfig = {
    [PLUGIN_CELL_FORMATTING_KEY]?: PluginCellFormattingConfig;
};

interface PluginChartGenerationPluginRegistry {
    [PLUGIN_CELL_FORMATTING_KEY]: PluginCellFormatting;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface ICellPluginsConfig extends PluginCellFormattingCellPluginConfig {}
    export interface PluginRegistry extends PluginChartGenerationPluginRegistry {}
}

type PluginCellFormattingActionMap = {
    [CELL_FORMATTING_ACTION.FORMAT_PAINTER_APPLY]: {
        ranges: Range[];
        config: PluginCellFormattingConfig | null;
    };
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginCellFormattingActionMap {}
}
