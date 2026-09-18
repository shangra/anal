import { SymbolType } from 'recharts/types/util/types';

import {
    BaseChartGenerationProps,
    ChartTypes,
    MetaGrid,
    MetaLegend,
    MetaTooltip,
    MetaXAxis,
    MetaYAxis,
    MetaZAxis,
    СoordinateComputedDataList,
    СoordinateComputedMeta,
} from '../../types';

export type ScatterMeta = СoordinateComputedMeta & {
    legend?: boolean | MetaLegend;
    tooltip?: boolean | MetaTooltip;
    grid?: boolean | MetaGrid;
    xAxis?: MetaXAxis;
    yAxis?: MetaYAxis;
    zAxis?: boolean | MetaZAxis;
    line?: boolean;
    shape?: SymbolType;
};

export type ScatterChartGeneration = BaseChartGenerationProps<Extract<ChartTypes, 'line'>, ScatterMeta>;

export type ScatterProps = {
    data: СoordinateComputedDataList;
    meta?: ScatterChartGeneration['meta'];
};
