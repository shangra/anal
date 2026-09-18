import { FC, useMemo } from 'react';
import { Area as AreaElement, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { CHART_LAYOUT } from '../../constants';
import { getLineComputedDataLineMeta, sortComputedDataMeta } from '../../utils';
import { AreaProps } from './types';

export const Area: FC<AreaProps> = (props) => {
    const { data, meta } = props;

    const width = meta?.width;
    const height = meta?.height;
    const minWidth = meta?.minWidth;
    const minHeight = meta?.minHeight;
    const layout = meta?.layout || CHART_LAYOUT.HORIZONTAL;
    const legend = meta?.legend;
    const tooltip = meta?.tooltip;
    const grid = meta?.grid;
    const xAxis = meta?.xAxis;
    const yAxis = meta?.yAxis;

    const isLayoutHorizontal = layout === CHART_LAYOUT.HORIZONTAL;
    const isLayoutVertical = layout === CHART_LAYOUT.VERTICAL;
    const hasLegend = !!legend;
    const hasLegendConfig = hasLegend && typeof legend === 'object';
    const hasTooltip = !!tooltip;
    const hasTooltipConfig = hasTooltip && typeof tooltip === 'object';
    const hasGrid = !!grid;
    const hasGridConfig = hasGrid && typeof grid === 'object';
    const hasXAxisConfig = !!xAxis;
    const hasYAxisConfig = !!yAxis;

    const xAxisDataKey = isLayoutHorizontal ? 'category' : undefined;
    const yAxisDataKey = isLayoutVertical ? 'category' : undefined;
    const xAxisType = isLayoutHorizontal ? 'category' : 'number';
    const yAxisType = isLayoutVertical ? 'category' : 'number';

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

    const computedLineMeta = useMemo(
        () => getLineComputedDataLineMeta(data, meta, { stroke: true, fill: true }),
        [data, meta],
    );

    return (
        <ResponsiveContainer width={width} height={height} minWidth={minWidth} minHeight={minHeight}>
            <AreaChart data={data} layout={layout}>
                <XAxis
                    dataKey={xAxisDataKey}
                    type={xAxisType}
                    hide={xAxisHide}
                    orientation={xAxisOrientation}
                    stroke={xAxisStroke}
                    strokeDasharray={xAxisStrokeDasharray}
                    strokeWidth={xAxisStrokeWidth}
                />
                <YAxis
                    dataKey={yAxisDataKey}
                    type={yAxisType}
                    hide={yAxisHide}
                    orientation={yAxisOrientation}
                    stroke={yAxisStroke}
                    strokeDasharray={yAxisStrokeDasharray}
                    strokeWidth={yAxisStrokeWidth}
                />
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
                {hasTooltip && (
                    <Tooltip
                        formatter={(value, name: string) => [value, name.split('.')[1] || name]}
                        separator={tooltipSeparator}
                    />
                )}
                {hasLegend && (
                    <Legend
                        formatter={(value: string) => value.split('.')[1] || value}
                        layout={legendLayout}
                        align={legendAlign}
                        verticalAlign={legendVerticalAlign}
                        iconSize={legendIconSize}
                        iconType={legendIconType}
                    />
                )}
                {computedLineMeta.sort(sortComputedDataMeta).map((lineMeta) => (
                    <AreaElement
                        key={lineMeta.name}
                        dataKey={`lines.${lineMeta.name}`}
                        stroke={lineMeta?.stroke}
                        strokeWidth={lineMeta?.strokeWidth}
                        fill={lineMeta?.fill}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
};
