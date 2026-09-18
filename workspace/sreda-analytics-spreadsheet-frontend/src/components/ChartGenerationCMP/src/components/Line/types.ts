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

export type LineMeta = LineComputedMeta & {
    layout?: ChartLayout;
    legend?: boolean | MetaLegend;
    tooltip?: boolean | MetaTooltip;
    grid?: boolean | MetaGrid;
    xAxis?: MetaXAxis;
    yAxis?: MetaYAxis;
};

export type LineChartGeneration = BaseChartGenerationProps<Extract<ChartTypes, 'line'>, LineMeta>;

export type LineProps = {
    data: LineComputedDataList;
    meta?: LineChartGeneration['meta'];
};
