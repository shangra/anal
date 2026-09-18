import { Cell, Range } from '../../AdapterSpreadSheet/models';

/**
 * RFC 4180-compliant CSV parser.
 * Обрабатывает:
 * - Поля в кавычках: "hello, world"
 * - Escaped кавычки: "he said ""hello"""
 * - Переносы строк внутри кавычек
 */
export function parseCSV(input: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    // Нормализуем trailing newline
    const text = input.replace(/[\r\n]+$/, '');

    while (i < text.length) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    // Escaped quote
                    currentField += '"';
                    i += 2;
                } else {
                    // End of quoted field
                    inQuotes = false;
                    i++;
                }
            } else {
                currentField += char;
                i++;
            }
        } else if (char === '"' && currentField === '') {
            inQuotes = true;
            i++;
        } else if (char === delimiter) {
            currentRow.push(currentField);
            currentField = '';
            i++;
        } else if (char === '\r' && nextChar === '\n') {
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
            i += 2;
        } else if (char === '\n') {
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
            i++;
        } else {
            currentField += char;
            i++;
        }
    }

    // Последнее поле/строка
    currentRow.push(currentField);
    if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0] === '')) {
        rows.push(currentRow);
    }

    return rows;
}

export function applyCSVData(
    target: Range | Cell,
    csvString: string,
    valueSetter: (cell: Cell, value: string) => void,
    options: {
        delimiter?: string;
        trimValues?: boolean;
    } = {},
): void {
    const { delimiter = '\t', trimValues = false } = options;

    const rows = parseCSV(csvString, delimiter);
    if (!rows.length) return;

    let startRow: number;
    let startColumn: number;
    let maxRows: number | null = null;
    let maxColumns: number | null = null;

    if (target instanceof Range) {
        startRow = target.topLeft.coordinates.rowIndex;
        startColumn = target.topLeft.coordinates.columnIndex;
        const rangeRows = target.bottomRight.coordinates.rowIndex - startRow + 1;
        const rangeCols = target.bottomRight.coordinates.columnIndex - startColumn + 1;
        if (rangeRows > 1 || rangeCols > 1) {
            maxRows = rangeRows;
            maxColumns = rangeCols;
        }
    } else {
        startRow = target.coordinates.rowIndex;
        startColumn = target.coordinates.columnIndex;
    }

    for (let ri = 0; ri < rows.length; ri++) {
        if (maxRows !== null && ri >= maxRows) break;
        const columns = rows[ri];
        for (let ci = 0; ci < columns.length; ci++) {
            if (maxColumns !== null && ci >= maxColumns) break;
            let value = columns[ci];
            if (trimValues) value = value.trim();
            valueSetter(new Cell({ rowIndex: startRow + ri, columnIndex: startColumn + ci }), value);
        }
    }
}

export function toCSVData(
    target: Range | Cell,
    formatter: (cell: Cell) => string,
    options: { delimiter?: string; rowSeparator?: string; addQuotes?: boolean } = {},
): string {
    const { delimiter = '\t', rowSeparator = '\r\n', addQuotes = false } = options;
    const range = target instanceof Cell ? new Range(target) : target;
    const rows: string[] = [];

    for (let r = range.topLeft.coordinates.rowIndex; r <= range.bottomRight.coordinates.rowIndex; r++) {
        const cells: string[] = [];
        for (let c = range.topLeft.coordinates.columnIndex; c <= range.bottomRight.coordinates.columnIndex; c++) {
            const v = formatter(new Cell({ rowIndex: r, columnIndex: c }));
            cells.push(addQuotes ? `"${v}"` : v);
        }
        rows.push(cells.join(delimiter));
    }
    return rows.join(rowSeparator);
}
