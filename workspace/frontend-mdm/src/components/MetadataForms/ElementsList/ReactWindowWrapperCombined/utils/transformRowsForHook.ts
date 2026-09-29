import type { IRowData } from '../../utils/HookKeyManager';

export const transformRowsForHook = (
    selectedRows: Record<string, unknown>[]
): IRowData[] => {
    const transformedRows = selectedRows.map((row) => {
        const transformed: Record<string, { value: string; sourceValue: string }> = {};

        for (const [name, value] of Object.entries(row)) {
            transformed[name] = {
                value: String(value ?? ''),
                sourceValue: String(value ?? ''),
            };
        }
        return transformed;
    });

    return transformedRows;
};
