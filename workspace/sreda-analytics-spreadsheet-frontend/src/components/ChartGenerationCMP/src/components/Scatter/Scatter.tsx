import { FC, useMemo } from 'react';
import {
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Scatter as ScatterElement,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis,
} from 'recharts';

import { getСoordinateComputedDataLineMeta } from '../../utils';
import { DEFAULT_Z_AXIS_RANGE } from './constants';
import { ScatterProps } from './types';

export const Scatter: FC<ScatterProps> = (props) => {
    const { data, meta } = props;

    const width = meta?.width;
    const height = meta?.height;
    const minWidth = meta?.minWidth;
    const minHeight = meta?.minHeight;
    const legend = meta?.legend;
    const tooltip = meta?.tooltip;
    const grid = meta?.grid;
    const xAxis = meta?.xAxis;
    const yAxis = meta?.yAxis;
    const zAxis = meta?.zAxis;
    const line = meta?.line;
    const shape = meta?.shape;

    const hasLegend = !!legend;
    const hasLegendConfig = hasLegend && typeof legend === 'object';
    const hasTooltip = !!tooltip;
    const hasTooltipConfig = hasTooltip && typeof tooltip === 'object';
    const hasGrid = !!grid;
    const hasGridConfig = hasGrid && typeof grid === 'object';
    const hasXAxisConfig = !!xAxis;
    const hasYAxisConfig = !!yAxis;
    const hasZAxisConfig = !!zAxis;

    const legendLayout = hasLegendConfig ? legend.layout : undefined;
    const legendAlign = hasLegendConfig ? legend.align : undefined;
    const legendVerticalAlign = hasLegendConfig ? legend.verticalAlign : undefined;
    const legendIconSize = hasLegendConfig ? legend.iconSize : undefined;
    const legendIconType = hasLegendConfig ? legend.iconType : undefined;

    const tooltipSeparator = hasTooltipConfig ? tooltip.separator : undefined;

    const gridHorizontal = hasGridConfig ? grid.horizontal : undefined;
    const gridVertical = hasGridConfig ? grid.vertical : undefined;
    const gridFill = hasGridConfig ? grid.fill : undefined;
    const gridFillOpacity = hasGridConfig ? grid.fillOpacity : undefined;
    const gridStrokeDasharray = hasGridConfig ? grid.strokeDasharray : undefined;
    const gridStroke = hasGridConfig ? grid.stroke : undefined;
    const gridStrokeWidth = hasGridConfig ? grid.strokeWidth : undefined;

    const xAxisHide = hasXAxisConfig ? xAxis.hide : undefined;
    const xAxisOrientation = hasXAxisConfig ? xAxis.orientation : undefined;
    const xAxisStroke = hasXAxisConfig ? xAxis.stroke : undefined;
    const xAxisStrokeDasharray = hasXAxisConfig ? xAxis.strokeDasharray : undefined;
    const xAxisStrokeWidth = hasXAxisConfig ? xAxis.strokeWidth : undefined;

    const yAxisHide = hasYAxisConfig ? yAxis.hide : undefined;
    const yAxisOrientation = hasYAxisConfig ? yAxis.orientation : undefined;
    const yAxisStroke = hasYAxisConfig ? yAxis.stroke : undefined;
    const yAxisStrokeDasharray = hasYAxisConfig ? yAxis.strokeDasharray : undefined;
    const yAxisStrokeWidth = hasYAxisConfig ? yAxis.strokeWidth : undefined;

    const zAxisRange = (typeof zAxis === 'object' && zAxis?.range) || DEFAULT_Z_AXIS_RANGE;

    const computedGroupsMeta = useMemo(() => getСoordinateComputedDataLineMeta(data, meta, { fill: true }), [data, meta]);

    return (
        <ResponsiveContainer width={width} height={height} minWidth={minWidth} minHeight={minHeight}>
            <ScatterChart>
                <XAxis
                    dataKey="x"
                    type="number"
                    hide={xAxisHide}
                    orientation={xAxisOrientation}
                    stroke={xAxisStroke}
                    strokeDasharray={xAxisStrokeDasharray}
                    strokeWidth={xAxisStrokeWidth}
                />
                <YAxis
                    dataKey="y"
                    type="number"
                    hide={yAxisHide}
                    orientation={yAxisOrientation}
                    stroke={yAxisStroke}
                    strokeDasharray={yAxisStrokeDasharray}
                    strokeWidth={yAxisStrokeWidth}
                />
                {hasZAxisConfig && <ZAxis dataKey="z" range={zAxisRange} type="number" />}
                {hasGrid && (
                    <CartesianGrid
                        horizontal={gridHorizontal}
                        vertical={gridVertical}
                        fill={gridFill}
                        fillOpacity={gridFillOpacity}
                        strokeDasharray={gridStrokeDasharray}
                        stroke={gridStroke}
                        strokeWidth={gridStrokeWidth}
                    />
                )}
                {hasTooltip && <Tooltip separator={tooltipSeparator} />}
                {hasLegend && (
                    <Legend
                        layout={legendLayout}
                        align={legendAlign}
                        verticalAlign={legendVerticalAlign}
                        iconSize={legendIconSize}
                        iconType={legendIconType}
                    />
                )}
                {data?.map((group, index) => (
                    <ScatterElement
                        key={group.title}
                        name={String(group.title)}
                        data={group.coordinate}
                        stroke={computedGroupsMeta[index].stroke}
                        strokeWidth={computedGroupsMeta[index].strokeWidth}
                        fill={computedGroupsMeta[index].fill}
                        line={line}
                        shape={shape}
                    />
                ))}
            </ScatterChart>
        </ResponsiveContainer>
    );
};
