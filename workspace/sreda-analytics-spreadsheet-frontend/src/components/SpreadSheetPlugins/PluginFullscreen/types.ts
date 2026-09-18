import { FULLSCREEN_ACTIONS, PLUGIN_FULLSCREEN_KEY } from './constants';
import { PluginFullscreen } from './PluginFullscreen';

export interface PluginFullscreenOptions {
    /** Ref контейнера, который должен развернуться на весь экран */
    containerRef: React.RefObject<HTMLElement>;
}

export interface PluginFullscreenState {
    fullscreen: boolean;
}

type PluginFullscreenActionMap = {
    [FULLSCREEN_ACTIONS.TOGGLE]: boolean;
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginFullscreenActionMap {}
}

interface PluginFullscreenPluginRegistry {
    [PLUGIN_FULLSCREEN_KEY]: PluginFullscreen;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginFullscreenPluginRegistry {}
}
