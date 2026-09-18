import { transformRowsForHook } from "components/MetadataForms/ElementsList/ReactWindowWrapperCombined/utils/transformRowsForHook";

describe('transformRowsForHook', () => {
    it('should transform rows preserving original types', () => {
        const input: any = [
            {
                "name": "Документ ДЗО 8731",
                "date": "2025-07-04T00:00:00.000",
                "code": 9731,
                "markdel": false,
                "document_name": null,
                "foundation": { "value": null },
                "id": "69aef6c1-9303-4af7-8ed2-37ffc01675f2"
            }
        ];

        const result = transformRowsForHook(input);

        expect(result).toEqual([
            {
                name: { value: "Документ ДЗО 8731", sourceValue: "Документ ДЗО 8731" },
                date: { value: "2025-07-04T00:00:00.000", sourceValue: "2025-07-04T00:00:00.000" },
                code: { value: 9731, sourceValue: 9731 },
                markdel: { value: false, sourceValue: false },
                document_name: { value: null, sourceValue: null },
                foundation: { value: { value: null }, sourceValue: { value: null } },
                id: { value: "69aef6c1-9303-4af7-8ed2-37ffc01675f2", sourceValue: "69aef6c1-9303-4af7-8ed2-37ffc01675f2" }
            }
        ]);
    });

    it('should handle multiple rows correctly', () => {
        const input: any = [
            {
                "name": "Документ 1",
                "code": 1001,
                "markdel": true,
                "foundation": { "value": "some-id" }
            },
            {
                "name": "Документ 2",
                "code": 1002,
                "markdel": false,
                "foundation": { "value": null }
            }
        ];

        const result = transformRowsForHook(input);

        expect(result).toEqual([
            {
                name: { value: "Документ 1", sourceValue: "Документ 1" },
                code: { value: 1001, sourceValue: 1001 },
                markdel: { value: true, sourceValue: true },
                foundation: { value: { value: "some-id" }, sourceValue: { value: "some-id" } }
            },
            {
                name: { value: "Документ 2", sourceValue: "Документ 2" },
                code: { value: 1002, sourceValue: 1002 },
                markdel: { value: false, sourceValue: false },
                foundation: { value: { value: null }, sourceValue: { value: null } }
            }
        ]);
    });

    it('should preserve all data types without conversion', () => {
        const input: any = [
            {
                string: "text",
                number: 123.45,
                booleanTrue: true,
                booleanFalse: false,
                nullValue: null,
                object: { value: "nested", other: "field" },
                nestedNull: { value: null }
            }
        ];

        const result = transformRowsForHook(input);

        expect(result[0].string.value).toBe("text");
        expect(result[0].number.value).toBe(123.45);
        expect(result[0].booleanTrue.value).toBe(true);
        expect(result[0].booleanFalse.value).toBe(false);
        expect(result[0].nullValue.value).toBeNull();
        expect(result[0].object.value).toEqual({ value: "nested", other: "field" });
        expect(result[0].nestedNull.value).toEqual({ value: null });
    });
});

