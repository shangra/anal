import { ReactNode } from 'react';

import { convertDate, convertNumber } from '../../SpreadSheetPlugins/PluginChartGeneration/utils';
import { DEFAULT_Z_AXIS_RANGE } from './components/Scatter/constants';
import { CHART_TYPE } from './constants';
import {
    BaseElementMeta,
    ChartGenerationProps,
    ChartTypes,
    ChartValues,
    LineComputedData,
    LineComputedDataList,
    LineComputedDataProps,
    LineComputedMeta,
    PieComputedDataList,
    PieComputedDataProps,
    PieComputedMeta,
    ScatterComputedDataProps,
    СoordinateComputedDataList,
    СoordinateComputedMeta,
} from './types';

export type Value<T> = T[keyof T];

export const getRandomColor = () => {
    const available = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += available[Math.floor(Math.random() * 16)];
    }
    return color;
};

export const getColor = (currentColors: string[]): string => {
    const color = getRandomColor();

    if (currentColors.includes(color)) {
        return getColor(currentColors);
    }

    return color;
};

export const formatChartCell = (data: ReactNode): string | number => {
    if (typeof data === 'number') {
        return data;
    }
    if (typeof data === 'string') {
        return convertNumber(data) ?? convertDate(data) ?? data;
    }
    return String(data);
};

export const getLineComputedData = (props: LineComputedDataProps): LineComputedDataList => {
    const { titleData, categoryData, itemsData } = props;
    const computedData: LineComputedDataList = [];

    for (const columnIndex in itemsData[0]) {
        computedData.push({
            category: categoryData[columnIndex] || '',
            lines: itemsData.reduce((computed, row, rowIndex) => {
                computed[titleData[rowIndex] || rowIndex] = row[columnIndex] ?? '';

                return computed;
            }, {} as LineComputedData['lines']),
        });
    }

    return computedData;
};

export const getLineComputedDataLineMeta = <T extends LineComputedMeta>(
    data: LineComputedDataList,
    meta?: T,
    hasDefaultcolor: { stroke?: boolean; fill?: boolean } = {},
): (BaseElementMeta & { name: string | number; order?: number })[] => {
    const computedColors: string[] = [];

    return Object.keys(data?.[0]?.lines).map((key, index) => {
        const defaultColor = getColor(computedColors);
        return {
            name: key,
            stroke: meta?.items?.[index]?.stroke || (hasDefaultcolor?.stroke && defaultColor) || undefined,
            strokeWidth: meta?.items?.[index]?.strokeWidth || undefined,
            fill: meta?.items?.[index]?.fill || (hasDefaultcolor?.fill && defaultColor) || undefined,
            order: meta?.items?.[index]?.order || undefined,
        };
    });
};

export const sortComputedDataMeta = <T extends { order?: number }>(element1: T, element2: T) => {
    const orderElement1 = element1?.order;
    const orderElement2 = element2?.order;

    if (orderElement1 && orderElement2 === undefined) {
        return 1;
    }
    if (orderElement1 === undefined && orderElement2) {
        return -1;
    }
    if (orderElement1 && orderElement2) {
        return orderElement2 - orderElement1;
    }
    return 0;
};

export const getСoordinateComputedData = (props: ScatterComputedDataProps): СoordinateComputedDataList => {
    const { titleCell, xData, yData, zData } = props;

    return [
        {
            title: titleCell,
            coordinate: xData.map((value, index) => ({
                x: formatChartCell(value),
                y: formatChartCell(yData[index] ?? ''),
                z: zData?.length ? formatChartCell(zData[index]) : DEFAULT_Z_AXIS_RANGE[1],
            })),
        },
    ];
};

export const getСoordinateComputedDataLineMeta = <T extends СoordinateComputedMeta>(
    data: СoordinateComputedDataList,
    meta?: T,
    hasDefaultcolor: { stroke?: boolean; fill?: boolean } = {},
): (BaseElementMeta & { name: string | number })[] => {
    const coputedColors: string[] = [];

    return data.map((group, index) => {
        const defaultColor = getColor(coputedColors);
        return {
            name: group.title as string | number,
            stroke: meta?.items?.[index]?.stroke || (hasDefaultcolor?.stroke && defaultColor) || undefined,
            strokeWidth: meta?.items?.[index]?.strokeWidth || undefined,
            fill: meta?.items?.[index]?.fill || (hasDefaultcolor?.fill && defaultColor) || undefined,
        };
    });
};

export const getPieComputedData = ({ titleCell, titleData, valuesData }: PieComputedDataProps): PieComputedDataList => [
    {
        title: titleCell,
        values: valuesData?.map((value, index) => ({
            title: titleData?.[index] ?? '',
            value: formatChartCell(value),
        })),
    },
];

export const getPieComputedDataLineMeta = <T extends PieComputedMeta>(
    data: PieComputedDataList,
    meta?: T,
    hasDefaultcolor: { stroke?: boolean; fill?: boolean } = {},
): Array<{
    innerRadius?: `${number}%`;
    outerRadius?: `${number}%`;
    items?: Array<BaseElementMeta>;
    name: string | number;
}> => {
    const coputedColors: string[] = [];

    return data.map((group, index) => ({
        name: group.title as string | number,
        items: group.values.map((_, indexValue) => {
            const defaultColor = getColor(coputedColors);

            return {
                stroke:
                    meta?.groups?.[index]?.items?.[indexValue]?.stroke ||
                    (hasDefaultcolor?.stroke && defaultColor) ||
                    undefined,
                strokeWidth: meta?.groups?.[index]?.items?.[indexValue]?.strokeWidth || undefined,
                fill: meta?.groups?.[index]?.items?.[indexValue]?.fill || (hasDefaultcolor?.fill && defaultColor) || undefined,
            };
        }),
        innerRadius: meta?.groups?.[index]?.innerRadius || undefined,
        outerRadius: meta?.groups?.[index]?.outerRadius || undefined,
    }));
};

export const isLineComputedDataList = (computedData: ChartValues): computedData is LineComputedDataList => {
    const keys = Object.keys(computedData?.[0] || {}) || [];

    return Array.isArray(computedData) && keys.includes('category') && keys.includes('lines');
};

export const isСoordinateComputedDataList = (computedData: ChartValues): computedData is СoordinateComputedDataList => {
    const keys = Object.keys(computedData?.[0] || {}) || [];

    return Array.isArray(computedData) && keys.includes('title') && keys.includes('coordinate');
};

export const isPieComputedDataList = (computedData: ChartValues): computedData is PieComputedDataList => {
    const keys = Object.keys(computedData?.[0] || {}) || [];

    return Array.isArray(computedData) && keys.includes('title') && keys.includes('values');
};

export const isAreaChartGenerationProps = (
    props: ChartGenerationProps<ChartTypes>,
): props is ChartGenerationProps<Extract<ChartTypes, 'area'>> => props.type === CHART_TYPE.AREA;

export const isBarChartGenerationProps = (
    props: ChartGenerationProps<ChartTypes>,
): props is ChartGenerationProps<Extract<ChartTypes, 'bar'>> => props.type === CHART_TYPE.BAR;

export const isLineChartGenerationProps = (
    props: ChartGenerationProps<ChartTypes>,
): props is ChartGenerationProps<Extract<ChartTypes, 'line'>> => props.type === CHART_TYPE.LINE;

export const isScatterChartGenerationProps = (
    props: ChartGenerationProps<ChartTypes>,
): props is ChartGenerationProps<Extract<ChartTypes, 'scatter'>> => props.type === CHART_TYPE.SCATTER;

export const isPieChartGenerationProps = (
    props: ChartGenerationProps<ChartTypes>,
): props is ChartGenerationProps<Extract<ChartTypes, 'pie'>> => props.type === CHART_TYPE.PIE;
