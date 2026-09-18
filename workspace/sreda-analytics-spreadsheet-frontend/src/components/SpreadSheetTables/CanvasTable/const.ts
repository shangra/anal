import { Theme } from '../../TableAdapters/types';
import { ICamera } from './types';

export const DPR = window.devicePixelRatio || 1;

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const DEFAULT_CAMERA_POSITION: ICamera = { x: 0, y: 0, z: 1 };

export const DEFAULT_ROWS_AMOUNT = 100_000;
export const DEFAULT_COLUMNS_AMOUNT = 8_000;
export const ROWS_HEADER_WIDTH = 75;
export const COLUMNS_HEADER_HEIGHT = 25;

export const DEFAULT_COLUMN_WIDTH = 75;
export const DEFAULT_ROW_HEIGHT = 25;

export const DEFAULT_SELECTION_BORDER_WIDTH = 2;

export const COLLAPSED_INDICATOR_TOLERANCE = 2;

export const MIN_COLUMN_WIDTH = 75;
export const MIN_ROW_HEIGHT = 20;

export const SCROLL_TIMER_LINE = 2000;
export const SCROLL_TIMER_STEP = 50;
export const SCROLL_GAP = 60;
export const SCROLLBAR_TRACK_PADDING = 18; // Отступы трека скроллбара (верх+низ или лево+право)

export const DEFAULT_PADDING_X = 5;
export const DEFAULT_PADDING_Y = 2.5;

export const DEFAULT_FONT_SIZE = 12;
export const DEFAULT_FONT_FAMILY = 'nav-sans, sans-serif, Arial';
export const DEFAULT_VERTICAL_ALIGN = 'top';
export const DEFAULT_HORIZONTAL_ALIGN = 'start';
export const DEFAULT_COLOR = '#000';
export const DEFAULT_HYPHENATION = 'ncrop'; // "ncrop" | "transfer" | "crop"

/**
 * Multiply fontSize to this factor, you will get line height
 */
export const LINE_HEIGHT_FACTOR = 1.3;

export const COMPONENTS_GAP = 5;
export const COMPONENT_SIZE = DEFAULT_FONT_SIZE;

const DEFAULT_BG_COLOR = '#131824';
const DEFAULT_TEXT_COLOR = '#FFFFFFD9';

const DEFAULT_BG_ALT_COLOR = '#7C89AB33';
const DEFAULT_EVEN_BG_COLOR = '#7C89AB0F';
const DEFAULT_BORDER_COLOR = '#7C89AB29';
const DEFAULT_RESIZER_BG_COLOR = '#808080';
const DEFAULT_ACTIVE_COLOR = '#4786FF';
const DEFAULT_SELECTED_RANGE_BG = '#7C89AB66';

const DEFAULT_CMP_COLOR = '#4786FF';
const DEFAULT_CMP_HOVER_COLOR = '#70A1FF';
export const DEFAULT_CMP_SECONDARY_COLOR = '#7C89AB';
const DEFAULT_CMP_SECONDARY_HOVER_COLOR = '#959FBB';
const DEFAULT_CMP_CONTROLLED_COLOR = '#414859';
const DEFAULT_CMP_CONTROLLED_HOVER_COLOR = '#50586e';

export const RESIZE_GUIDE_COLOR = '#0078D7'; // Blue color for resize guides
export const RESIZE_GUIDE_WIDTH = 2; // Width of resize guide lines
export const DRAG_INDICATOR_COLOR = 'rgba(0, 120, 215, 0.8)'; // Semi-transparent blue for drag indicators
export const DRAG_INDICATOR_FILL = 'rgba(0, 120, 215, 0.1)'; // Very transparent blue for drag indicator fill

export const DEFAULT_THEME: Theme = {
    bgColor: DEFAULT_BG_COLOR,
    borderColor: DEFAULT_BORDER_COLOR,
    // rowsCellBg: DEFAULT_BG_COLOR,
    evenRowsCellBg: DEFAULT_EVEN_BG_COLOR,
    color: DEFAULT_TEXT_COLOR,
    cmpColor: DEFAULT_CMP_COLOR,

    headerCellBg: DEFAULT_BG_COLOR,
    headerCellAltBg: DEFAULT_BG_ALT_COLOR,
    headerCellActiveBg: DEFAULT_ACTIVE_COLOR,

    activeСellColor: DEFAULT_TEXT_COLOR,
    activeСellBgColor: 'transparent',
    activeСellBorderColor: DEFAULT_ACTIVE_COLOR,
    selectedRangeBg: DEFAULT_SELECTED_RANGE_BG,
    // evenRowsCellBorderColor: DEFAULT_BORDER_COLOR,
    // evenRowsCellColor: DEFAULT_TEXT_COLOR,
    // oddRowsCellBg: DEFAULT_BG_COLOR,
    // oddRowsCellBorderColor: DEFAULT_BORDER_COLOR,
    // oddRowsCellColor: DEFAULT_TEXT_COLOR,

    cmpPrimaryColor: DEFAULT_CMP_COLOR,
    cmpPrimaryHoverColor: DEFAULT_CMP_HOVER_COLOR,
    cmpSecondaryColor: DEFAULT_CMP_SECONDARY_COLOR,
    cmpSecondaryHoverColor: DEFAULT_CMP_SECONDARY_HOVER_COLOR,
    cmpControlledColor: DEFAULT_CMP_CONTROLLED_COLOR,
    cmpControlledHoverColor: DEFAULT_CMP_CONTROLLED_HOVER_COLOR,

    rowResizerBg: DEFAULT_RESIZER_BG_COLOR,
    rowResizerIndicatorBg: DEFAULT_RESIZER_BG_COLOR,
    columnResizerBg: DEFAULT_RESIZER_BG_COLOR,
    columnResizerIndicatorBg: DEFAULT_RESIZER_BG_COLOR,
};

// export const MY_THEME: Theme = {
//     bgColor: theme.colors.background.primary,
//     headerCellBg: theme.colors.background.popup,
//     headerCellAltBg: theme.colors.background.popupComplex,
//     headerCellActiveBg: theme.colors.background.highlighted,
//     // rowResizerBg: '',
//     // rowResizerIndicatorBg: '',
//     // columnResizerBg: '',
//     columnResizerIndicatorBg: '',
//     activeСellColor: theme.colors.text.primary,
//     activeСellBorderColor: theme.colors.basic.primary,
//     evenRowsCellBg: theme.colors.background.line,
//     evenRowsCellBorderColor: theme.colors.border.secondary,
//     evenRowsCellColor: theme.colors.text.primary,
//     oddRowsCellBg: theme.colors.background.primary,
//     oddRowsCellBorderColor: theme.colors.border.secondary,
//     oddRowsCellColor: theme.colors.text.primary,
//     selectedRangeBg: theme.colors.background.tab,
//     cmpPrimaryColor: theme.colors.basic.primary,
//     cmpPrimaryHoverColor: theme.colors.basic.primaryHover,
//     cmpSecondaryColor: theme.colors.basic.secondary,
//     cmpSecondaryHoverColor: theme.colors.basic.secondaryHover,
//     cmpControlledColor: theme.colors.basic.primary,
//     cmpControlledHoverColor: theme.colors.basic.primaryHover,
//     color: theme.colors.text.primary,
//     menuBackground: theme.colors.background.primary,
//     menuBorder: 'transparent',
//     menuHoverBackground: theme.colors.background.tertiary,
//     menuDisabledText: theme.colors.text.disabled,
// };
