// Основной плагин
export { PluginMetadata } from './PluginMetadata';

// Константы
export {
    PLUGIN_METADATA_KEY,
    DEFAULT_ROW_HEIGHT,
    DEFAULT_COLUMN_WIDTH,
    MIN_COLUMN_WIDTH,
    MIN_ROW_HEIGHT,
    DEFAULT_PADDING_X,
    DEFAULT_PADDING_Y,
    DEFAULT_ROWS_COUNT,
    DEFAULT_COLUMNS_COUNT,
} from './constants';

// Типы
export type { PluginMetadataState, PluginMetadataOptions } from './types';

// Helpers (для внешнего использования: тесты, другие плагины)
export { assertMeasurementAPI, normalizeIndices } from './helpers';

// Async helpers
export { measureColumnsAsync } from './asyncAutoFit';
export type { AutoFitTask, ColumnMeasureInput } from './asyncAutoFit';
