import {
    BaseChartGenerationProps,
    ChartLayout,
    ChartTypes,
    LineComputedDataList,
    LineComputedMeta,
    MetaGrid,
    MetaLegend,
    MetaTooltip,
    MetaXAxis,
    MetaYAxis,
} from '../../types';

export type BarMeta = LineComputedMeta & {
    layout?: ChartLayout;
    legend?: boolean | MetaLegend;
    tooltip?: boolean | MetaTooltip;
    grid?: boolean | MetaGrid;
    xAxis?: MetaXAxis;
    yAxis?: MetaYAxis;
};

export type BarChartGeneration = BaseChartGenerationProps<Extract<ChartTypes, 'bar'>, BarMeta>;

export type BarProps = {
    data: LineComputedDataList;
    meta?: BarChartGeneration['meta'];
};
