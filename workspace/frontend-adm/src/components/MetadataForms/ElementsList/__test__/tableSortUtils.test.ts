import { updateColumnSortState } from 'components/MetadataForms/ElementsList/utils/tableSort.utils';
import { IColumnData } from 'components/MetadataForms/ElementsList/ReactWindowWrapperCombined/types';

describe('updateColumnSortState', () => {
    const mockSimpleColumns: IColumnData[] = [
        { name: 'field1', order: undefined, label: 'Field 1' },
        { name: 'field2', order: 'ASC', label: 'Field 2' },
        { name: 'field3', order: undefined, label: 'Field 3' }
    ];

    const mockGroupedColumns: (IColumnData | IColumnData[])[] = [
        { name: 'field1', order: undefined, label: 'Field 1' },
        [
            { name: 'field2', order: 'ASC', label: 'Field 2' },
            { name: 'field3', order: undefined, label: 'Field 3' }
        ],
        { name: 'field4', order: 'DESC', label: 'Field 4' }
    ];

    test('should set DESC order for specified column in simple columns array', () => {
        const result = updateColumnSortState(mockSimpleColumns, 'field2', 'DESC');

        expect(result[1]).toEqual({
            name: 'field2',
            order: 'DESC',
            label: 'Field 2'
        });

        expect(result[0]).toEqual({
            name: 'field1',
            order: undefined,
            label: 'Field 1'
        });
        expect(result[2]).toEqual({
            name: 'field3',
            order: undefined,
            label: 'Field 3'
        });
    });

    test('should set order for column inside group', () => {
        const result = updateColumnSortState(mockGroupedColumns, 'field2', 'DESC');

        const group = result[1] as IColumnData[];
        expect(group[0]).toEqual({
            name: 'field2',
            order: 'DESC',
            label: 'Field 2'
        });

        expect(group[1]).toEqual({
            name: 'field3',
            order: undefined,
            label: 'Field 3'
        });

        expect((result[0] as IColumnData)).toEqual({
            name: 'field1',
            order: undefined,
            label: 'Field 1'
        });
        expect((result[2] as IColumnData)).toEqual({
            name: 'field4',
            order: undefined,
            label: 'Field 4'
        });
    });

    test('should set order for column outside group when group exists', () => {
        const result = updateColumnSortState(mockGroupedColumns, 'field4', 'ASC');

        expect((result[2] as IColumnData)).toEqual({
            name: 'field4',
            order: 'ASC',
            label: 'Field 4'
        });

        const group = result[1] as IColumnData[];
        expect(group[0]).toEqual({
            name: 'field2',
            order: undefined,
            label: 'Field 2'
        });
        expect(group[1]).toEqual({
            name: 'field3',
            order: undefined,
            label: 'Field 3'
        });

        expect((result[0] as IColumnData)).toEqual({
            name: 'field1',
            order: undefined,
            label: 'Field 1'
        });
    });

    test('should reset order for other columns when setting new sort', () => {
        const columnsWithMultipleSorts: IColumnData[] = [
            { name: 'field1', order: 'ASC', label: 'Field 1' },
            { name: 'field2', order: 'DESC', label: 'Field 2' },
            { name: 'field3', order: undefined, label: 'Field 3' }
        ];

        const result = updateColumnSortState(columnsWithMultipleSorts, 'field3', 'ASC');

        expect(result[2]).toEqual({
            name: 'field3',
            order: 'ASC',
            label: 'Field 3'
        });

        expect(result[0]).toEqual({
            name: 'field1',
            order: undefined,
            label: 'Field 1'
        });
        expect(result[1]).toEqual({
            name: 'field2',
            order: undefined,
            label: 'Field 2'
        });
    });

    test('should handle empty columns array', () => {
        const result = updateColumnSortState([], 'field1', 'ASC');
        expect(result).toEqual([]);
    });

    test('should not modify original columns array', () => {
        const originalColumns = [...mockSimpleColumns];
        const result = updateColumnSortState(originalColumns, 'field1', 'ASC');

        expect(originalColumns).toEqual(mockSimpleColumns);
        expect(result).not.toBe(originalColumns);
    });

    test('should handle column not found in array', () => {
        const result = updateColumnSortState(mockSimpleColumns, 'nonexistent', 'ASC');

        result.forEach(column => {
            if (!Array.isArray(column)) {
                expect(column.order).toBeUndefined();
            }
        });
    });

    test('should work with mixed simple and grouped columns complex case', () => {
        const complexColumns: (IColumnData | IColumnData[])[] = [
            { name: 'field1', order: 'ASC', label: 'Field 1' },
            [
                { name: 'field2', order: 'DESC', label: 'Field 2' },
                { name: 'field3', order: undefined, label: 'Field 3' }
            ],
            { name: 'field4', order: undefined, label: 'Field 4' },
            [
                { name: 'field5', order: 'ASC', label: 'Field 5' },
                { name: 'field6', order: 'DESC', label: 'Field 6' }
            ]
        ];

        const result = updateColumnSortState(complexColumns, 'field3', 'DESC');

        const firstGroup = result[1] as IColumnData[];
        expect(firstGroup[1]).toEqual({
            name: 'field3',
            order: 'DESC',
            label: 'Field 3'
        });

        expect((result[0] as IColumnData)).toEqual({
            name: 'field1',
            order: undefined,
            label: 'Field 1'
        });
        expect(firstGroup[0]).toEqual({
            name: 'field2',
            order: undefined,
            label: 'Field 2'
        });
        expect((result[2] as IColumnData)).toEqual({
            name: 'field4',
            order: undefined,
            label: 'Field 4'
        });

        const secondGroup = result[3] as IColumnData[];
        expect(secondGroup[0]).toEqual({
            name: 'field5',
            order: undefined,
            label: 'Field 5'
        });
        expect(secondGroup[1]).toEqual({
            name: 'field6',
            order: undefined,
            label: 'Field 6'
        });
    });

    test('should preserve all other properties of columns', () => {
        const columnsWithExtraProps: IColumnData[] = [
            {
                name: 'field1',
                order: undefined,
                label: 'Field 1',
            }
        ];

        const result = updateColumnSortState(columnsWithExtraProps, 'field1', 'ASC');

        expect(result[0]).toEqual({
            name: 'field1',
            order: 'ASC',
            label: 'Field 1',
        });
    });
});