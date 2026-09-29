import { formatCellValue } from '../../utils/formatCellValue';

describe('formatCellValue', () => {
    describe('typed values', () => {
        test('should convert boolean true to "Правда"', () => {
            const result = formatCellValue({ type: 2, value: true });
            expect(result).toBe('Правда');
        });

        test('should convert boolean false to "Ложь"', () => {
            const result = formatCellValue({ type: 2, value: false });
            expect(result).toBe('Ложь');
        });

        test('should return string value for type 0', () => {
            const result = formatCellValue({ type: 0, value: 'hello' });
            expect(result).toBe('hello');
        });

        test('should return empty string for type 0 with empty value', () => {
            const result = formatCellValue({ type: 0, value: '' });
            expect(result).toBe('');
        });

        test('should return float value for type 1', () => {
            const result = formatCellValue({ type: 1, value: 3.14 });
            expect(result).toBe(3.14);
        });

        test('should return datetime value for type 3', () => {
            const date = new Date('2024-01-01');
            const result = formatCellValue({ type: 3, value: date });
            expect(result).toBe(date);
        });

        test('should return ref value for type 10', () => {
            const result = formatCellValue({ type: 10, value: { id: 1, name: 'Item' } });
            expect(result).toEqual({ id: 1, name: 'Item' });
        });

        test('should return empty string for falsy typed value', () => {
            const result = formatCellValue({ type: 0, value: null as unknown as string });
            expect(result).toBe('');
        });
    });

    describe('non-typed values', () => {
        test('should return refValue when value is not typed', () => {
            const result = formatCellValue('not typed', 'ref:active');
            expect(result).toBe('ref:active');
        });

        test('should return value when refValue is undefined', () => {
            const result = formatCellValue('hello', undefined);
            expect(result).toBe('hello');
        });

        test('should return empty string when both value and refValue are null', () => {
            const result = formatCellValue(null, null as unknown as string);
            expect(result).toBe('');
        });

        test('should return empty string when both value and refValue are undefined', () => {
            const result = formatCellValue(undefined, undefined);
            expect(result).toBe('');
        });

        test('should prefer refValue over value', () => {
            const result = formatCellValue('original', 'viewed');
            expect(result).toBe('viewed');
        });

        test('should handle numeric non-typed values', () => {
            const result = formatCellValue(42, undefined);
            expect(result).toBe(42);
        });

        test('should handle boolean non-typed values', () => {
            const result = formatCellValue(true, undefined);
            expect(result).toBe(true);
        });

        test('should handle object non-typed values', () => {
            const obj = { key: 'value' };
            const result = formatCellValue(obj, undefined);
            expect(result).toBe(obj);
        });
    });

    describe('edge cases', () => {
        test('should handle undefined input', () => {
            const result = formatCellValue(undefined);
            expect(result).toBe('');
        });

        test('should handle 0 as a value', () => {
            const result = formatCellValue(0, undefined);
            expect(result).toBe(0);
        });

        test('should handle empty string refValue', () => {
            const result = formatCellValue('original', '');
            expect(result).toBe('');
        });
    });
});
