import { IDataParser, IDataRow, IDimension, IFlatDimension, ILayer, IMeasure, IParsedData, IPivotData } from '../types';

export default class DataParser implements IDataParser {
    // TODO: ts-expect-error нужно поправить
    parse(data: IPivotData): IParsedData {
        // @ts-expect-error
        const expandedRows = this.expandData(data.table.rows, data.params.values, data.params.layers);

        return {
            // @ts-expect-error
            rowDimensions: this.flattenDimensions(data.params.rows || []),
            // @ts-expect-error
            columnDimensions: this.flattenDimensions(data.params.columns || []),
            // @ts-expect-error
            measures: data.params.values || [],
            // @ts-expect-error
            layers: data.params.layers || [],
            dataRows: expandedRows,
            viewFields: data.table.viewField || {},
            refFields: data.table.refFields || {},
            hierarchyFields: data.table.hierarchyFields || {},
            orderConfig: data.table.order || [],
        };
    }

    /**
     * Expands raw backend rows into per-(layer, measure, aggregate) rows.
     *
     * Each expanded row carries:
     *   __layers__  = layer name
     *   __values__  = compound key "measureName:->:aggregateFunction"
     *   <compound>  = the actual numeric value for that one aggregate
     *
     * This guarantees that every (measure, aggregate) pair appears as
     * a separate entry in the __values__ dimension axis, so all
     * user-requested aggregation functions are visible.
     */
    private expandData(rows: IDataRow[], measures: IMeasure[], layers: ILayer[]): IDataRow[] {
        const expandedRows: IDataRow[] = [];

        const effectiveLayers: ILayer[] =
            layers.length > 0
                ? layers
                : [
                      {
                          id: '',
                          name: '',
                          label: '',
                          description: '',
                          ref: '',
                          type: '',
                      },
                  ];

        for (const row of rows) {
            // Collect base dimension fields (no composite keys, no __ meta fields)
            const baseFields: Record<string, any> = {};
            for (const [key, value] of Object.entries(row)) {
                if (!key.includes(':->:') && !key.startsWith('__')) {
                    baseFields[key] = value;
                }
            }

            for (const layer of effectiveLayers) {
                // ── No measures configured ─────────────────────────────
                if (measures.length === 0) {
                    expandedRows.push({
                        __no_ref__: row.__no_ref__,
                        __type__: row.__type__,
                        __drill_parent__: row.__drill_parent__,
                        __drill_dimension__: row.__drill_dimension__,
                        __drill_level__: row.__drill_level__,
                        __layers__: layer.name,
                        __values__: '',
                        ...baseFields,
                    });
                    continue;
                }

                // ── One row per (measure, aggregate) ──────────────────
                for (const measure of measures) {
                    // Edge case: measure with no aggregates
                    if (!measure.child || measure.child.length === 0) {
                        expandedRows.push({
                            __no_ref__: row.__no_ref__,
                            __type__: row.__type__,
                            __drill_parent__: row.__drill_parent__,
                            __drill_dimension__: row.__drill_dimension__,
                            __drill_level__: row.__drill_level__,
                            __layers__: layer.name,
                            __values__: measure.name,
                            ...baseFields,
                        });
                        continue;
                    }

                    for (const aggregate of measure.child) {
                        const aggName = aggregate.sqlName || aggregate.name;

                        // Key in the original flat row from backend
                        const originalKey = `${measure.name}:->:${layer.name}:->:${aggName}`;

                        // Compound key used as __values__ dimension value
                        // AND as the data field key inside the expanded row
                        const measureKey = `${measure.name}:->:${aggName}`;

                        const hasValue = row[originalKey] !== undefined;

                        // Skip if no data for this aggregate in this layer
                        // (same guard as the original hasAtLeastOneValue check)
                        if (!hasValue && layers.length > 0) {
                            continue;
                        }

                        const expandedRow: IDataRow = {
                            __no_ref__: row.__no_ref__,
                            __type__: row.__type__,
                            __drill_parent__: row.__drill_parent__,
                            __drill_dimension__: row.__drill_dimension__,
                            __drill_level__: row.__drill_level__,
                            __layers__: layer.name,
                            __values__: measureKey,
                            ...baseFields,
                        };

                        if (hasValue) {
                            expandedRow[measureKey] = Number(row[originalKey]);
                        }

                        expandedRows.push(expandedRow);
                    }
                }
            }
        }

        return expandedRows;
    }

    private flattenDimensions(dimensions: IDimension[]): IFlatDimension[] {
        const flattened: IFlatDimension[] = [];

        for (let i = 0; i < dimensions.length; i++) {
            flattened.push({
                dimension: dimensions[i],
                index: i,
                parentDimension: undefined,
                isChild: false,
            });
        }

        return flattened;
    }
}
