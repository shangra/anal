import { IDataMerger, IDataRow, IDrillDownResponse, IPivotTable } from '../types';

export default class DataMerger implements IDataMerger {
    mergeData(
        mainData: IPivotTable,
        drillDownData: IDrillDownResponse,
        parentNodeId: string,
        dimensionName: string,
    ): IPivotTable {
        const merged = { ...mainData };

        // 1. Remove any previously merged children for this parent.
        merged.rows = mainData.rows.filter(
            (row) => !(row.__drill_parent__ === parentNodeId && row.__drill_dimension__ === dimensionName),
        );

        const insertPosition = merged.rows.findIndex(
            (row) => String(row[dimensionName]) === String(parentNodeId) && row.__drill_parent__ !== parentNodeId,
        );

        if (insertPosition === -1) {
            return merged;
        }

        const drillDownRows: IDataRow[] = drillDownData.table.rows.map((row) => ({
            ...row,
            __drill_parent__: parentNodeId,
            __drill_dimension__: dimensionName,
            __drill_level__: drillDownData.metadata.level,
        }));

        merged.rows = [
            ...merged.rows.slice(0, insertPosition + 1),
            ...drillDownRows,
            ...merged.rows.slice(insertPosition + 1),
        ];

        merged.refFields = this.mergeRefFields(merged.refFields, drillDownData.table.refFields);

        merged.hierarchyFields = {
            ...merged.hierarchyFields,
            ...drillDownData.table.hierarchyFields,
        };

        merged.viewField = {
            ...merged.viewField,
            ...drillDownData.table.viewField,
        };

        return merged;
    }

    removeData(mainData: IPivotTable, parentNodeId: string, dimensionName: string): IPivotTable {
        const merged = { ...mainData };

        const removedValues = new Set<string>();
        const keptRows = this.removeChildrenIterative(mainData.rows, parentNodeId, dimensionName, removedValues);
        merged.rows = keptRows;

        // Clean up refFields for removed dimension values
        if (removedValues.size > 0 && merged.refFields[dimensionName]) {
            const cleanedRefs = { ...merged.refFields[dimensionName] };
            for (const val of removedValues) {
                delete cleanedRefs[val];
            }
            merged.refFields = { ...merged.refFields, [dimensionName]: cleanedRefs };
        }

        return merged;
    }

    /**
     * Iteratively removes all rows that are descendants (direct or indirect)
     * of the given parent node in the specified dimension.
     * O(rows × depth) time complexity where depth is the maximum hierarchy depth.
     */
    private removeChildrenIterative(
        rows: IDataRow[],
        parentNodeId: string,
        dimensionName: string,
        removedValues?: Set<string>,
    ): IDataRow[] {
        const toRemove = new Set<string>([parentNodeId]);
        let changed = true;

        while (changed) {
            changed = false;
            for (const row of rows) {
                const dimValue = String(row[dimensionName] ?? '');
                if (
                    row.__drill_dimension__ === dimensionName &&
                    row.__drill_parent__ != null &&
                    toRemove.has(String(row.__drill_parent__)) &&
                    !toRemove.has(dimValue)
                ) {
                    toRemove.add(dimValue);
                    changed = true;
                }
            }
        }

        toRemove.delete(parentNodeId);

        // Collect removed values for cleanup
        if (removedValues) {
            for (const val of toRemove) {
                removedValues.add(val);
            }
        }

        return rows.filter((row) => {
            if (row.__drill_dimension__ === dimensionName && row.__drill_parent__ != null) {
                return !toRemove.has(String(row[dimensionName]));
            }
            return true;
        });
    }

    private mergeRefFields(
        mainRefFields: Record<string, Record<string, any>>,
        drillRefFields: Record<string, Record<string, any>>,
    ): Record<string, Record<string, any>> {
        const merged = { ...mainRefFields };

        for (const [dimName, refs] of Object.entries(drillRefFields)) {
            merged[dimName] = { ...(merged[dimName] ?? {}), ...refs };
        }

        return merged;
    }
}
