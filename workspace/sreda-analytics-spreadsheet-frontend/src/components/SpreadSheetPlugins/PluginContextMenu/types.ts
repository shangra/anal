import { CONTEXT_MENU_ACTION } from './constants';
import { PluginContextMenu } from './PluginContextMenu';

type PluginContextMenuActionMap = {
    /** Закрытие контекстного меню */
    [CONTEXT_MENU_ACTION.CLOSE]: undefined;
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginContextMenuActionMap {}
}

declare module '../../AdapterSpreadSheet/types' {
    interface PluginRegistry {
        PluginContextMenu: PluginContextMenu;
    }
}
