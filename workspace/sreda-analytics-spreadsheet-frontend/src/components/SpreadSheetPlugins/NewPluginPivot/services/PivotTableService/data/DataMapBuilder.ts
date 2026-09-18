import {
    AggregationDataMap,
    IAggregationEngine,
    IDataMapBuilder,
    IDataRow,
    IFlatDimension,
    IHierarchyTreeManager,
    IParsedData,
} from '../types';

export default class DataMapBuilder implements IDataMapBuilder {
    build(
        parsedData: IParsedData,
        aggregationEngine: IAggregationEngine,
        hierarchyTreeManager?: IHierarchyTreeManager,
    ): AggregationDataMap {
        const map: AggregationDataMap = new Map();

        const { rowDimensions: rowDims, columnDimensions: colDims, dataRows } = parsedData;

        // ── Pre-build shadow maps for parent-row exclusion ──────────────
        const rowShadowMap = hierarchyTreeManager
            ? this.buildShadowMap(rowDims, dataRows, hierarchyTreeManager)
            : new Map<string, Set<string>>();
        const colShadowMap = hierarchyTreeManager
            ? this.buildShadowMap(colDims, dataRows, hierarchyTreeManager)
            : new Map<string, Set<string>>();

        for (const row of dataRows) {
            // Skip backend-calculated total rows
            if (row.__type__ && row.__type__ !== 'main') {
                continue;
            }

            for (let rowDimIndex = 0; rowDimIndex < rowDims.length; rowDimIndex++) {
                // Skip parent rows whose children exist in the same bucket
                if (this.isRowShadowed(row, rowDims, rowDimIndex, rowShadowMap)) {
                    continue;
                }

                const rowKey = this.buildKeyUpToDimIndex(rowDims, row, rowDimIndex);

                if (!map.has(rowKey)) {
                    map.set(rowKey, new Map());
                }
                const colMap = map.get(rowKey)!;

                for (let colDimIndex = 0; colDimIndex < colDims.length; colDimIndex++) {
                    if (this.isRowShadowed(row, colDims, colDimIndex, colShadowMap)) {
                        continue;
                    }

                    const colKey = this.buildKeyUpToDimIndex(colDims, row, colDimIndex);

                    if (!colMap.has(colKey)) {
                        colMap.set(colKey, new Map());
                    }
                    const measureMap = colMap.get(colKey)!;

                    const measures = this.extractMeasuresFromExpandedRow(row);
                    for (const [measureKey, value] of measures) {
                        const [, aggregateFunction] = measureKey.split(':->:');
                        const existing = measureMap.get(measureKey);
                        const accumulated = aggregationEngine.accumulateValue(existing, Number(value ?? 0), aggregateFunction);
                        measureMap.set(measureKey, accumulated);
                    }
                }
            }
        }

        return map;
    }

    // ════════════════════════════════════════════════════════════════════
    //  Shadow map — prevents parent rows from double-counting
    // ════════════════════════════════════════════════════════════════════

    /**
     * For each dimension D at index `dimIdx` that has expanded nodes,
     * scan all drill-down children of those nodes and record their
     * key prefixes at every level *before* `dimIdx`.
     *
     * Later, when processing a parent row whose D-value is the expanded
     * node, we check whether the parent's key prefix at that level
     * appears in the set — meaning children share the same aggregation
     * bucket and the parent would cause double-counting.
     *
     * Example: dims=[City(0), Product(1)], Product "A" expanded.
     *   Child row (Moscow, SubA1) -> at keyLevel=0, prefix="Moscow".
     *   Shadow entry: "product::A::0" -> {"Moscow", "SPB", …}
     *
     *   Parent row (Moscow, A, 100) at keyLevel=0:
     *     prefix="Moscow" IS in shadow set -> SKIP (children cover it).
     *
     *   Parent row (District1, A, 60) at keyLevel=0:
     *     prefix="District1" NOT in shadow set -> KEEP (no children here).
     */
    private buildShadowMap(
        dimensions: IFlatDimension[],
        dataRows: IDataRow[],
        hierarchyTreeManager: IHierarchyTreeManager,
    ): Map<string, Set<string>> {
        const shadowMap = new Map<string, Set<string>>();

        for (let dimIdx = 0; dimIdx < dimensions.length; dimIdx++) {
            const dimName = dimensions[dimIdx].dimension.name;
            const tree = hierarchyTreeManager.getDimensionTree(dimName);
            if (!tree) continue;

            // Collect all expanded node IDs for this dimension
            const expandedValues = new Set<string>();
            for (const [nodeId, node] of tree.nodes) {
                if (node.isExpanded && node.children.length > 0) {
                    expandedValues.add(nodeId);
                }
            }
            if (expandedValues.size === 0) continue;

            // For every child row of an expanded value, register its
            // key prefixes at all levels preceding this dimension.
            for (const row of dataRows) {
                if (row.__drill_dimension__ !== dimName) continue;

                const parentValue = row.__drill_parent__;
                if (parentValue == null) continue;

                const parentStr = String(parentValue);
                if (!expandedValues.has(parentStr)) continue;

                for (let keyLevel = 0; keyLevel < dimIdx; keyLevel++) {
                    const keyPrefix = this.buildKeyUpToDimIndex(dimensions, row, keyLevel);
                    const shadowKey = `${dimName}::${parentStr}::${keyLevel}`;

                    if (!shadowMap.has(shadowKey)) {
                        shadowMap.set(shadowKey, new Set());
                    }
                    shadowMap.get(shadowKey)!.add(keyPrefix);
                }
            }
        }

        return shadowMap;
    }

    /**
     * Returns `true` if this row should be excluded from aggregation
     * at the given `keyLevel`.
     *
     * Checks every dimension beyond `keyLevel`: if the row's value
     * for that dimension is an expanded node AND drill-down children
     * exist in the same key-prefix bucket, the parent row would
     * cause double-counting — so it must be skipped.
     */
    private isRowShadowed(
        row: IDataRow,
        dimensions: IFlatDimension[],
        keyLevel: number,
        shadowMap: Map<string, Set<string>>,
    ): boolean {
        for (let dimIdx = keyLevel + 1; dimIdx < dimensions.length; dimIdx++) {
            const dimName = dimensions[dimIdx].dimension.name;
            const value = row[dimName];
            if (value == null) continue;

            const shadowKey = `${dimName}::${String(value)}::${keyLevel}`;
            const prefixes = shadowMap.get(shadowKey);
            if (!prefixes) continue;

            const keyPrefix = this.buildKeyUpToDimIndex(dimensions, row, keyLevel);
            if (prefixes.has(keyPrefix)) {
                return true;
            }
        }

        return false;
    }

    // ════════════════════════════════════════════════════════════════════

    private extractMeasuresFromExpandedRow(row: IDataRow): Map<string, any> {
        const measures = new Map<string, any>();
        for (const [key, value] of Object.entries(row)) {
            if (key.includes(':->:') && key.split(':->:').length === 2) {
                measures.set(key, value);
            }
        }
        return measures;
    }

    private buildKeyUpToDimIndex(dimensions: IFlatDimension[], row: IDataRow, index: number): string {
        return dimensions
            .slice(0, index + 1)
            .map((d) => {
                const v = row[d.dimension.name];
                return v != null ? String(v) : '';
            })
            .join(':->:');
    }
}
