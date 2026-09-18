import { JoinedCell } from '../../AdapterSpreadSheet/models';
import { PLUGIN_JOINED_CELLS_KEY } from './constants';
import { PluginJoinedCells } from './PluginJoinedCells';

export type PluginJoinedCellsOptions = {};

export type PluginJoinedCellsState = {
    /** Объединённые ячейки */
    joinedCells: JoinedCell[];
};

type PluginJoinedCellsActionMap = {
    ['JOINED_CELLS_SET']: JoinedCell[];
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginJoinedCellsActionMap {}
}

interface PluginJoinedCellsPluginRegistry {
    [PLUGIN_JOINED_CELLS_KEY]: PluginJoinedCells;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginJoinedCellsPluginRegistry {}
}
