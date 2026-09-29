import {
    getTableConfigKey,
    flattenColumnConfig,
    syncColumnConfigs,
    normalizeFlatConfig,
} from '../../utils/columnConfig';
import type { IColumnConfig, IMergedColumns } from '../../types';

describe('columnConfig utils', () => {
    describe('getTableConfigKey', () => {
        test('should generate correct config key', () => {
            const result = getTableConfigKey('form123', 'myList');
            expect(result).toBe('table_columns_form123_myList');
        });

        test('should handle empty strings', () => {
            const result = getTableConfigKey('', '');
            expect(result).toBe('table_columns__');
        });

        test('should handle special characters', () => {
            const result = getTableConfigKey('form-123_test', 'list@name');
            expect(result).toBe('table_columns_form-123_test_list@name');
        });
    });

    describe('flattenColumnConfig', () => {
        test('should flatten single column configs', () => {
            const config: (IColumnConfig | IColumnConfig[])[] = [
                { width: 100, resizable: true },
                { width: 200, resizable: false },
            ];

            const result = flattenColumnConfig(config);

            expect(result).toHaveLength(2);
            expect((result[0] as IColumnConfig).width).toBe(100);
            expect((result[1] as IColumnConfig).width).toBe(200);
        });

        test('should flatten grouped column configs', () => {
            const config: (IColumnConfig | IColumnConfig[])[] = [
                [
                    { width: 100, resizable: true },
                    { width: 200, resizable: false },
                ],
                { width: 300, resizable: true },
            ];

            const result = flattenColumnConfig(config);

            expect(result).toHaveLength(3);
            expect((result[0] as IColumnConfig).width).toBe(100);
            expect((result[1] as IColumnConfig).width).toBe(200);
            expect((result[2] as IColumnConfig).width).toBe(300);
        });

        test('should handle empty array', () => {
            const result = flattenColumnConfig([]);
            expect(result).toEqual([]);
        });

        test('should handle all grouped columns', () => {
            const config: (IColumnConfig | IColumnConfig[])[] = [
                [{ width: 100 }, { width: 200 }],
                [{ width: 300 }, { width: 400 }],
            ];

            const result = flattenColumnConfig(config);

            expect(result).toHaveLength(4);
        });
    });

    describe('syncColumnConfigs', () => {
        test('should sync widths from saved config', () => {
            const currentConfig: IColumnConfig[] = [
                { width: 100, resizable: true },
                { width: 100, resizable: true },
            ];
            const savedConfig: IColumnConfig[] = [
                { width: 200, resizable: false },
                { width: 300, resizable: false },
            ];

            syncColumnConfigs(currentConfig, savedConfig);

            expect(currentConfig[0].width).toBe(200);
            expect(currentConfig[1].width).toBe(300);
            expect(currentConfig[0].resizable).toBe(false);
            expect(currentConfig[1].resizable).toBe(false);
        });

        test('should sync grouped columns', () => {
            const currentConfig: (IColumnConfig | IColumnConfig[])[] = [
                [
                    { width: 100, resizable: true },
                    { width: 100, resizable: true },
                ],
            ];
            const savedConfig: (IColumnConfig | IColumnConfig[])[] = [
                [
                    { width: 250, resizable: false },
                    { width: 350, resizable: false },
                ],
            ];

            syncColumnConfigs(currentConfig, savedConfig);

            expect(currentConfig[0]).toHaveLength(2);
            expect((currentConfig[0] as IColumnConfig[])[0].width).toBe(250);
            expect((currentConfig[0] as IColumnConfig[])[1].width).toBe(350);
        });

        test('should skip missing indices', () => {
            const currentConfig: IColumnConfig[] = [
                { width: 100, resizable: true },
            ];
            const savedConfig: IColumnConfig[] = [
                { width: 200, resizable: false },
                { width: 300, resizable: false },
            ];

            syncColumnConfigs(currentConfig, savedConfig);

            expect(currentConfig[0].width).toBe(200);
        });

        test('should not modify current if saved is empty', () => {
            const currentConfig: IColumnConfig[] = [
                { width: 100, resizable: true },
            ];
            const savedConfig: IColumnConfig[] = [];

            syncColumnConfigs(currentConfig, savedConfig);

            expect(currentConfig[0].width).toBe(100);
        });
    });

    describe('normalizeFlatConfig', () => {
        test('should handle hierarchy column', () => {
            const flatConfig: IColumnConfig[] = [
                { width: 100, resizable: true },
            ];
            const mergedColumns: IMergedColumns = {};

            const result = normalizeFlatConfig(flatConfig, mergedColumns, true);

            expect(result).toHaveLength(2);
            // First element is hierarchy column
            expect(Array.isArray(result[0])).toBe(false);
            expect((result[0] as IColumnConfig).width).toBe(150);
            expect((result[0] as IColumnConfig).resizable).toBe(false);
        });

        test('should not add hierarchy when hasHierarchy is false', () => {
            const flatConfig: IColumnConfig[] = [
                { width: 100, resizable: true },
            ];
            const mergedColumns: IMergedColumns = {};

            const result = normalizeFlatConfig(flatConfig, mergedColumns, false);

            expect(result).toHaveLength(1);
            expect((result[0] as IColumnConfig).width).toBe(100);
        });

        test('should group columns based on mergedColumns', () => {
            const flatConfig: IColumnConfig[] = [
                { width: 100 },
                { width: 200 },
                { width: 300 },
            ];
            const mergedColumns: IMergedColumns = {
                'group-1': {
                    sourceFields: ['col1', 'col2'],
                },
            };

            const result = normalizeFlatConfig(flatConfig, mergedColumns, false);

            expect(result).toHaveLength(2);
            // First is a group
            expect(Array.isArray(result[0])).toBe(true);
            expect((result[0] as IColumnConfig[])).toHaveLength(2);
            // Second is flat
            expect(Array.isArray(result[1])).toBe(false);
        });

        test('should use fallback config when flatConfig is too short', () => {
            const flatConfig: IColumnConfig[] = [
                { width: 100 },
            ];
            const mergedColumns: IMergedColumns = {
                'group-1': {
                    sourceFields: ['col1', 'col2', 'col3'],
                },
            };

            const result = normalizeFlatConfig(flatConfig, mergedColumns, false);

            expect(Array.isArray(result[0])).toBe(true);
            const group = result[0] as IColumnConfig[];
            expect(group).toHaveLength(3);
            // Missing configs should have fallback values
            expect(group[1].width).toBe(200);
            expect(group[1].resizable).toBe(true);
        });

        test('should append remaining columns after groups', () => {
            const flatConfig: IColumnConfig[] = [
                { width: 100 },
                { width: 200 },
                { width: 300 },
                { width: 400 },
            ];
            const mergedColumns: IMergedColumns = {
                'group-1': {
                    sourceFields: ['col1', 'col2'],
                },
            };

            const result = normalizeFlatConfig(flatConfig, mergedColumns, false);

            expect(result).toHaveLength(3);
            // Group + 2 remaining flat columns
            expect(Array.isArray(result[0])).toBe(true);
            expect((result[1] as IColumnConfig).width).toBe(300);
            expect((result[2] as IColumnConfig).width).toBe(400);
        });

        test('should handle empty config', () => {
            const flatConfig: IColumnConfig[] = [];
            const mergedColumns: IMergedColumns = {};

            const result = normalizeFlatConfig(flatConfig, mergedColumns, false);

            expect(result).toEqual([]);
        });

        test('should handle empty mergedColumns', () => {
            const flatConfig: IColumnConfig[] = [
                { width: 100 },
                { width: 200 },
            ];
            const mergedColumns: IMergedColumns = {};

            const result = normalizeFlatConfig(flatConfig, mergedColumns, false);

            expect(result).toHaveLength(2);
            expect((result[0] as IColumnConfig).width).toBe(100);
            expect((result[1] as IColumnConfig).width).toBe(200);
        });
    });
});
