import { ColumnIndex, IHeaderGroup, RowIndex } from '../../AdapterSpreadSheet/types';
import { PLUGIN_GROUPS_KEY } from './constants';
import { PluginGroups } from './PluginGroups';

export interface PluginGroupsState {
    /** Группы строк */
    rowGroups: IHeaderGroup[];

    /** Группы колонок */
    columnGroups: IHeaderGroup[];
}

export interface PluginGroupsOptions {}

type PluginGroupsActionMap = {
    ROW_GROUP_ADD: IHeaderGroup;
    COLUMN_GROUP_ADD: IHeaderGroup;
    ROW_GROUP_REMOVE: string;
    COLUMN_GROUP_REMOVE: string;
    GROUP_TOGGLE: { id: string; groupType: 'row' } | { id: string; groupType: 'column' };
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginGroupsActionMap {}
}

interface PluginGroupsPluginRegistry {
    [PLUGIN_GROUPS_KEY]: PluginGroups;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginGroupsPluginRegistry {}
}
