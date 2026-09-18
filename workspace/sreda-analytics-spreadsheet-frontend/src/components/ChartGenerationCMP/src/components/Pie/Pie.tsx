import { FC, useMemo } from 'react';
import { Cell, Legend, Pie as PieElement, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { getPieComputedDataLineMeta } from '../../utils';
import { PieProps } from './types';

export const Pie: FC<PieProps> = (props) => {
    const { data, meta } = props;

    const width = meta?.width;
    const height = meta?.height;
    const minWidth = meta?.minWidth;
    const minHeight = meta?.minHeight;
    const legend = meta?.legend;
    const tooltip = meta?.tooltip;

    const hasLegend = !!legend;
    const hasLegendConfig = hasLegend && typeof legend === 'object';
    const hasTooltip = !!tooltip;
    const hasTooltipConfig = hasTooltip && typeof tooltip === 'object';

    const legendLayout = hasLegendConfig ? legend.layout : undefined;
    const legendAlign = hasLegendConfig ? legend.align : undefined;
    const legendVerticalAlign = hasLegendConfig ? legend.verticalAlign : undefined;
    const legendIconSize = hasLegendConfig ? legend.iconSize : undefined;
    const legendIconType = hasLegendConfig ? legend.iconType : undefined;

    const tooltipSeparator = hasTooltipConfig ? tooltip.separator : undefined;

    const computedGroupsMeta = useMemo(() => getPieComputedDataLineMeta(data, meta, { fill: true }), [data, meta]);

    return (
        <ResponsiveContainer width={width} height={height} minWidth={minWidth} minHeight={minHeight}>
            <PieChart>
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
                    <PieElement
                        key={group.title}
                        data={group.values}
                        nameKey="title"
                        dataKey="value"
                        innerRadius={computedGroupsMeta[index]?.innerRadius}
                        outerRadius={computedGroupsMeta[index]?.outerRadius}
                    >
                        {group.values.map((_, indexCell) => (
                            <Cell
                                key={`cell-${indexCell}`}
                                strokeWidth={computedGroupsMeta[index]?.items?.[indexCell]?.strokeWidth}
                                stroke={computedGroupsMeta[index]?.items?.[indexCell]?.stroke || '#FFF'}
                                fill={computedGroupsMeta[index]?.items?.[indexCell]?.fill}
                                style={{
                                    outline: 'none',
                                }}
                            />
                        ))}
                    </PieElement>
                ))}
            </PieChart>
        </ResponsiveContainer>
    );
};
