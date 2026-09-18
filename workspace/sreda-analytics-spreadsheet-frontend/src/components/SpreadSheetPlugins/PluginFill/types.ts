import { Range } from '../../AdapterSpreadSheet/models';
import { ICell } from '../../AdapterSpreadSheet/types';
import { PLUGIN_FILL_KEY } from './constants';
import { PluginFill } from './PluginFill';

export interface PluginFillState {
    /** Диапазон при протягивании fill handle */
    fillDraggingRange: Range | null;
}

export interface PluginFillOptions {}

type PluginFillActionMap = {
    ['FILL_START']: Range;
    ['FILL_MOVE']: Range;
    ['FILL_END']: { sourceRange: Range; targetRange: Range; filledData: Map<number, Map<number, ICell>> };
    ['FILL_CANCEL']: undefined;
};

interface PluginQuickCalculationPluginRegistry {
    [PLUGIN_FILL_KEY]: PluginFill;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginQuickCalculationPluginRegistry {}
}

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginFillActionMap {}
}
