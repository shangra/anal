import { PLUGIN_PROFILE_QUERY_KEY, PROFILE_QUERY_ACTION } from './constants';
import { PluginProfileQuery } from './PluginProfileQuery';

export interface PluginProfileQueryOptions {
    server?: string;
}

export interface IPluginProfileQueryRequestPlanStep {
    message: string;
    date: string;
    context: string;
}

export interface IPluginProfileQueryRequestPlan {
    answerId: string;
    steps: IPluginProfileQueryRequestPlanStep[];
}

export interface IPluginProfileQueryRequest {
    answerId: string;
    requestId: string;
    plan?: IPluginProfileQueryRequestPlan;
    error?: {
        message: string;
        stack?: string;
        status?: number;
        code?: string;
        errors?: Array<{ message: string; stack: string }>;
    };
    expiresAt?: number;
    createdAt?: number;
}

/**
 * requests перенесены из локального состояния ProfileWindow в reducer-стейт плагина.
 * Это устраняет анти-паттерн прямой мутации ProfileWindowRef.current.setState().
 */
export interface PluginProfileQueryState {
    /** Активен ли режим профилирования запросов */
    explain: boolean;
    /** Накопленные запросы с планами выполнения */
    requests: IPluginProfileQueryRequest[];
}

export interface IPluginProfileQueryAddRequestPayload {
    requestId: string;
    answerId?: string;
    plan?: IPluginProfileQueryRequestPlan;
    error?: IPluginProfileQueryRequest['error'];
    expiresAt?: number;
}

export interface IPluginProfileQueryUpdateRequestPayload {
    answerId?: string;
    requestId?: string;
    plan?: IPluginProfileQueryRequestPlan;
    error?: IPluginProfileQueryRequest['error'];
    expiresAt?: number;
}

type PluginProfileQueryActionMap = {
    [PROFILE_QUERY_ACTION.OPEN]: undefined;
    [PROFILE_QUERY_ACTION.CLOSE]: undefined;
    [PROFILE_QUERY_ACTION.ADD_REQUEST]: IPluginProfileQueryAddRequestPayload;
    [PROFILE_QUERY_ACTION.UPDATE_REQUEST]: IPluginProfileQueryUpdateRequestPayload;
    [PROFILE_QUERY_ACTION.CLEAR_REQUESTS]: undefined;
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginProfileQueryActionMap {}
}

interface PluginProfileQueryPluginRegistry {
    [PLUGIN_PROFILE_QUERY_KEY]: PluginProfileQuery;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginProfileQueryPluginRegistry {}
}
