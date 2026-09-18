import { IAggregationEngine, IAggregationResult } from '../types';

export default class AggregationEngine implements IAggregationEngine {
    aggregate(values: number[], functionName: string): number {
        if (values.length === 0) return 0;

        const upperFunc = (functionName || 'SUM').toUpperCase();

        switch (upperFunc) {
            case 'SUM':
                return values.reduce((sum, val) => sum + val, 0);

            case 'AVG':
            case 'AVERAGE':
                return values.reduce((sum, val) => sum + val, 0) / values.length;

            case 'COUNT':
                return values.length;

            case 'MIN':
                return Math.min(...values);

            case 'MAX':
                return Math.max(...values);

            default:
                return values.reduce((sum, val) => sum + val, 0);
        }
    }

    accumulateValue(current: IAggregationResult | undefined, value: number, functionName: string): IAggregationResult {
        const upperFunc = (functionName || 'SUM').toUpperCase();

        if (!current) {
            if (upperFunc === 'COUNT') {
                return { value: 1, count: 1 };
            }
            return { value, count: 1 };
        }

        switch (upperFunc) {
            case 'COUNT':
                return {
                    value: current.value + 1,
                    count: current.count + 1,
                };

            case 'MIN':
                return {
                    value: Math.min(current.value, value),
                    count: current.count + 1,
                };

            case 'MAX':
                return {
                    value: Math.max(current.value, value),
                    count: current.count + 1,
                };

            case 'SUM':
            case 'AVG':
            case 'AVERAGE':
            default:
                return {
                    value: current.value + value,
                    count: current.count + 1,
                };
        }
    }

    /**
     * FIX [P3]: Merges two pre-aggregated IAggregationResult values.
     *
     * Unlike `accumulateValue` (which adds a single raw data point),
     * this method correctly combines two already-aggregated results:
     *
     * - SUM / AVG: sums are added, counts are added
     *   -> AVG finalization: total_sum / total_count = correct weighted average
     * - COUNT: counts (stored in `value`) are added
     *   -> finalization returns total count across all cells
     * - MIN: minimum of two minimums = overall minimum
     * - MAX: maximum of two maximums = overall maximum
     */
    mergeResults(
        current: IAggregationResult | undefined,
        other: IAggregationResult,
        functionName: string,
    ): IAggregationResult {
        const upperFunc = (functionName || 'SUM').toUpperCase();

        if (!current) {
            return { value: other.value, count: other.count };
        }

        switch (upperFunc) {
            case 'MIN':
                return {
                    value: Math.min(current.value, other.value),
                    count: current.count + other.count,
                };

            case 'MAX':
                return {
                    value: Math.max(current.value, other.value),
                    count: current.count + other.count,
                };

            case 'SUM':
            case 'AVG':
            case 'AVERAGE':
            case 'COUNT':
            default:
                return {
                    value: current.value + other.value,
                    count: current.count + other.count,
                };
        }
    }

    finalizeAggregation(result: IAggregationResult, functionName: string): number {
        const upperFunc = (functionName || 'SUM').toUpperCase();

        if (upperFunc === 'AVG' || upperFunc === 'AVERAGE') {
            return result.count > 0 ? result.value / result.count : 0;
        }

        return result.value;
    }
}
