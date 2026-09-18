import { RuleBaseInput } from "components/DRQueryBuilder/components/Rule/components/RuleBaseInput";

jest.mock('on-change', () => jest.fn());

describe('RuleBaseInput Methods', () => {
    const mockHandleChange = jest.fn();
    let component: RuleBaseInput;

    beforeEach(() => {
        component = new RuleBaseInput({
            type: 'string' as any,
            value: '',
            handleChange: mockHandleChange
        });
        mockHandleChange.mockClear();
    });

    describe('isValidUuid', () => {
        it('validates correct UUID', () => {
            expect(component.isValidUuid('12345678-1234-1234-1234-123456789abc')).toBe(true);
        });

        it('rejects invalid UUID', () => {
            expect(component.isValidUuid('invalid')).toBe(false);
        });
    });

    describe('handleCompositeChange', () => {
        it('transforms composite value correctly', () => {
            component.handleCompositeChange({
                value: 'test',
                link: 'link',
                type: 'ref',
                label: 'label'
            });

            expect(mockHandleChange).toHaveBeenCalledWith({
                value: 'test',
                link: 'link',
                type: 10, // ref type code
                label: 'label'
            });
        });
    });
});