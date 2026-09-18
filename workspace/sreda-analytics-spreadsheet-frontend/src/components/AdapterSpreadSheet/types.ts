/**
 * Единственный источник типов для AdapterSpreadSheet и всей экосистемы плагинов.
 *
 * Архитектура: Reducer-Based State + Plugin Slices (ProseMirror-подход).
 *
 * Структура файла:
 * § 1 — Примитивные индексные типы
 * § 2 — Координатные типы (Excel-нотация)
 * § 3 — Данные ячеек
 * § 4 — Стили ячеек
 * § 5 — Диапазоны и выделение
 * § 6 — Система плагинов
 * § 11 — Интерфейс IAdapter
 * § 12 — Props компонента
 * § 13 — Абстрактный класс Adapter
 */

import { Component, CSSProperties, RefObject } from 'react';

import { AnimationOptions, Keyframe } from '../SpreadSheetTables/CanvasTable/animation/types';
import { IVisibleRanges } from '../SpreadSheetTables/CanvasTable/types';
import { ISpreadSheet, ITableAPI, SpreadSheetAdapter, Theme } from '../TableAdapters/types';
import { Cell } from './models';
import { IPlugin, Plugin, PluginStatesMap } from './plugin/Plugin';
import { SpreadsheetAction } from './plugin/SpreadsheetAction';
import StyleManager from './utils/StyleManager';

// ─────────────────────────────────────────────────────────────────────────────
// § 1. Примитивные индексные типы
// ─────────────────────────────────────────────────────────────────────────────

export type RowIndex = number;
export type ColumnIndex = number;
/** Строковое представление индекса строки (1-based) */

export type RowCoordinate = `${number}`;
/** Строковое представление индекса колонки (A, B, …, AA, …) */
export type ColumnCoordinate = string;
/** Объектное представление индексов ячейки */
export type ObjectIndexes = {
    rowIndex: RowIndex;
    columnIndex: ColumnIndex;
};

// ─────────────────────────────────────────────────────────────────────────────
// § 2. Координатные типы (Excel-нотация)
// ─────────────────────────────────────────────────────────────────────────────

type RegexMatchedString<Pattern extends string> = `${string & { __brand: Pattern }}`;
export type ExcelRowIndexType = number;
export type ExcelColumnIndexType = RegexMatchedString<'[A-Z]+'>;
/** Координата ячейки в Excel-нотации: A1, B12, AA3… */
export type ExcelSpreadSheetCoordinate = `${ExcelColumnIndexType}${ExcelRowIndexType}`;
/** Направление вставки строки/колонки */
export type AdapterSpreadSheetPosition = 'top' | 'bottom' | 'left' | 'right';

// ─────────────────────────────────────────────────────────────────────────────
// § 3. Данные ячеек
// ─────────────────────────────────────────────────────────────────────────────

export type CellDataType = string | number | undefined | null;

/** Конфигурация ячейки (мета-поведение) */
export type ICellConfig = {
    /** Запрет на редактирование */
    readonly?: boolean;
    /** Ячейка в режиме редактирования */
    editing?: boolean;
    /** Состояние загрузки */
    isLoading?: boolean;
};

/** Словарь конфигураций плагинов для ячейки */
export interface ICellPluginsConfig {
    // Расширяется плагинами через module augmentation
    // [key: string]: any;
}

// ─── Кнопка-компонент внутри ячейки ──────────────────────────────────────────
interface ICellComponent {
    positionRelativeToText: 'before' | 'after';
}

export interface IButton extends ICellComponent {
    type: 'button';
    icon: string;
    disabled: boolean;
    loading: boolean;
    color?: 'primary' | 'secondary' | 'controlled';
    payload?: {
        icon: string;
        color?: 'primary' | 'secondary' | 'controlled';
        loading?: boolean;
        disabled?: boolean;
        onClick?: (event: {
            metaKey: boolean;
            altKey: boolean;
            ctrlKey: boolean;
            shiftKey: boolean;
            cell: ObjectIndexes;
        }) => void;
        onMouseUp?: (event: {
            metaKey: boolean;
            altKey: boolean;
            ctrlKey: boolean;
            shiftKey: boolean;
            cell: ObjectIndexes;
        }) => void;
        onDblClick?: (event: {
            metaKey: boolean;
            altKey: boolean;
            ctrlKey: boolean;
            shiftKey: boolean;
            cell: ObjectIndexes;
        }) => void;
    };
    onMouseDown?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onClick?: (event: { metaKey: boolean; altKey: boolean; ctrlKey: boolean; shiftKey: boolean; cell: ObjectIndexes }) => void;
    onMouseUp?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    onDblClick?: (event: {
        metaKey: boolean;
        altKey: boolean;
        ctrlKey: boolean;
        shiftKey: boolean;
        cell: ObjectIndexes;
    }) => void;
    animation?: {
        keyframes: Keyframe[];
        options: Omit<AnimationOptions, 'onUpdate' | 'onComplete' | 'onIteration'>;
    };
}

/** Объект данных одной ячейки */
export interface ICell {
    data: CellDataType;
    config?: ICellConfig;
    pluginsConfig?: ICellPluginsConfig;
    components?: IButton[];
}

// ─────────────────────────────────────────────────────────────────────────────
// § 4. Стили ячеек
// ─────────────────────────────────────────────────────────────────────────────

export interface IFontDecoration {
    isStrikeThrough?: boolean;
    isUnderline?: boolean;
}

export interface IBorder<T> {
    left?: T;
    top?: T;
    right?: T;
    bottom?: T;
}

export interface IGradientColorStop {
    position?: number;
    color: string;
}

export interface IGradientColor {
    type: 'linear' | 'radial';
    direction: string;
    stops: IGradientColorStop[];
}

export type BorderStyle = 'solid' | 'dotted' | 'dashed';

export type Align = 'start' | 'center' | 'end';

export type Hyphenation = 'ncrop' | 'transfer' | 'crop';

/** Полный набор визуальных стилей ячейки */
export interface ICellStyles {
    borderColor?: string | IBorder<string> | null;
    borderStyle?: BorderStyle | IBorder<BorderStyle>;
    backgroundColor?: string | IGradientColor | null;
    color?: string | null;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: 'normal' | 'italic';
    fontWeight?: 'bold' | 'normal' | 'lighter' | 'bolder' | number;
    fontDecoration?: IFontDecoration;
    verticalAlign?: Align;
    horizontalAlign?: Align;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    hyphenation?: Hyphenation;
}

/** Ячейка со стилями (для setCellsWithStyle) */
export interface ICellWithStyles extends ICell {
    styles?: ICellStyles;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5. Диапазоны и выделение
// ─────────────────────────────────────────────────────────────────────────────

/** Визуальные стили выделенного диапазона */
export interface IRangeStyles {
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    backgroundColor?: string;
    backgroundOpacity?: number;
    animated?: boolean;
}

/** Мета-данные строки */
export type RowMeta = {
    height: number;
};

/** Мета-данные колонки */
export type ColumnMeta = {
    width: number;
};

/** Группировка строк/колонок */
export interface IHeaderGroup {
    id: string;
    start: number;
    end: number;
    collapsed: boolean;
}

export interface CellRange {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
}

export interface StyledRange<T = unknown> extends CellRange {
    id: string;
    timestamp: number;
    data: T;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 6. Система плагинов
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Запись плагина в PluginsMap.
 * Принимает готовый инстанс Plugin.
 *
 * @template K — тип ключа слайса плагина
 * @template S — тип состояния слайса плагина
 * @template O — тип опций слайса плагина
 */
export interface PluginEntry<K extends string = string, S extends {} = {}, O extends {} = {}> {
    component: Plugin<K, S, O>;
    rootId?: string;
    options?: O;
}

export type PluginEntryOf<P extends Plugin<string, {}, {}>> = P extends Plugin<infer K, infer S, infer O>
    ? PluginEntry<K, S, O>
    : never;

/**
 * Карта записей плагинов для передачи в AdapterSpreadSheet.
 * Ключи — произвольные display-имена, значения — PluginEntry.
 */
export type PluginEntriesMap = Record<string, PluginEntry<string, {}, {}>>;

/**
 * Расширяемый реестр плагинов приложения.
 * Каждый плагин регистрирует себя через module augmentation в своём файле.
 *
 * @example
 * // plugins/PluginCellEdit.ts
 * declare module '../plugin/PluginContext' {
 *   interface PluginRegistry {
 *     [PLUGIN_CELL_EDIT_KEY]: PluginCellEdit;
 *   }
 * }
 */
export interface PluginRegistry {
    // Расширяется плагинами через module augmentation
}

/** Извлекает тип состояния плагина из PluginRegistry по ключу */
export type RegistryPluginState<K extends keyof PluginRegistry> = PluginRegistry[K]['__state'];

export type RegistryPluginOptions<K extends keyof PluginRegistry> = PluginRegistry[K]['__options'];

/** Типизированная карта на основе реестра */
export type RegistryPluginEntriesMap = {
    [K in keyof PluginRegistry]: PluginEntry<
        K extends string ? K : string,
        PluginRegistry[K] extends Plugin<any, infer S, any> ? S : {},
        PluginRegistry[K] extends Plugin<any, any, infer O> ? O : {}
    >;
};

// ─── Вспомогательные экстракторы ─────────────────────────────────────────────

export interface IPluginExportData<K extends string, S extends {}, O extends {} = {}> {
    key: K;
    url: string;
    version: string;
    state: S;
    options: O;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 11. Интерфейс IAdapter
// ─────────────────────────────────────────────────────────────────────────────

export type TContextMenuDivider = {
    divider: true;
};

export type TContextMenuAction = {
    label: string;
    action: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
    priority?: number;
    divider?: never;
};

export type TContextMenuItem = TContextMenuAction | TContextMenuDivider;

export interface IContextMenu {
    visible: boolean;
    x: number;
    y: number;
    items: TContextMenuItem[];
}

/**
 * Контекст, передаваемый в Plugin.getContextMenuItems().
 * Расширяйте union при появлении новых типов (column, row и т.д.).
 */
export type ContextMenuContext = { type: 'cell'; cell: Cell; x: number; y: number };
// | { type: 'column'; columnIndex: number; x: number; y: number }
// | { type: 'row'; rowIndex: number; x: number; y: number };

/**
 * Минимальный React state компонента AdapterSpreadSheet.
 * Содержит только токен для тригера перерисовки.
 * Весь бизнес-стейт хранится в SpreadsheetAdapter (CorePlugin).
 */
export type AdapterReactState = {
    /** Токен последнего обновления (используется только для тригера React-рендера) */
    lastUpdate: number;

    mounted: boolean;

    /** Состояние контекстного меню. */
    contextMenu: IContextMenu;

    /** Размеры, определённые ResizeObserver (используются если width/height не переданы в props) */
    containerWidth: number;
    containerHeight: number;
};

/**
 * Публичный контракт AdapterSpreadSheet.
 * Реализуется конкретным классом AdapterSpreadSheet.
 */
export interface IAdapter {
    plugins: PluginEntriesMap;
    tableAPIRef: RefObject<ITableAPI>;
    styleManager: StyleManager;

    dispatch: (action: SpreadsheetAction) => void;
    undo: () => void;
    redo: () => void;

    getPlugin<K extends keyof PluginRegistry>(key: K): PluginRegistry[K] | undefined;
    getPlugin(key: string): IPlugin | undefined;

    getPluginState<K extends keyof PluginRegistry>(key: K): RegistryPluginState<K> | undefined;
    getPluginState<S>(key: string): S | undefined;

    snapshotState: () => PluginStatesMap;
    restoreState: (snap: PluginStatesMap) => void;

    getCellDisplayValue: (rowIndex: RowIndex, columnIndex: ColumnIndex) => CellDataType | null;
    getCellComponents: (rowIndex: RowIndex, columnIndex: ColumnIndex) => IButton[];
    getCellAt: (cell: Cell) => ICell | null;
    getCellStyle: (rowIndex: RowIndex, columnIndex: ColumnIndex) => ICellStyles;
    getCellConfig: (cell: Cell) => ICellConfig | null;
    getCellPluginConfig: <K extends keyof ICellPluginsConfig>(cell: Cell, key: K) => ICellPluginsConfig[K] | null;
    setCells: (data: Map<RowIndex, Map<ColumnIndex, ICell>>, offset?: { x: ColumnIndex; y: RowIndex }) => void;
    clearCell: (cell: Cell) => void;
    getVisibleRanges: () => IVisibleRanges | null;
    isCellVisible: (rowIndex: number, columnIndex: number) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 12. Props компонента
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props компонента AdapterSpreadSheet.
 * plugins — новый формат на основе Plugin.
 */
export interface AdapterSpreadSheetProps {
    /**
     * Словарь плагинов.
     * Каждый плагин — экземпляр Plugin + опциональные rootId и options.
     *
     * @example
     * plugins={{
     *     cellEdit: { component: new PluginFormulas(), rootId: 'formula-bar' },
     *     cellStyling: { component: new PluginCellStyling(), rootId: 'toolbar' },
     * }}
     */
    // eslint-disable-next-line react/no-unused-prop-types
    plugins: PluginEntriesMap;

    /**
     * Адаптер визуальной части таблицы.
     * @example tableAdapter={CanvasTableAdapter}
     */
    // eslint-disable-next-line react/no-unused-prop-types
    tableAdapter: SpreadSheetAdapter<ISpreadSheet>;

    /** CSS-класс корневого элемента */
    // eslint-disable-next-line react/no-unused-prop-types
    className?: string;

    /** Inline-стили корневого элемента */
    // eslint-disable-next-line react/no-unused-prop-types
    style?: CSSProperties;

    /** id корневого элемента */
    // eslint-disable-next-line react/no-unused-prop-types
    id?: string;

    /** Переопределение темы */
    // eslint-disable-next-line react/no-unused-prop-types
    themeOverride?: Partial<Theme>;

    /** Ширина таблицы (px) */
    // eslint-disable-next-line react/no-unused-prop-types
    width?: number;

    /** Высота таблицы (px) */
    // eslint-disable-next-line react/no-unused-prop-types
    height?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 13. Абстрактный класс AbstractAdapter
// Базовый React-класс-компонент для AdapterSpreadSheet.
// Бизнес-стейт хранится в SpreadsheetAdapter (CorePlugin),
// React state используется только как тригер перерисовки.
// ─────────────────────────────────────────────────────────────────────────────

export abstract class AbstractAdapter extends Component<AdapterSpreadSheetProps, AdapterReactState> implements IAdapter {
    abstract plugins: PluginEntriesMap;

    abstract tableAPIRef: React.RefObject<ITableAPI>;

    abstract styleManager: StyleManager;

    abstract dispatch: (action: SpreadsheetAction) => void;

    abstract undo: () => void;

    abstract redo: () => void;

    abstract getPlugin<K extends keyof PluginRegistry>(key: K): PluginRegistry[K] | undefined;

    abstract getPlugin(key: string): IPlugin | undefined;

    abstract getPluginState<K extends keyof PluginRegistry>(key: K): RegistryPluginState<K> | undefined;

    abstract getPluginState<S>(key: string): S | undefined;

    abstract snapshotState: () => PluginStatesMap;

    abstract restoreState: (snap: PluginStatesMap) => void;

    protected abstract _requestRender(callback?: () => void): void;

    abstract getCellDisplayValue: (rowIndex: RowIndex, columnIndex: ColumnIndex) => CellDataType | null;

    abstract getCellStyle: (rowIndex: RowIndex, columnIndex: ColumnIndex) => ICellStyles;

    abstract getCellAt: (cell: Cell) => ICell | null;

    abstract getCellComponents: (rowIndex: RowIndex, columnIndex: ColumnIndex) => IButton[];

    abstract getCellConfig: (cell: Cell) => ICellConfig | null;

    abstract getCellPluginConfig: <K extends keyof ICellPluginsConfig>(cell: Cell, key: K) => ICellPluginsConfig[K] | null;

    abstract setCells: (data: Map<RowIndex, Map<ColumnIndex, ICell>>, offset?: { x: ColumnIndex; y: RowIndex }) => void;

    abstract clearCell: (cell: Cell) => void;

    abstract getVisibleRanges: () => IVisibleRanges | null;

    abstract isCellVisible: (rowIndex: number, columnIndex: number) => boolean;
}
