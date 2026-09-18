export interface getMoveRowAvailabilityState {
    selectedRows: number[];
    totalRows: number;
    canMoveUp: boolean;
    canMoveDown: boolean;
}

export const getMoveRowAvailability = (selectedRows: number[], totalRows: number): getMoveRowAvailabilityState => {
    const canMoveUp = selectedRows.length > 0 && !selectedRows.includes(0);
    const canMoveDown = selectedRows.length > 0 && !selectedRows.includes(totalRows - 1);

    return {
        selectedRows,
        totalRows,
        canMoveUp,
        canMoveDown
    };
};