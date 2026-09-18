import { CellDataType, IButton, ICellStyles, ICellWithStyles } from '../../../../../AdapterSpreadSheet/types';
import { PLUGIN_CELL_FORMATTING_KEY } from '../../../../PluginCellFormatting';
import { CellFormattingType } from '../../../../PluginCellFormatting/types';
import { PIVOT_PLUGIN_KEY } from '../../../constants';
import { LoaderIcon, MinusIcon, PlusIcon } from '../icons';
import {
    IAggregate,
    ICellFactory,
    IColumnGroupItem,
    ILayer,
    IMeasure,
    IPivotCellMetadata,
    IRowGroupItem,
    IViewValueResolver,
    OnDrillDownCallback,
} from '../types';

export default class CellFactory implements ICellFactory {
    private drillDownCallback?: OnDrillDownCallback;

    constructor(private viewResolver: IViewValueResolver) {}

    setDrillDownCallback(callback: OnDrillDownCallback): void {
        this.drillDownCallback = callback;
    }

    buildCell(
        data: CellDataType,
        styles: ICellStyles,
        metadata?: IPivotCellMetadata,
        components: IButton[] = [],
        readonly: boolean = true,
    ): ICellWithStyles {
        return {
            data,
            config: {
                readonly,
            },
            pluginsConfig: {
                [PIVOT_PLUGIN_KEY]: metadata,
            },
            components,
            styles: {
                ...styles,
                hyphenation: 'transfer',
            },
        };
    }

    buildEmptyCell(): ICellWithStyles {
        return this.buildCell('', {}, { type: 'empty', isEmpty: true }, []);
    }

    buildEmptyHeaderCell(): ICellWithStyles {
        const styles: ICellStyles = {
            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
            horizontalAlign: 'start',
        };

        return this.buildCell('', styles, { type: 'empty', isEmpty: true }, []);
    }

    buildCornerCell(rowDimensionLabels: string[]): ICellWithStyles {
        const styles: ICellStyles = {
            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
            horizontalAlign: 'start',
        };

        const originalData = rowDimensionLabels.join(' / ');

        return this.buildCell(originalData, styles, { type: 'corner', corner: { rowDimensionLabels } }, []);
    }

    buildLayerHeaderCell(layer: ILayer): ICellWithStyles {
        const styles: ICellStyles = {
            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
            horizontalAlign: 'start',
        };

        return this.buildCell(
            layer.label,
            styles,
            {
                type: 'layer_header',
                layerHeader: {
                    layerName: layer.name,
                    layerLabel: layer.label,
                },
            },
            [],
        );
    }

    buildMeasureHeaderCell(measure: IMeasure): ICellWithStyles {
        const styles: ICellStyles = {
            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
            horizontalAlign: 'start',
        };

        return this.buildCell(
            measure.label,
            styles,
            {
                type: 'measure_header',
                measureHeader: {
                    measureName: measure.name,
                    measureLabel: measure.label,
                },
            },
            [],
        );
    }

    buildAggregateHeaderCell(aggregate: IAggregate): ICellWithStyles {
        const styles: ICellStyles = {
            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
            horizontalAlign: 'start',
        };

        return this.buildCell(
            aggregate.label,
            styles,
            {
                type: 'aggregate',
                aggregate: {
                    aggregateFunction: aggregate.sqlName || aggregate.name,
                    aggregateLabel: aggregate.label,
                },
            },
            [],
        );
    }

    buildGrandTotalHeaderCell(): ICellWithStyles {
        const styles: ICellStyles = {
            backgroundColor: 'var(--ui-kit-colors-background-highlighted)',
            horizontalAlign: 'start',
        };

        return this.buildCell('Общий итог', styles, { type: 'grand_total', isGrandTotal: true }, []);
    }

    buildMeasureCell(
        value: any,
        measureName: string,
        measureLabel: string,
        layerName: string,
        layerLabel: string,
        aggregateFunction: string,
        aggregateLabel: string,
        rowGroup: IRowGroupItem,
        colGroup: IColumnGroupItem,
        isGrandTotal: boolean,
        format?: CellFormattingType,
    ): ICellWithStyles {
        const metadata: IPivotCellMetadata = {
            type: 'measure',
            measure: {
                measureName,
                measureLabel,
                layerName,
                layerLabel,
                aggregateFunction,
                aggregateLabel,
                fullKey: `${measureName}:->:${layerName}:->:${aggregateFunction}`,
                rowDimensions: Object.fromEntries(rowGroup.values),
                columnDimensions: Object.fromEntries(colGroup.values),
                isSubtotal: rowGroup.isSubtotal,
                isGrandTotal,
            },
        };

        const styles: ICellStyles = {
            horizontalAlign: 'end',
        };

        if (isGrandTotal) {
            styles.fontWeight = 'bold';
            styles.backgroundColor = 'var(--ui-kit-colors-background-highlighted)';
        }

        if (rowGroup.isSubtotal) {
            if (rowGroup.subtotalHidden) {
                value = '';
            }

            styles.fontWeight = 'bold';
            if (rowGroup.dimIndex === 0 && rowGroup.level === 0) {
                styles.backgroundColor = 'var(--ui-kit-colors-background-highlighted)';
            }
        }

        const cell = this.buildCell(value, styles, metadata, []);

        if (format && format !== 'default') {
            cell.pluginsConfig = {
                ...cell.pluginsConfig,
                [PLUGIN_CELL_FORMATTING_KEY]: { format },
            };
        }

        return cell;
    }

    buildDimensionCell(
        dimensionName: string,
        dimensionLabel: string,
        dimensionIndex: number,
        value: any,
        viewedValue: any,
        hierarchyLevel: number,
        groupDepth: number,
        axis: 'row' | 'column',
        subtotalHidden: boolean,
        isSubtotal: boolean,
        hasChildren: boolean,
        isExpanded: boolean,
        isLoading: boolean,
        parent?: string,
        refData?: any,
        prevDimensionDepths: number[] = [],
    ): ICellWithStyles {
        const resolved = viewedValue || this.viewResolver.resolveView(dimensionName, value);

        const metadata: IPivotCellMetadata = {
            type: 'dimension',
            dimension: {
                name: dimensionName,
                label: dimensionLabel,
                level: hierarchyLevel,
                dimensionIndex,
                hasChildren,
                isExpanded,
                parent,
                refData,
                axis,
                isSubtotal,
                subtotalHidden,
            },
        };

        const styles: ICellStyles = {};

        if (axis === 'row') {
            const sumParentMaxLevels = prevDimensionDepths.reduce((sum, depth) => sum + Math.max(depth - 1, 0), 0);
            const basePadding = groupDepth * 20;
            const parentPadding = sumParentMaxLevels * 20;
            const levelPadding = hierarchyLevel * 20;
            styles.paddingLeft = basePadding + parentPadding + levelPadding;

            if (isSubtotal) {
                styles.fontWeight = 'bold';

                if (groupDepth === 0 && hierarchyLevel === 0) {
                    styles.backgroundColor = 'var(--ui-kit-colors-background-highlighted)';
                }
            }
        } else if (axis === 'column') {
            styles.backgroundColor = 'var(--ui-kit-colors-background-highlighted)';
        }

        const components: IButton[] = [];

        if (hasChildren && this.drillDownCallback) {
            // eslint-disable-next-line no-nested-ternary
            const icon = isLoading ? LoaderIcon : isExpanded ? MinusIcon : PlusIcon;

            const button: IButton = {
                positionRelativeToText: 'before',
                type: 'button',
                disabled: isLoading,
                loading: isLoading,
                icon,
                color: undefined,
            };

            if (isLoading) {
                button.animation = {
                    keyframes: [
                        {
                            offset: 0,
                            rotation: 0,
                            easing: 'linear',
                        },
                        {
                            offset: 1,
                            rotation: 360,
                            easing: 'linear',
                        },
                    ],
                    options: {
                        duration: 500,
                        easing: 'linear',
                        iterations: Infinity,
                    },
                };
            }

            if (!isLoading) {
                button.onClick = async (event) => {
                    if (this.drillDownCallback) {
                        await this.drillDownCallback(axis, dimensionName, value, event?.cell);
                    }
                };
            }

            components.push(button);
        }

        return this.buildCell(resolved, styles, metadata, components);
    }
}
