import { PluginConfigSnapshot, StylesSnapshot } from '../../AdapterSpreadSheet/plugin/transaction/Transaction';
import { PLUGIN_PAGES_KEY } from './constants';
import { PluginPages } from './PluginPages';

export interface IPageData {
    id: string;
    name: string;
    /** Sparse-матрица ячеек: [rowIndex, [colIndex, ICell][]][] */
    dataSnapshot: [number, [number, any][]][];
    stylesSnapshot: StylesSnapshot | null;
    pluginConfigSnapshot: PluginConfigSnapshot | null;
    cursorSnapshot: { rowIndex: number; columnIndex: number } | null;
}

export interface PluginPagesState {
    pages: IPageData[];
    activePageId: string | null;
}

export interface PluginPagesOptions {
    /** Начальный список листов (если не задан — один лист "Лист 1") */
    initialPages?: Array<{ id: string; name: string }>;
}

type PluginPagesActionMap = {
    PAGE_ADD: { name?: string };
    PAGE_REMOVE: { id: string };
    PAGE_RENAME: { id: string; name: string };
    PAGE_SWITCH: { id: string };
    PAGE_REORDER: { fromIndex: number; toIndex: number };
    PAGE_SAVE_SNAPSHOT: {
        id: string;
        data: Pick<IPageData, 'dataSnapshot' | 'stylesSnapshot' | 'pluginConfigSnapshot' | 'cursorSnapshot'>;
    };
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginPagesActionMap {}
}

interface PluginPagesPluginRegistry {
    [PLUGIN_PAGES_KEY]: PluginPages;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginPagesPluginRegistry {}
}
