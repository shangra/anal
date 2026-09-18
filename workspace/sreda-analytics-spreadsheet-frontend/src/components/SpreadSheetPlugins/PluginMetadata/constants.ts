export const PLUGIN_METADATA_KEY = 'PluginMetadata' as const;

// ── Размеры по умолчанию ──────────────────────────────────────────────────────
export const DEFAULT_ROW_HEIGHT = 25;
export const DEFAULT_COLUMN_WIDTH = 75;

// ── Минимальные размеры (ограничения resize / auto-fit) ───────────────────────
export const MIN_COLUMN_WIDTH = 30;
export const MIN_ROW_HEIGHT = 16;

// ── Padding по умолчанию (используется в auto-fit) ───────────────────────────
export const DEFAULT_PADDING_X = 5;
export const DEFAULT_PADDING_Y = 2.5;

// ── Начальные размеры таблицы ────────────────────────────────────────────────
export const DEFAULT_ROWS_COUNT = 100_000;
export const DEFAULT_COLUMNS_COUNT = 8_000;
