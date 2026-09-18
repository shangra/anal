import Joi from 'joi';

import { YX_RANGE_REGEX, YX_REGEX } from '../../../../AdapterSpreadSheet/constants';
import { CHART_TYPE } from '../../../../ChartGenerationCMP/src';
import { AreaChartGeneration } from '../../../../ChartGenerationCMP/src/components/Area/types';
import { CHART_LAYOUT } from '../../../../ChartGenerationCMP/src/constants';
import { CreateChartFormState } from './types';

export const CHART_TYPE_OPTIONS = [
    { value: CHART_TYPE.AREA, label: 'График с областями' },
    { value: CHART_TYPE.BAR, label: 'Гистограмма' },
    { value: CHART_TYPE.LINE, label: 'График' },
    { value: CHART_TYPE.PIE, label: 'Круговая' },
    { value: CHART_TYPE.SCATTER, label: 'Точечная' },
];

export const CHART_LAYOUT_OPTIONS = [
    { value: CHART_LAYOUT.HORIZONTAL, label: 'Горизонтально' },
    { value: CHART_LAYOUT.VERTICAL, label: 'Вертикально' },
];

export const INITIAL_FORM_DATA: CreateChartFormState = {
    type: CHART_TYPE.AREA,
    meta: {} as AreaChartGeneration['meta'],
};

export const VALIDATION_FORM = Joi.object({
    type: Joi.string()
        .valid(...Object.values(CHART_TYPE))
        .required(),
    meta: Joi.any()
        .when('type', {
            is: Joi.string().valid(CHART_TYPE.AREA, CHART_TYPE.LINE, CHART_TYPE.BAR),
            then: Joi.object({
                width: Joi.number().optional(),
                height: Joi.number().optional(),
                layout: Joi.string()
                    .valid(...Object.values(CHART_LAYOUT))
                    .optional(),
                legend: Joi.alternatives()
                    .try(
                        Joi.boolean(),
                        Joi.object({
                            layout: Joi.string()
                                .valid(...Object.values(CHART_LAYOUT))
                                .optional(),
                            align: Joi.string().valid('left', 'right', 'center').optional(),
                            verticalAlign: Joi.string().valid('top', 'bottom', 'middle').optional(),
                            iconSize: Joi.number().optional(),
                            iconType: Joi.string()
                                .valid(
                                    'line',
                                    'plainline',
                                    'square',
                                    'rect',
                                    'circle',
                                    'cross',
                                    'diamond',
                                    'star',
                                    'triangle',
                                    'wye',
                                )
                                .optional(),
                        }),
                    )
                    .optional(),
                tooltip: Joi.alternatives()
                    .try(
                        Joi.boolean(),
                        Joi.object({
                            separator: Joi.string().optional(),
                        }),
                    )
                    .optional(),
                grid: Joi.alternatives()
                    .try(
                        Joi.boolean(),
                        Joi.object({
                            horizontal: Joi.boolean().optional(),
                            vertical: Joi.boolean().optional(),
                            fill: Joi.string().optional(),
                            fillOpacity: Joi.number().optional(),
                            stroke: Joi.string().optional(),
                            strokeDasharray: Joi.string().optional(),
                            strokeWidth: Joi.number().optional(),
                        }),
                    )
                    .optional(),
                xAxis: Joi.object({
                    hide: Joi.boolean().optional(),
                    orientation: Joi.string().valid('top', 'bottom').optional(),
                    stroke: Joi.string().optional(),
                    strokeDasharray: Joi.string().optional(),
                    strokeWidth: Joi.number().optional(),
                }).optional(),
                yAxis: Joi.object({
                    hide: Joi.boolean().optional(),
                    orientation: Joi.string().valid('left', 'right').optional(),
                    stroke: Joi.string().optional(),
                    strokeDasharray: Joi.string().optional(),
                    strokeWidth: Joi.number().optional(),
                }).optional(),
                itemsRange: Joi.object({
                    cells: Joi.string().regex(YX_RANGE_REGEX).optional(),
                    cellStart: Joi.string().regex(YX_REGEX).optional(),
                    cellEnd: Joi.string().regex(YX_REGEX).optional(),
                    orientation: Joi.string().valid('horizontal', 'vertical').optional(),
                }).optional(),
                titleRange: Joi.object({
                    cells: Joi.string().regex(YX_RANGE_REGEX).optional(),
                    cellStart: Joi.string().regex(YX_REGEX).optional(),
                    cellEnd: Joi.string().regex(YX_REGEX).optional(),
                    orientation: Joi.string().valid('horizontal', 'vertical').optional(),
                }).optional(),
                categoryRange: Joi.object({
                    cells: Joi.string().regex(YX_RANGE_REGEX).optional(),
                    cellStart: Joi.string().regex(YX_REGEX).optional(),
                    cellEnd: Joi.string().regex(YX_REGEX).optional(),
                    orientation: Joi.string().valid('horizontal', 'vertical').optional(),
                }).optional(),
                items: Joi.array().items(
                    Joi.object({
                        stroke: Joi.string().optional(),
                        strokeWidth: Joi.string().optional(),
                        fill: Joi.string().optional(),
                        order: Joi.string().optional(),
                    }),
                ),
                groups: Joi.array().max(0).optional(),
                groupRanges: Joi.array().max(0).optional(),
            }),
            otherwise: Joi.any(),
        })
        .when('type', {
            is: Joi.string().valid(CHART_TYPE.PIE),
            then: Joi.object({
                width: Joi.number().optional(),
                height: Joi.number().optional(),
                legend: Joi.alternatives()
                    .try(
                        Joi.boolean(),
                        Joi.object({
                            layout: Joi.string()
                                .valid(...Object.values(CHART_LAYOUT))
                                .optional(),
                            align: Joi.string().valid('left', 'right', 'center').optional(),
                            verticalAlign: Joi.string().valid('top', 'bottom', 'middle').optional(),
                            iconSize: Joi.number().optional(),
                            iconType: Joi.string()
                                .valid(
                                    'line',
                                    'plainline',
                                    'square',
                                    'rect',
                                    'circle',
                                    'cross',
                                    'diamond',
                                    'star',
                                    'triangle',
                                    'wye',
                                )
                                .optional(),
                        }),
                    )
                    .optional(),
                tooltip: Joi.alternatives()
                    .try(
                        Joi.boolean(),
                        Joi.object({
                            separator: Joi.string().optional(),
                        }),
                    )
                    .optional(),
                groupRanges: Joi.array()
                    .items(
                        Joi.object({
                            titleGroup: Joi.string().regex(YX_REGEX).optional(),
                            valueRange: Joi.object({
                                cells: Joi.string().regex(YX_RANGE_REGEX).optional(),
                                cellStart: Joi.string().regex(YX_REGEX).optional(),
                                cellEnd: Joi.string().regex(YX_REGEX).optional(),
                                orientation: Joi.string().valid('horizontal', 'vertical').optional(),
                            }).optional(),
                            titleRange: Joi.object({
                                cells: Joi.string().regex(YX_RANGE_REGEX).optional(),
                                cellStart: Joi.string().regex(YX_REGEX).optional(),
                                cellEnd: Joi.string().regex(YX_REGEX).optional(),
                                orientation: Joi.string().valid('horizontal', 'vertical').optional(),
                            }).optional(),
                        }),
                    )
                    .optional(),
                groups: Joi.array()
                    .items(
                        Joi.object({
                            innerRadius: Joi.string()
                                .regex(/[0-9]+%/)
                                .optional(),
                            outerRadius: Joi.string()
                                .regex(/[0-9]+%/)
                                .optional(),
                            items: Joi.array().items(
                                Joi.object({
                                    stroke: Joi.string().optional(),
                                    strokeWidth: Joi.string().optional(),
                                    fill: Joi.string().optional(),
                                }),
                            ),
                        }),
                    )
                    .optional(),
            }),
            otherwise: Joi.any(),
        })
        .when('type', {
            is: Joi.string().valid(CHART_TYPE.SCATTER),
            then: Joi.object({
                width: Joi.number().optional(),
                height: Joi.number().optional(),
                legend: Joi.alternatives()
                    .try(
                        Joi.boolean(),
                        Joi.object({
                            layout: Joi.string()
                                .valid(...Object.values(CHART_LAYOUT))
                                .optional(),
                            align: Joi.string().valid('left', 'right', 'center').optional(),
                            verticalAlign: Joi.string().valid('top', 'bottom', 'middle').optional(),
                            iconSize: Joi.number().optional(),
                            iconType: Joi.string()
                                .valid(
                                    'line',
                                    'plainline',
                                    'square',
                                    'rect',
                                    'circle',
                                    'cross',
                                    'diamond',
                                    'star',
                                    'triangle',
                                    'wye',
                                )
                                .optional(),
                        }),
                    )
                    .optional(),
                tooltip: Joi.alternatives()
                    .try(
                        Joi.boolean(),
                        Joi.object({
                            separator: Joi.string().optional(),
                        }),
                    )
                    .optional(),
                grid: Joi.alternatives()
                    .try(
                        Joi.boolean(),
                        Joi.object({
                            horizontal: Joi.boolean().optional(),
                            vertical: Joi.boolean().optional(),
                            fill: Joi.string().optional(),
                            fillOpacity: Joi.number().optional(),
                            stroke: Joi.string().optional(),
                            strokeDasharray: Joi.string().optional(),
                            strokeWidth: Joi.number().optional(),
                        }),
                    )
                    .optional(),
                xAxis: Joi.object({
                    hide: Joi.boolean().optional(),
                    orientation: Joi.string().valid('top', 'bottom').optional(),
                    stroke: Joi.string().optional(),
                    strokeDasharray: Joi.string().optional(),
                    strokeWidth: Joi.number().optional(),
                }).optional(),
                yAxis: Joi.object({
                    hide: Joi.boolean().optional(),
                    orientation: Joi.string().valid('left', 'right').optional(),
                    stroke: Joi.string().optional(),
                    strokeDasharray: Joi.string().optional(),
                    strokeWidth: Joi.number().optional(),
                }).optional(),
                zAxis: Joi.alternatives()
                    .try(
                        Joi.boolean(),
                        Joi.object({
                            range: Joi.array().items(Joi.number()).min(2).max(2).optional(),
                        }).optional(),
                    )
                    .optional(),
                line: Joi.boolean().optional(),
                shape: Joi.string().valid('square', 'circle', 'cross', 'diamond', 'star', 'triangle', 'wye').optional(),
                groups: Joi.array()
                    .items(
                        Joi.object({
                            title: Joi.string().regex(YX_REGEX).optional(),
                            xAxisRange: Joi.object({
                                cells: Joi.string().regex(YX_RANGE_REGEX).optional(),
                                cellStart: Joi.string().regex(YX_REGEX).optional(),
                                cellEnd: Joi.string().regex(YX_REGEX).optional(),
                                orientation: Joi.string().valid('horizontal', 'vertical').optional(),
                            }).optional(),
                            yAxisRange: Joi.object({
                                cells: Joi.string().regex(YX_RANGE_REGEX).optional(),
                                cellStart: Joi.string().regex(YX_REGEX).optional(),
                                cellEnd: Joi.string().regex(YX_REGEX).optional(),
                                orientation: Joi.string().valid('horizontal', 'vertical').optional(),
                            }).optional(),
                            zAxisRange: Joi.object({
                                cells: Joi.string().regex(YX_RANGE_REGEX).optional(),
                                cellStart: Joi.string().regex(YX_REGEX).optional(),
                                cellEnd: Joi.string().regex(YX_REGEX).optional(),
                                orientation: Joi.string().valid('horizontal', 'vertical').optional(),
                            }).optional(),
                        }),
                    )
                    .optional(),
                items: Joi.array().items(
                    Joi.object({
                        stroke: Joi.string().optional(),
                        strokeWidth: Joi.string().optional(),
                        fill: Joi.string().optional(),
                    }),
                ),
                groupRanges: Joi.array().max(0).optional(),
            }),
            otherwise: Joi.any(),
        }),
});
