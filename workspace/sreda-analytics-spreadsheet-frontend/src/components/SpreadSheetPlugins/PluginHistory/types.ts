import { DataChange, PluginConfigSnapshot, StylesSnapshot } from '../../AdapterSpreadSheet/plugin';
import { PluginStatesMap } from '../../AdapterSpreadSheet/plugin/Plugin';
import { MetadataSnapshot } from '../../AdapterSpreadSheet/utils/MetadataManager';
import { HISTORY_ACTION } from './constants';
import { PluginHistory } from './PluginHistory';

export interface HistoryEntry {
    /** Полное состояние всех плагинов до транзакции */
    fullPluginState: PluginStatesMap;
    dataChanges: DataChange[];
    stylesSnapshot: StylesSnapshot | null;
    pluginConfigSnapshot: PluginConfigSnapshot | null;
    metadataSnapshot: MetadataSnapshot | null;
    /** ID группы: все append-транзакции одного drain-цикла разделяют один groupId */
    groupId: string | null;
}

export interface PluginHistoryState {
    /** Семафор для триггера перерисовки при изменении hasPast/hasFuture */
    hasPast: boolean;
    hasFuture: boolean;
}

export interface PluginHistoryOptions {
    maxHistorySize?: number;
}

type PluginHistoryActionMap = {
    /**
     * Сигнал об undo/redo — диспатчится PluginHistory после восстановления состояния.
     * Плагины с мутабельным side-state могут использовать для синхронизации.
     */
    [HISTORY_ACTION.RESTORED]: undefined;
    /**
     * Очищает стек undo/redo в PluginHistory.
     * Диспатчится через context.clearHistory() (например, при загрузке нового файла).
     */
    [HISTORY_ACTION.CLEAR]: undefined;
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginHistoryActionMap {}
}

declare module '../../AdapterSpreadSheet/types' {
    interface PluginRegistry {
        PluginHistory: PluginHistory;
    }
}
