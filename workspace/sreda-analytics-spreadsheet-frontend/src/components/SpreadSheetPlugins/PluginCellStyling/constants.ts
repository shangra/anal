export const PLUGIN_CELL_STYLING_KEY = 'PluginCellStyling' as const;

export const CELL_STYLING_FONT_SIZE = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 36, 48, 72] as const;

export enum CELL_STYLING_FONT_FAMILY {
    'SB Sans Text' = 'SB Sans Text',
    'Arial' = 'Arial, sans-serif',
    'Verdana' = 'Verdana, sans-serif',
    'Tahoma' = 'Tahoma, sans-serif',
    'Trebuchet MS' = "'Trebuchet MS', sans-serif",
    'Times New Roman' = "'Times New Roman', serif",
    'Georgia' = 'Georgia, serif',
    'Garamond' = 'Garamond, serif',
    'Courier New' = "'Courier New', monospace",
    'Brush Script MT' = "'Brush Script MT', cursive",
}

export const CELL_STYLING_ACTION = {
    STYLE_APPLIED: 'CELL_STYLING_ACTION/STYLE_APPLIED',
    FORMAT_PAINTER_COPIED: 'CELL_STYLING_ACTION/FORMAT_PAINTER_COPIED',
} as const;
