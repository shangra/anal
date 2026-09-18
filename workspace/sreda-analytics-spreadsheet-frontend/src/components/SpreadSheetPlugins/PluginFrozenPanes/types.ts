import { PLUGIN_FROZEN_PANES_KEY } from './constants';
import { PluginFrozenPanes } from './PluginFrozenPanes';

export interface PluginFrozenPanesState {
    /** Количество закреплённых строк */
    frozenRows: number;

    /** Количество закреплённых колонок */
    frozenColumns: number;
}

export interface PluginFrozenPanesOptions {}

type PluginFrozenPanesActionMap = {
    ['FREEZE_PANES']: { frozenRows: number; frozenColumns: number };
    ['UNFREEZE_PANES']: undefined;
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginFrozenPanesActionMap {}
}

interface PluginFrozenPanesPluginRegistry {
    [PLUGIN_FROZEN_PANES_KEY]: PluginFrozenPanes;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginFrozenPanesPluginRegistry {}
}
