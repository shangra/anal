export const transformRowsForHook = (selectedRows: Record<string, string>[]) => {
    const transformedRows = selectedRows.map(row => {
        const transformed: Record<string, { value: string; sourceValue: string }> = {};

        for (const [name, value] of Object.entries(row)) {
            transformed[name] = {
                value,
                sourceValue: value,
            };
        }
        return transformed;
    });

    return transformedRows;
}