import { SELECTED_ROWS_HOOK_NAME } from "components/MetadataForms/ElementsList/constants";
import { IRowData, HookKeyManager } from "components/MetadataForms/ElementsList/utils/HookKeyManager";

describe('HookKeyManager', () => {
    const mockModalUUID = 'test-modal-123';
    const mockFormId = 'form-456';
    const mockRows: IRowData[] = [
        { id: { value: '1', sourceValue: '1' }, name: { value: 'John', sourceValue: 'John' } },
        { id: { value: '2', sourceValue: '2' }, name: { value: 'Jane', sourceValue: 'Jane' } }
    ];

    describe('manageSelectedRows', () => {
        it('should return correct object structure with rows', () => {
            const result = HookKeyManager.manageSelectedRows(mockModalUUID, mockFormId, mockRows);

            expect(result).toEqual({
                [`${mockModalUUID}__${mockFormId}__SELECT`]: {
                    [SELECTED_ROWS_HOOK_NAME]: mockRows
                }
            });
        });

        it('should handle empty rows array', () => {
            const result = HookKeyManager.manageSelectedRows(mockModalUUID, mockFormId, []);

            expect(result).toEqual({
                [`${mockModalUUID}__${mockFormId}__SELECT`]: {
                    [SELECTED_ROWS_HOOK_NAME]: []
                }
            });
        });

        it('should convert non-array rows to empty array', () => {
            const result = HookKeyManager.manageSelectedRows(mockModalUUID, mockFormId, null as any);

            expect(result).toEqual({
                [`${mockModalUUID}__${mockFormId}__SELECT`]: {
                    [SELECTED_ROWS_HOOK_NAME]: []
                }
            });
        });

        it('should work with single row', () => {
            const singleRow = [mockRows[0]];
            const result = HookKeyManager.manageSelectedRows(mockModalUUID, mockFormId, singleRow);

            expect(result).toEqual({
                [`${mockModalUUID}__${mockFormId}__SELECT`]: {
                    [SELECTED_ROWS_HOOK_NAME]: singleRow
                }
            });
        });
    });

    describe('selectRows', () => {
        it('should call manageSelectedRows with provided rows', () => {
            const manageSelectedRowsSpy = jest.spyOn(HookKeyManager, 'manageSelectedRows');

            HookKeyManager.selectRows(mockModalUUID, mockFormId, mockRows);

            expect(manageSelectedRowsSpy).toHaveBeenCalledWith(mockModalUUID, mockFormId, mockRows);
        });

        it('should return same result as manageSelectedRows', () => {
            const result = HookKeyManager.selectRows(mockModalUUID, mockFormId, mockRows);
            const expected = HookKeyManager.manageSelectedRows(mockModalUUID, mockFormId, mockRows);

            expect(result).toEqual(expected);
        });
    });

    describe('deselectAll', () => {
        it('should call manageSelectedRows with empty array', () => {
            const manageSelectedRowsSpy = jest.spyOn(HookKeyManager, 'manageSelectedRows');

            HookKeyManager.deselectAll(mockModalUUID, mockFormId);

            expect(manageSelectedRowsSpy).toHaveBeenCalledWith(mockModalUUID, mockFormId, []);
        });
    });

    describe('getSelectedRowsKey', () => {
        it('should generate correct key format', () => {
            const result = HookKeyManager.getSelectedRowsKey(mockModalUUID, mockFormId);

            expect(result).toBe('test-modal-123__form-456__SELECT');
        });

        it('should work with different UUIDs and form IDs', () => {
            const uuid = 'modal-789';
            const formId = 'form-abc';

            const result = HookKeyManager.getSelectedRowsKey(uuid, formId);

            expect(result).toBe('modal-789__form-abc__SELECT');
        });

        it('should generate consistent keys for same inputs', () => {
            const key1 = HookKeyManager.getSelectedRowsKey(mockModalUUID, mockFormId);
            const key2 = HookKeyManager.getSelectedRowsKey(mockModalUUID, mockFormId);

            expect(key1).toBe(key2);
        });
    });

    describe('integration with SELECTED_ROWS_HOOK_NAME constant', () => {

        it('should have correct constant value', () => {
            expect(typeof SELECTED_ROWS_HOOK_NAME).toBe('string');
            expect(SELECTED_ROWS_HOOK_NAME).toBeTruthy();
        });
    });

    describe('IRowData interface', () => {
        it('should enforce value and sourceValue structure', () => {
            const validRow: IRowData = {
                field1: { value: 'val1', sourceValue: 'src1' },
                field2: { value: 'val2', sourceValue: 'src2' }
            };

            expect(validRow.field1.value).toBe('val1');
            expect(validRow.field1.sourceValue).toBe('src1');
        });
    });
});