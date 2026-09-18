import { IDimensionAnalyzer, IFlatDimension, IParsedData } from '../types';

export default class DimensionAnalyzer implements IDimensionAnalyzer {
    private static readonly SPECIAL_DIMENSIONS = ['__values__', '__layers__'];

    constructor(private parsedData: IParsedData) {}

    getRowDimensions(): IFlatDimension[] {
        return this.parsedData.rowDimensions;
    }

    getColumnDimensions(): IFlatDimension[] {
        return this.parsedData.columnDimensions;
    }

    isSpecialDimension(name: string): boolean {
        return DimensionAnalyzer.SPECIAL_DIMENSIONS.includes(name);
    }

    getRegularDimensions(dimensions: IFlatDimension[]): IFlatDimension[] {
        return dimensions.filter((d) => !this.isSpecialDimension(d.dimension.name));
    }

    hasValuesInRows(): boolean {
        return this.parsedData.rowDimensions.some((d) => d.dimension.name === '__values__');
    }

    hasValuesInColumns(): boolean {
        return this.parsedData.columnDimensions.some((d) => d.dimension.name === '__values__');
    }

    hasLayersInRows(): boolean {
        return this.parsedData.rowDimensions.some((d) => d.dimension.name === '__layers__');
    }

    hasLayersInColumns(): boolean {
        return this.parsedData.columnDimensions.some((d) => d.dimension.name === '__layers__');
    }
}
