import { IDimensionAnalyzer, ILayer, IMeasure, IViewValueResolver } from '../types';

export default class ViewValueResolver implements IViewValueResolver {
    constructor(
        private dimensionAnalyzer: IDimensionAnalyzer,
        private measures: IMeasure[],
        private layers: ILayer[],
        private viewFields: Record<string, string>,
        private refFields: Record<string, Record<string, any>>,
    ) {}

    resolveView(dimensionName: string, value: any): any {
        if (this.dimensionAnalyzer.isSpecialDimension(dimensionName)) {
            if (dimensionName === '__values__') {
                return this.resolveValuesView(value);
            }

            if (dimensionName === '__layers__') {
                const layer = this.layers.find((l) => l.name === value);
                return layer?.description || layer?.label || value;
            }
        }

        const viewField = this.viewFields[dimensionName];
        if (!viewField) return value;

        const refData = this.refFields[dimensionName];
        if (!refData || !refData[value]) return value;

        return refData[value][viewField] || value;
    }

    /**
     * Resolves the display label for a __values__ dimension value.
     *
     * The value is a compound key "measureName:->:aggregateFunction".
     * - If the measure has a single aggregate -> "MeasureLabel"
     * - If the measure has multiple aggregates -> "MeasureLabel (AggregateLabel)"
     * - Legacy plain measure name (no :->:) -> fallback to measure label
     */
    private resolveValuesView(value: any): any {
        const strValue = String(value ?? '');

        const separatorIdx = strValue.indexOf(':->:');

        if (separatorIdx === -1) {
            // Legacy format: plain measure name
            const measure = this.measures.find((m) => m.name === strValue);
            return measure?.description || measure?.label || value;
        }

        const measureName = strValue.slice(0, separatorIdx);
        const aggName = strValue.slice(separatorIdx + ':->:'.length);

        const measure = this.measures.find((m) => m.name === measureName);
        if (!measure) return value;

        const measureLabel = measure.description || measure.label || measureName;

        // Single aggregate -> show measure label only (backward-compatible display)
        if (measure.child.length <= 1) {
            return measureLabel;
        }

        // Multiple aggregates -> disambiguate with aggregate label
        const aggregate = measure.child.find((a) => (a.sqlName || a.name) === aggName);
        const aggLabel = aggregate?.description || aggregate?.label || aggName;

        return `${measureLabel} (${aggLabel})`;
    }
}
