import { transformRowsForHook } from '../../ReactWindowWrapperCombined/utils/transformRowsForHook';

describe('transformRowsForHook', () => {
    describe('basic transformation', () => {
        test('should transform Record<string, unknown> into hook format', () => {
            const input: Record<string, unknown>[] = [
                { id: 1, name: 'Item 1', status: true },
                { id: 2, name: 'Item 2', status: false },
            ];

            const result = transformRowsForHook(input);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: { value: '1', sourceValue: '1' },
                name: { value: 'Item 1', sourceValue: 'Item 1' },
                status: { value: 'true', sourceValue: 'true' },
            });
            expect(result[1]).toEqual({
                id: { value: '2', sourceValue: '2' },
                name: { value: 'Item 2', sourceValue: 'Item 2' },
                status: { value: 'false', sourceValue: 'false' },
            });
        });

        test('should handle empty array', () => {
            const input: Record<string, unknown>[] = [];
            const result = transformRowsForHook(input);
            expect(result).toHaveLength(0);
        });

        test('should handle row with empty keys', () => {
            const input: Record<string, unknown>[] = [{}];
            const result = transformRowsForHook(input);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({});
        });
    });

    describe('value conversion', () => {
        test('should convert null to empty string', () => {
            const input: Record<string, unknown>[] = [
                { field: null as unknown as string, other: 'value' },
            ];

            const result = transformRowsForHook(input);
            expect(result[0].field.value).toBe('');
            expect(result[0].field.sourceValue).toBe('');
        });

        test('should convert undefined to empty string', () => {
            const input: Record<string, unknown>[] = [
                { field: undefined, other: 'value' },
            ];

            const result = transformRowsForHook(input);
            expect(result[0].field.value).toBe('');
            expect(result[0].field.sourceValue).toBe('');
        });

        test('should convert numbers to strings', () => {
            const input: Record<string, unknown>[] = [
                { id: 42, count: 0, negative: -5 },
            ];

            const result = transformRowsForHook(input);
            expect(result[0].id.value).toBe('42');
            expect(result[0].count.value).toBe('0');
            expect(result[0].negative.value).toBe('-5');
        });

        test('should convert booleans to strings', () => {
            const input: Record<string, unknown>[] = [
                { active: true, inactive: false },
            ];

            const result = transformRowsForHook(input);
            expect(result[0].active.value).toBe('true');
            expect(result[0].inactive.value).toBe('false');
        });

        test('should convert strings to strings (no-op)', () => {
            const input: Record<string, unknown>[] = [
                { text: 'hello world' },
            ];

            const result = transformRowsForHook(input);
            expect(result[0].text.value).toBe('hello world');
            expect(result[0].text.sourceValue).toBe('hello world');
        });

        test('should convert nested objects to [object Object]', () => {
            const input: Record<string, unknown>[] = [
                { nested: { foo: 'bar' } },
            ];

            const result = transformRowsForHook(input);
            expect(result[0].nested.value).toBe('[object Object]');
        });
    });

    describe('sourceValue consistency', () => {
        test('should have value === sourceValue for all fields', () => {
            const input: Record<string, unknown>[] = [
                { id: 1, name: 'Test', active: true, nothing: null },
            ];

            const result = transformRowsForHook(input);
            const row = result[0];

            for (const key of Object.keys(row)) {
                expect(row[key].value).toBe(row[key].sourceValue);
            }
        });
    });

    describe('with refs data', () => {
        test('should handle rows that came from DataManager.data.list', () => {
            // Simulating data that came from backend through DataManager
            const selectedDataRows: Record<string, unknown>[] = [
                {
                    ID: 123,
                    Name: 'Категория 1',
                    ParentID: null,
                    CreatedAt: '2024-01-15T10:30:00Z',
                    IsActive: true,
                },
            ];

            const result = transformRowsForHook(selectedDataRows);

            expect(result).toHaveLength(1);
            expect(result[0].ID.value).toBe('123');
            expect(result[0].Name.value).toBe('Категория 1');
            expect(result[0].ParentID.value).toBe('');
            expect(result[0].CreatedAt.value).toBe('2024-01-15T10:30:00Z');
            expect(result[0].IsActive.value).toBe('true');
        });
    });
});
