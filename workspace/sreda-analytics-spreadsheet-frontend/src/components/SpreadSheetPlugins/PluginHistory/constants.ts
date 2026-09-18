export const PLUGIN_HISTORY_KEY = 'PluginHistory' as const;

export const HISTORY_ACTION = {
    /**
     * Сигнал об undo/redo — диспатчится PluginHistory после восстановления состояния.
     * Плагины с мутабельным side-state могут использовать для синхронизации.
     */
    RESTORED: 'HISTORY/RESTORED',
    /**
     * Очищает стек undo/redo в PluginHistory.
     * Диспатчится через context.clearHistory() (например, при загрузке нового файла).
     */
    CLEAR: 'HISTORY/CLEAR',
} as const;
