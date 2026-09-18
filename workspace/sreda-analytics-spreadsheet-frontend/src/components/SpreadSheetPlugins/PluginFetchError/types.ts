import { PLUGIN_FETCH_ERROR_ACTION, PLUGIN_FETCH_ERROR_KEY } from './constants';
import { PluginFetchError } from './PluginFetchError';

export interface PluginFetchErrorOptions {
    /** Кнопки помощи (mailto:, https:) */
    helpers?: Array<{ icon: string; text: string; action: string }>;
}

export interface PluginFetchErrorState {
    open: boolean;
    title?: string;
    status?: number;
    message?: string;
    stack?: string;
    errors?: { message: string; stack: string }[];
    description?: { short?: string; long?: string };
}

/** Форма payload-а события PLUGIN_FETCH_ERROR/EVENT */
export interface PluginFetchErrorEventPayload {
    title: string;
    status: number;
    message: string;
    stack: string;
    errors: { message: string; stack: string }[];
    payload?: {
        description?: { short?: string; long?: string };
    };
}

type PluginFetchErrorActionMap = {
    [PLUGIN_FETCH_ERROR_ACTION.OPEN]: {
        title: string;
        status: number;
        message: string;
        stack: string;
        errors: { message: string; stack: string }[];
        description: { short?: string; long?: string };
    };
    [PLUGIN_FETCH_ERROR_ACTION.CLOSE]: undefined;
    [PLUGIN_FETCH_ERROR_ACTION.EVENT]: PluginFetchErrorEventPayload;
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginFetchErrorActionMap {}
}

interface PluginFetchErrorPluginRegistry {
    [PLUGIN_FETCH_ERROR_KEY]: PluginFetchError;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginFetchErrorPluginRegistry {}
}
