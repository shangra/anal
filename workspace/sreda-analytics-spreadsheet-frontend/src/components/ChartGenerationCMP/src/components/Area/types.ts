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

export type AreaMeta = LineComputedMeta & {
    layout?: ChartLayout;
    legend?: boolean | MetaLegend;
    tooltip?: boolean | MetaTooltip;
    grid?: boolean | MetaGrid;
    xAxis?: MetaXAxis;
    yAxis?: MetaYAxis;
};

export type AreaChartGeneration = BaseChartGenerationProps<Extract<ChartTypes, 'area'>, AreaMeta>;

export type AreaProps = {
    data: LineComputedDataList;
    meta?: AreaChartGeneration['meta'];
};
