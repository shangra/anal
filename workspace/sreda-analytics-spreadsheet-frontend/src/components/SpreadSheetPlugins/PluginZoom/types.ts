import { PLUGIN_ZOOM_KEY, ZOOM_ACTION } from './constants';
import { PluginZoom } from './PluginZoom';

export interface PluginZoomOptions {}

export interface PluginZoomState {
    /** Текущий масштаб в % */
    zoom: number; // фактический (зажатый) зум
    value: number; // отображаемое значение в поле ввода
}

type PligunZoomActionMap = {
    [ZOOM_ACTION.INPUT_CHANGE]: PluginZoomState;
    [ZOOM_ACTION.BLUR]: undefined;
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PligunZoomActionMap {}
}

interface PluginZoomPluginRegistry {
    [PLUGIN_ZOOM_KEY]: PluginZoom;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginZoomPluginRegistry {}
}
