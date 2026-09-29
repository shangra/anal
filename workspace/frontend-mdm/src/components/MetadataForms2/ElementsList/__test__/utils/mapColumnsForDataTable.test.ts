import { mapColumnsForDataTable } from '../../utils/mapColumnsForDataTable';
import type { IColumnData } from '../../ReactWindowWrapperCombined/types';

describe('mapColumnsForDataTable', () => {
    test('should map single columns to DataTable format', () => {
        const cols: IColumnData[] = [
            { name: 'id', label: 'ID' },
            { name: 'name', label: 'Name' },
        ];

        const result = mapColumnsForDataTable(cols);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('id');
        expect(result[0].label).toBe('ID');
        expect(result[0].value).toBe('id');
        expect(result[0].show).toBe(true);
        expect(result[0].columnIndex).toBe(0);

        expect(result[1].id).toBe('name');
        expect(result[1].label).toBe('Name');
        expect(result[1].value).toBe('name');
        expect(result[1].columnIndex).toBe(1);
    });

    test('should map grouped columns to flat array', () => {
        const cols: (IColumnData | IColumnData[])[] = [
            ['id', 'name'].map((name) => ({ name, label: name })),
        ];

        const result = mapColumnsForDataTable(cols);

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe('id');
        expect(result[1].value).toBe('name');
    });

    test('should handle empty columns', () => {
        const cols: (IColumnData | IColumnData[])[] = [];
        const result = mapColumnsForDataTable(cols);
        expect(result).toEqual([]);
    });

    test('should use label fallback to name', () => {
        const cols: IColumnData[] = [{ name: 'fieldName', label: 'fieldName' }];

        const result = mapColumnsForDataTable(cols);

        expect(result[0].label).toBe('fieldName');
    });

    test('should handle mixed column types', () => {
        const cols: (IColumnData | IColumnData[])[] = [
            { name: 'single', label: 'Single' },
            ['group1', 'group2'].map((name) => ({ name, label: name })),
        ];

        const result = mapColumnsForDataTable(cols);

        expect(result).toHaveLength(3);
        expect(result[0].id).toBe('single');
        expect(result[1].id).toBe('group1-0');
        expect(result[2].id).toBe('group1-1');
    });
});
