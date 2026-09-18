import { Area } from './components/Area';
import { AreaChartGeneration } from './components/Area/types';
import { Bar } from './components/Bar';
import { BarChartGeneration } from './components/Bar/types';
import { Line } from './components/Line';
import { LineChartGeneration } from './components/Line/types';
import { Pie } from './components/Pie';
import { PieChartGeneration } from './components/Pie/types';
import { Scatter } from './components/Scatter';
import { ScatterChartGeneration } from './components/Scatter/types';
import { ChartGenerationProps, ChartTypes } from './types';
import {
    isAreaChartGenerationProps,
    isBarChartGenerationProps,
    isLineChartGenerationProps,
    isLineComputedDataList,
    isPieChartGenerationProps,
    isPieComputedDataList,
    isScatterChartGenerationProps,
    isСoordinateComputedDataList,
} from './utils';

export const ChartGeneration = <T extends ChartTypes>(props: ChartGenerationProps<T>) => {
    const { meta, chartValues } = props;

    return (
        <>
            {isAreaChartGenerationProps(props) && isLineComputedDataList(chartValues) && (
                <Area data={chartValues} meta={meta as AreaChartGeneration['meta']} />
            )}
            {isBarChartGenerationProps(props) && isLineComputedDataList(chartValues) && (
                <Bar data={chartValues} meta={meta as BarChartGeneration['meta']} />
            )}
            {isLineChartGenerationProps(props) && isLineComputedDataList(chartValues) && (
                <Line data={chartValues} meta={meta as LineChartGeneration['meta']} />
            )}
            {isPieChartGenerationProps(props) && isPieComputedDataList(chartValues) && (
                <Pie data={chartValues} meta={meta as PieChartGeneration['meta']} />
            )}
            {isScatterChartGenerationProps(props) && isСoordinateComputedDataList(chartValues) && (
                <Scatter data={chartValues} meta={meta as ScatterChartGeneration['meta']} />
            )}
        </>
    );
};
