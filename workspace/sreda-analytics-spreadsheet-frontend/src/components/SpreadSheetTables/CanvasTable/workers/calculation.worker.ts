import { ICell } from '../../../AdapterSpreadSheet/types';

/* eslint-disable no-restricted-globals */
interface CalculationMessage {
    type: 'calculateRowHeights' | 'calculateColumnWidths' | 'calculateVisibleCells';
    payload: any;
}

self.addEventListener('message', (event: MessageEvent<CalculationMessage>) => {
    const { type, payload } = event.data;

    // eslint-disable-next-line default-case
    switch (type) {
        case 'calculateRowHeights': {
            const { data, rowIndices, columnsMetadata, cellStyles, joinedCells } = payload;
            const results = new Map<number, number>();

            // Вычисляем высоты строк
            rowIndices.forEach((rowIndex: number) => {
                const maxHeight = 25; // MIN_ROW_HEIGHT + padding

                // Логика вычисления высоты
                // ... (логика из _calcRowHeight)

                results.set(rowIndex, maxHeight);
            });

            self.postMessage({ type: 'rowHeights', results });
            break;
        }

        case 'calculateColumnWidths': {
            const { data, columnIndices, rowsMetadata, cellStyles, joinedCells } = payload;
            const results = new Map<number, number>();

            // Вычисляем ширины колонок
            columnIndices.forEach((columnIndex: number) => {
                const maxWidth = 75; // MIN_COLUMN_WIDTH + padding

                // Логика вычисления ширины
                // ... (логика из _calcColumnWidth)

                results.set(columnIndex, maxWidth);
            });

            self.postMessage({ type: 'columnWidths', results });
            break;
        }

        case 'calculateVisibleCells': {
            const { viewport, rowsMetadata, columnsMetadata, joinedCells } = payload;

            // Вычисляем видимые ячейки
            const visibleCells: ICell[] = [];

            // ... логика

            self.postMessage({ type: 'visibleCells', visibleCells });
            break;
        }
    }
});

export {};
