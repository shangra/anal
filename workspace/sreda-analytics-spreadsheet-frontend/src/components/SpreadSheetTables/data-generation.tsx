import { CellDataType } from '../AdapterSpreadSheet/types';

export const generateData = (columnsAmount: number, rowsAmount: number) => {
    const data: CellDataType[][] = [];

    for (let rowIndex = 0; rowIndex < rowsAmount; rowIndex++) {
        const row: CellDataType[] = [];

        for (let columnIndex = 0; columnIndex < columnsAmount; columnIndex++) {
            row[columnIndex] = '';
        }

        data.push(row);
    }

    return data;
};
