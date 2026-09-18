import { PLUGIN_QUICK_CALC_KEY } from './constants';
import { PluginQuickCalculation } from './PluginQuickCalculation';

export interface PluginQuickCalculationOptions {}

export interface PluginQuickCalculationState {}

interface PluginQuickCalculationPluginRegistry {
    [PLUGIN_QUICK_CALC_KEY]: PluginQuickCalculation;
}

declare module '../../AdapterSpreadSheet/types' {
    export interface PluginRegistry extends PluginQuickCalculationPluginRegistry {}
}
