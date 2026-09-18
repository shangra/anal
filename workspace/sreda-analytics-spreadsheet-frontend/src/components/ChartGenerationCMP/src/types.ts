// eslint-disable-next-line import/no-unresolved
import { HorizontalAlignmentType, IconType, VerticalAlignmentType } from 'recharts/types/component/DefaultLegendContent';

import { CellDataType } from '../../AdapterSpreadSheet/types';
import { AreaMeta } from './components/Area/types';
import { BarMeta } from './components/Bar/types';
import { LineMeta } from './components/Line/types';
import { PieMeta } from './components/Pie/types';
import { ScatterMeta } from './components/Scatter/types';
import { CHART_LAYOUT, CHART_TYPE } from './constants';
import { Value } from './utils';

/**
 * Координата строки
 */
export type RowCoordinate = `${number}`;
/**
 * Координата колонки
 */
export type ColumnCoordinate = string;
/**
 * Тип координат для пользовательского использования
 */
export type Coordinate = `${ColumnCoordinate}${RowCoordinate}`;
/**
 * Тип диапазона координат
 */
export type CoordinateRange = `${Coordinate}:${Coordinate}`;
/**
 * Координата строки
 */
export type RowIndexes = `${number}`;
/**
 * Координата колонки
 */
export type ColumnIndexes = `${number}`;
/**
 * Строчное представление индексов
 */
export type Indexes = `${ColumnIndexes}:${RowIndexes}`;

export type ChartTypes = Value<typeof CHART_TYPE>;
export type ChartLayout = Value<typeof CHART_LAYOUT>;

export type MetaXAxis = {
    hide?: boolean;
    orientation?: 'top' | 'bottom';
    stroke?: string;
    strokeDasharray?: string;
    strokeWidth?: number;
};

export type MetaYAxis = {
    hide?: boolean;
    orientation?: 'left' | 'right';
    stroke?: string;
    strokeDasharray?: string;
    strokeWidth?: number;
};

export type MetaZAxis = {
    range?: [number, number];
};

export type MetaLegend = {
    layout?: ChartLayout;
    align?: HorizontalAlignmentType;
    verticalAlign?: VerticalAlignmentType;
    iconSize?: number;
    iconType?: IconType;
};

export type MetaTooltip = {
    separator?: string;
};

export type MetaGrid = {
    horizontal?: boolean;
    vertical?: boolean;
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeDasharray?: string;
    strokeWidth?: number;
};

export type ChartData = CellDataType[][];

export type BaseElementMeta = {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
};

export type ChartRange = {
    cells?: CoordinateRange;
    cellStart?: `${number}:${number}`;
    cellEnd?: `${number}:${number}`;
    orientation?: 'horizontal' | 'vertical';
};

export type BaseMeta = {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
};

export type BaseChartGenerationProps<T extends ChartTypes, M extends Object> = {
    type: T;
    meta?: BaseMeta & M;
};

// ----------------- Computed Data -----------------
export type LineComputedData = {
    category: CellDataType;
    lines: Record<number | string, number | string>;
};

export type LineComputedDataList = Array<LineComputedData>;

export type LineComputedValue = {
    category: string;
    lines: Record<string, number>;
};

export type LineComputedMeta = {
    itemsRange: ChartRange;
    titleRange: ChartRange;
    categoryRange: ChartRange;
    values?: LineComputedDataList;
    items?: Array<BaseElementMeta & { order?: number }>;
};

export type LineComputedArgs<T extends LineComputedMeta> = {
    data: Record<Indexes, CellDataType>;
    meta?: T;
};

export type LineComputedDataProps = {
    titleData: CellDataType[];
    categoryData: CellDataType[];
    itemsData: (CellDataType | null)[][];
};

export type PieComputedDataProps = {
    titleCell: CellDataType;
    titleData: CellDataType[];
    valuesData: CellDataType[];
};

export type ScatterComputedDataProps = {
    titleCell: CellDataType;
    xData: CellDataType[];
    yData: CellDataType[];
    zData?: CellDataType[];
};

export type СoordinateComputedData = {
    title: CellDataType;
    coordinate: {
        x: CellDataType;
        y: CellDataType;
        z?: CellDataType;
    }[];
};

export type СoordinateComputedDataList = Array<СoordinateComputedData>;

export type СoordinateGroupType = {
    title?: Coordinate;
    xAxisRange?: ChartRange;
    yAxisRange?: ChartRange;
    zAxisRange?: ChartRange;
};

export type СoordinateComputedMeta = {
    groups?: СoordinateGroupType[];
    items?: Array<BaseElementMeta>;
};

export type СoordinateComputedArgs<T extends СoordinateComputedMeta> = {
    data: ChartData;
    meta?: T;
};

export type PieComputedData = {
    title: CellDataType;
    values: {
        title: CellDataType;
        value: CellDataType;
    }[];
};

export type PieComputedDataList = Array<PieComputedData>;

export type PieGroupRangesType = {
    titleGroup?: Coordinate;
    valueRange?: ChartRange;
    titleRange?: ChartRange;
};

export type PieComputedMeta = {
    groupRanges?: PieGroupRangesType[];
    groups?: Array<{
        innerRadius?: `${number}%`;
        outerRadius?: `${number}%`;
        items?: Array<BaseElementMeta>;
    }>;
};

export type PieComputedArgs<T extends PieComputedMeta> = {
    data: ChartData;
    meta?: T;
};

export type ChartValues = LineComputedDataList | PieComputedDataList | СoordinateComputedDataList;

// ----------------- Chart Generation -----------------
export type ChartGenerationProps<T extends ChartTypes> = {
    type: T;
    meta?: T extends 'area'
        ? BaseMeta & AreaMeta
        : T extends 'bar'
        ? BaseMeta & BarMeta
        : T extends 'line'
        ? BaseMeta & LineMeta
        : T extends 'scatter'
        ? BaseMeta & ScatterMeta
        : T extends 'pie'
        ? BaseMeta & PieMeta
        : any;
    chartValues: ChartValues;
};
