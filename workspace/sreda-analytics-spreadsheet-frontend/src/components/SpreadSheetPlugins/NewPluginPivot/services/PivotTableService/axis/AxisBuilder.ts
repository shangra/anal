import {
    IAxisBuilder,
    IColumnGroupItem,
    IDataRow,
    IFlatDimension,
    IHierarchyTreeManager,
    IOrderConfig,
    IParsedData,
    IRowGroupItem,
    ISubtotalConfigManager,
} from '../types';

export default class AxisBuilder implements IAxisBuilder {
    constructor(
        private hierarchyTreeManager: IHierarchyTreeManager,
        private subtotalConfigManager: ISubtotalConfigManager,
        private parsedData: IParsedData,
    ) {}

    buildGroups(
        dimensions: IFlatDimension[],
        axis: 'row' | 'column',
        dataRows: IDataRow[],
    ): IRowGroupItem[] | IColumnGroupItem[] {
        if (dimensions.length === 0) return [];

        this.buildNodesFromData(dimensions, dataRows);

        for (const dim of dimensions) {
            this.hierarchyTreeManager.updateTreeDepth(dim.dimension.name);
        }

        const groups: IRowGroupItem[] = [];

        const nestedGroups = this.buildDimensionsStructure(dimensions, dataRows);

        const dimensionDepths = dimensions.map(
            (d) => this.hierarchyTreeManager.getDimensionTree(d.dimension.name)?.metadata?.depth ?? 1,
        );

        let sortOrderCounter = 0;

        const processGroup = (
            groupData: Map<string, any>,
            dimIndex: number,
            parentValues: Map<string, any>,
            parentKey: string,
        ) => {
            if (dimIndex >= dimensions.length) return;

            const currentDim = dimensions[dimIndex];
            const isLastDim = dimIndex === dimensions.length - 1;

            const subtotalHidden = this.subtotalConfigManager.isSubtotalHidden(currentDim.dimension.name, axis);
            const subtotalPosition = this.subtotalConfigManager.getSubtotalPosition(currentDim.dimension.name, axis);

            const sortedValues = this.getSortedGroupValues(groupData, currentDim);

            for (let childrenIndex = 0; childrenIndex < sortedValues.length; childrenIndex++) {
                const value = sortedValues[childrenIndex];
                const children = groupData.get(value);

                const values = new Map(parentValues);
                values.set(currentDim.dimension.name, value);

                const key = this.buildKeyFromMap(dimensions, values, dimIndex);
                const node = this.hierarchyTreeManager.getNode(currentDim.dimension.name, value);
                const level = node?.level ?? 0;
                const isLastInPath = !node?.isExpanded || (node?.children?.length ?? 0) === 0;

                if (!isLastDim || !isLastInPath) {
                    const isActualSubtotal = !isLastInPath || !isLastDim;

                    if (subtotalPosition === 'top') {
                        groups.push({
                            key: `${key}:->:subtotal`,
                            values: new Map(values),
                            level,
                            dimIndex,
                            subtotalHidden,
                            isSubtotal: isActualSubtotal,
                            parentKey,
                            childrenIndex,
                            prevDimensionDepths: dimensionDepths.slice(0, dimIndex),
                            sortOrder: sortOrderCounter++,
                        });
                    }

                    if (!isLastInPath && children instanceof Map) {
                        processGroup(children, dimIndex, values, key);
                    } else if (children instanceof Map) {
                        processGroup(children, dimIndex + 1, values, key);
                    }

                    if (subtotalPosition === 'bottom') {
                        groups.push({
                            key: `${key}:->:subtotal`,
                            values: new Map(values),
                            level,
                            dimIndex,
                            subtotalHidden,
                            isSubtotal: isActualSubtotal,
                            parentKey,
                            childrenIndex,
                            prevDimensionDepths: dimensionDepths.slice(0, dimIndex),
                            sortOrder: sortOrderCounter++,
                        });
                    }
                } else {
                    groups.push({
                        key,
                        values,
                        level,
                        dimIndex,
                        subtotalHidden,
                        isSubtotal: false,
                        parentKey,
                        childrenIndex,
                        prevDimensionDepths: dimensionDepths.slice(0, dimIndex),
                        sortOrder: sortOrderCounter++,
                    });
                }
            }
        };

        processGroup(nestedGroups, 0, new Map(), '');

        return this.sortGroups(groups);
    }

    private buildNodesFromData(dimensions: IFlatDimension[], dataRows: IDataRow[]): void {
        for (const flatDim of dimensions) {
            const valueToRowMap = new Map<string, IDataRow>();

            for (const row of dataRows) {
                const value = row[flatDim.dimension.name];
                if (value != null) {
                    const key = String(value);
                    if (!valueToRowMap.has(key)) {
                        valueToRowMap.set(key, row);
                    }
                }
            }

            const hierarchyConfig = this.parsedData.hierarchyFields[flatDim.dimension.name];

            for (const [value, row] of valueToRowMap) {
                const isDrillDownRow = row.__drill_dimension__ === flatDim.dimension.name;

                const parentValue = isDrillDownRow ? row.__drill_parent__ : undefined;
                const level = isDrillDownRow ? row.__drill_level__ ?? 0 : 0;

                const _node = this.hierarchyTreeManager.ensureNode(
                    flatDim.dimension.name,
                    value,
                    parentValue,
                    level,
                    hierarchyConfig,
                );

                if (parentValue) {
                    const parentNode = this.hierarchyTreeManager.getNode(flatDim.dimension.name, parentValue);
                    if (parentNode && !parentNode.children.includes(value)) {
                        parentNode.children.push(value);
                    }
                }
            }
        }
    }

    private buildDimensionsStructure(dimensions: IFlatDimension[], dataRows: IDataRow[]): Map<string, any> {
        const root = new Map<string, any>();

        for (const row of dataRows) {
            if (row.__type__ === 'columns' || row.__type__ === 'indices') {
                continue;
            }

            this.addRowToStructure(root, dimensions, row, 0);
        }

        return root;
    }

    private addRowToStructure(
        currentMap: Map<string, any>,
        dimensions: IFlatDimension[],
        row: IDataRow,
        dimIndex: number,
    ): void {
        if (dimIndex >= dimensions.length) return;

        const { dimension } = dimensions[dimIndex];
        const rawValue = row[dimension.name];

        if (rawValue == null) return;
        const value = String(rawValue);

        const isLastDimension = dimIndex === dimensions.length - 1;
        const hierarchyConfig = this.parsedData.hierarchyFields[dimension.name];
        const isHierarchical = hierarchyConfig?.hierarchy === true;

        if (isHierarchical) {
            const path = this.hierarchyTreeManager.buildPath(dimension.name, value);

            let current = currentMap;

            for (let i = 0; i < path.length; i++) {
                const pathValue = path[i];
                const node = this.hierarchyTreeManager.getNode(dimension.name, pathValue);
                const isLastInPath = !node?.isExpanded || (node?.children ?? []).length === 0;

                if (isLastDimension && isLastInPath) {
                    if (!current.has(pathValue) || current.get(pathValue) === true) {
                        current.set(pathValue, true);
                    }
                } else if (isLastInPath) {
                    this.ensureMapAtKey(current, pathValue);
                    this.addRowToStructure(current.get(pathValue) as Map<string, any>, dimensions, row, dimIndex + 1);
                    return;
                } else {
                    this.ensureMapAtKey(current, pathValue);
                    current = current.get(pathValue) as Map<string, any>;
                }
            }
        } else if (isLastDimension) {
            if (!currentMap.has(value) || currentMap.get(value) === true) {
                currentMap.set(value, true);
            }
        } else {
            this.ensureMapAtKey(currentMap, value);
            this.addRowToStructure(currentMap.get(value) as Map<string, any>, dimensions, row, dimIndex + 1);
        }
    }

    private ensureMapAtKey(map: Map<string, any>, key: string): void {
        const existing = map.get(key);
        if (!existing || existing === true || !(existing instanceof Map)) {
            map.set(key, new Map<string, any>());
        }
    }

    private sortGroups(groups: IRowGroupItem[] | IColumnGroupItem[]): IRowGroupItem[] | IColumnGroupItem[] {
        return [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    private sortValuesCompare(a: any, b: any, type?: IOrderConfig['type']): number {
        if (a == null && b == null) return 0;
        if (a == null) return 1;
        if (b == null) return -1;

        switch (type) {
            case 'integer':
            case 'float': {
                const diff = +a - +b;
                // eslint-disable-next-line no-nested-ternary
                return diff > 0 ? 1 : diff < 0 ? -1 : 0;
            }
            case 'date': {
                const diff = +new Date(a) - +new Date(b);
                // eslint-disable-next-line no-nested-ternary
                return diff > 0 ? 1 : diff < 0 ? -1 : 0;
            }
            case 'uuid':
            case 'ref':
            case 'string':
            case 'varchar':
            case 'text':
            default:
                return String(a).localeCompare(String(b));
        }
    }

    private getSortedGroupValues(group: Map<string, any>, dimension: IFlatDimension): string[] {
        const values = Array.from(group.keys());

        if (dimension.dimension.name === '__layers__') {
            return values.sort((a, b) => {
                const aIdx = this.parsedData.layers.findIndex((l) => l.name === a);
                const bIdx = this.parsedData.layers.findIndex((l) => l.name === b);
                return aIdx - bIdx;
            });
        }

        if (dimension.dimension.name === '__values__') {
            return values.sort((a, b) => {
                const aParsed = this.parseCompoundMeasureKey(a);
                const bParsed = this.parseCompoundMeasureKey(b);

                if (aParsed.measureIdx !== bParsed.measureIdx) {
                    return aParsed.measureIdx - bParsed.measureIdx;
                }

                return aParsed.aggIdx - bParsed.aggIdx;
            });
        }

        const refFields = this.parsedData.refFields[dimension.dimension.name];
        const orderConfig = this.parsedData.orderConfig.find((o) => o.infoserviceField === dimension.dimension.name);

        const { infoserviceField, fieldName, orderDirection = 'ASC', type } = orderConfig ?? {};

        /** Поле представление */
        const viewField = infoserviceField ? this.parsedData.viewFields?.[infoserviceField] : null;

        /** Поле сортировки по ссылке или поле представление */
        const sortField = fieldName || viewField;

        return values.sort((a, b) => {
            const pkaValue = refFields && refFields[a] && sortField && refFields[a][sortField] ? refFields[a][sortField] : a;
            const pkbValue = refFields && refFields[b] && sortField && refFields[b][sortField] ? refFields[b][sortField] : b;
            const cmp = this.sortValuesCompare(pkaValue, pkbValue, type);
            return /asc/i.test(orderDirection) ? cmp : -cmp;
        });
    }

    /**
     * Parses a __values__ compound key into (measureIdx, aggIdx) for sorting.
     *
     * Compound key format: "measureName:->:aggregateFunction"
     * Legacy format:       "measureName" (no separator)
     */
    private parseCompoundMeasureKey(key: string): { measureIdx: number; aggIdx: number } {
        const sepIdx = key.indexOf(':->:');

        if (sepIdx === -1) {
            // Legacy: plain measure name
            const measureIdx = this.parsedData.measures.findIndex((m) => m.name === key);
            return { measureIdx: measureIdx === -1 ? Infinity : measureIdx, aggIdx: 0 };
        }

        const measureName = key.slice(0, sepIdx);
        const aggName = key.slice(sepIdx + ':->:'.length);

        const measureIdx = this.parsedData.measures.findIndex((m) => m.name === measureName);
        if (measureIdx === -1) {
            return { measureIdx: Infinity, aggIdx: 0 };
        }

        const measure = this.parsedData.measures[measureIdx];
        const aggIdx = measure.child.findIndex((c) => (c.sqlName || c.name) === aggName);

        return {
            measureIdx,
            aggIdx: aggIdx === -1 ? Infinity : aggIdx,
        };
    }

    private buildKeyFromMap(dimensions: IFlatDimension[], values: Map<string, any>, upToIndex: number): string {
        const parts: string[] = [];
        for (let i = 0; i <= upToIndex; i++) {
            const v = values.get(dimensions[i].dimension.name);
            parts.push(v != null ? String(v) : '');
        }
        return parts.join(':->:');
    }
}
