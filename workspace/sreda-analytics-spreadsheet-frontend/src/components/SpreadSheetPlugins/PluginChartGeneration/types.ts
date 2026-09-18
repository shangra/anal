import { LineComputedDataProps } from '../../ChartGenerationCMP/src/types';
import { ChartWindowMeta } from './components/ChartWindow/types';
import { PLUGIN_CHART_GENERATION_KEY } from './constants';
import { PluginChartGeneration } from './PluginChartGeneration';

// ─── Типы ─────────────────────────────────────────────────────────────────────

export type Chart = {
    meta: ChartWindowMeta | null;
};

export type PluginChartGenerationOptions = {
    spreadSheetId?: string;
};

/**
 * Состояние плагина.
 * Хранится в SpreadsheetAdapter под ключом PLUGIN_CHART_GENERATION_KEY.
 */
export interface PluginChartGenerationState {
    /**
     * Данные для графика, вычисленные из текущего выделения.
     * null — нет выделения или данных недостаточно для построения.
     */
    chartData: LineComputedDataProps | null;
    /** Открытые окна графиков: uuid -> мета */
    charts: Record<string, Chart>;
}

type PluginChartGenerationActionMap = {
    ['CHART_DATA_UPDATE']: { chartData: LineComputedDataProps | null };
    ['CHART_CREATE']: { uuid: string };
    ['CHART_META_UPDATE']: { uuid: string; meta: ChartWindowMeta };
    ['CHART_REMOVE']: { uuid: string };
};

declare module '../../AdapterSpreadSheet/plugin/SpreadsheetAction' {
    export interface SpreadsheetActionMap extends PluginChartGenerationActionMap {}
}

interface PluginChartGenerationPluginRegistry {
    [PLUGIN_CHART_GENERATION_KEY]: PluginChartGeneration;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginChartGenerationPluginRegistry {}
}
