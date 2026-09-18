export interface SelectionState {
    selectedRows: number[];
    lastSelectedRow: number | null;
}

export interface SelectionOptions {
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
}

export const handleTableSelection = (
    rowIndex: number,
    currentState: SelectionState,
    options: SelectionOptions
): SelectionState => {
    const { ctrlKey, metaKey, shiftKey } = options;
    let newSelectedRows: number[] = [];
    const newLastSelectedRow: number | null = rowIndex;

    if (ctrlKey || metaKey) {
        // Ctrl+click: добавляем/убираем строку из выделения
        const isSelected = currentState.selectedRows.includes(rowIndex);
        newSelectedRows = isSelected
            ? currentState.selectedRows.filter(row => row !== rowIndex)
            : [...currentState.selectedRows, rowIndex];
    } else if (shiftKey && currentState.lastSelectedRow !== null) {
        // Shift+click: выделяем диапазон от самой первой выделенной строки до текущей
        const firstSelectedRow = Math.min(...currentState.selectedRows);
        const endRow = rowIndex;
        const minRow = Math.min(firstSelectedRow, endRow);
        const maxRow = Math.max(firstSelectedRow, endRow);

        newSelectedRows = [];
        for (let i = minRow; i <= maxRow; i++) {
            newSelectedRows.push(i);
        }
    } else {
        // Обычный клик: выделяем только текущую строку
        newSelectedRows = [rowIndex];
    }

    return {
        selectedRows: newSelectedRows,
        lastSelectedRow: newLastSelectedRow
    };
};

export const selectAllRows = (allRowIndexes: number[]): SelectionState => ({
    selectedRows: allRowIndexes,
    lastSelectedRow: allRowIndexes.length > 0 ? allRowIndexes[allRowIndexes.length - 1] : null
});

export const clearSelection = (): SelectionState => ({
    selectedRows: [],
    lastSelectedRow: null
});

export const isRowSelected = (rowIndex: number, selectedRows: number[]): boolean => selectedRows.includes(rowIndex);