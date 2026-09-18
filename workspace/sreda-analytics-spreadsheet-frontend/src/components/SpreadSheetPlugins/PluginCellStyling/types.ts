import { CELL_STYLING_ACTION, PLUGIN_CELL_STYLING_KEY } from './constants';
import { PluginCellStyling } from './PluginCellStyling';

export type PluginCellStylingOptions = {};

export interface PluginCellStylingState {}

type PluginCellStylingActionMap = {
    [CELL_STYLING_ACTION.STYLE_APPLIED]: undefined;
    [CELL_STYLING_ACTION.FORMAT_PAINTER_COPIED]: undefined;
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginCellStylingActionMap {}
}

interface PluginCellStylingPluginRegistry {
    [PLUGIN_CELL_STYLING_KEY]: PluginCellStyling;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginCellStylingPluginRegistry {}
}
