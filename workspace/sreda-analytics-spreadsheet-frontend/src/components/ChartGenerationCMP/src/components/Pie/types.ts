import {
    BaseChartGenerationProps,
    ChartTypes,
    MetaLegend,
    MetaTooltip,
    PieComputedDataList,
    PieComputedMeta,
} from '../../types';

export type PieMeta = PieComputedMeta & {
    legend?: boolean | MetaLegend;
    tooltip?: boolean | MetaTooltip;
};

export type PieChartGeneration = BaseChartGenerationProps<Extract<ChartTypes, 'pie'>, PieMeta>;

export type PieProps = {
    data: PieComputedDataList;
    meta?: PieChartGeneration['meta'];
};
