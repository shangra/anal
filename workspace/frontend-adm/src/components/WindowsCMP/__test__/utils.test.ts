import { isEmptySidebar, capitalizeFirstLetter } from 'components/WindowsCMP/utils';

describe('Edge Cases', () => {
    describe('isEmptySidebar edge cases', () => {
        it('should handle null or undefined input gracefully', () => {
            expect(() => isEmptySidebar(null as any)).toThrow();
            expect(() => isEmptySidebar(undefined as any)).toThrow();
        });

        it('should handle sidebar without tabs property', () => {
            expect(() => isEmptySidebar({} as any)).toThrow();
        });
    });

    describe('capitalizeFirstLetter edge cases', () => {
        it('should handle very long strings', () => {
            const longString = `a${  'b'.repeat(1000)}`;
            const result = capitalizeFirstLetter(longString);
            expect(result.charAt(0)).toBe('A');
            expect(result.length).toBe(1001);
        });

        it('should handle strings with emoji', () => {
            expect(capitalizeFirstLetter('😀emoji')).toBe('😀emoji');
            expect(capitalizeFirstLetter('👍test')).toBe('👍test');
        });
    });
});
