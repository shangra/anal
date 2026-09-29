const {
    restrictAttributesToTable,
    attributeHasPhysicalColumn,
    sanitizeWhere,
    sanitizeOrder,
    applyPhysicalColumnsToOptions,
} = require('../../services/metadata/shared/tabularAttributes');

describe('tabularAttributes', () => {
    test('drops sys fields missing in table and keeps composite logical names', async () => {
        const existing = new Set([
            'owner',
            'rank',
            'condition',
            'formula__type',
            'formula__value',
        ]);

        expect(attributeHasPhysicalColumn('id', existing)).toBe(false);
        expect(attributeHasPhysicalColumn('formula', existing)).toBe(true);
        expect(attributeHasPhysicalColumn('owner', existing)).toBe(true);

        const connector = {
            settings: { schema: 'public' },
            introspectColumns: jest.fn(async () => ({
                owner: { name: 'owner', type: 'uuid' },
                rank: { name: 'rank', type: 'integer' },
                condition: { name: 'condition', type: 'text' },
                formula__type: { name: 'formula__type', type: 'integer' },
                formula__value: { name: 'formula__value', type: 'text' },
            })),
        };

        const result = await restrictAttributesToTable(
            connector,
            'deviations_сalculation',
            ['id', 'code', 'createdAt', 'owner', 'rank', 'condition', 'formula']
        );

        expect(connector.introspectColumns).toHaveBeenCalledWith(
            'deviations_сalculation',
            'public'
        );
        expect(result).toEqual(['owner', 'rank', 'condition', 'formula']);
    });

    test('strips owner/rank from where and order when columns are missing', () => {
        const existing = new Set(['condition', 'formula']);
        expect(sanitizeWhere({ owner: 'abc' }, existing)).toEqual({});
        expect(sanitizeOrder([['rank', 'ASC']], existing)).toEqual([]);

        const next = applyPhysicalColumnsToOptions(
            {
                attributes: ['id', 'owner', 'rank', 'condition', 'formula'],
                where: { owner: '6517a1a2-08f4-47eb-a7bd-655dd2fcd11f' },
                order: [['rank', 'ASC']],
            },
            existing
        );

        expect(next.attributes).toEqual(['condition', 'formula']);
        expect(next.where).toEqual({});
        expect(next.order).toBeUndefined();
    });
});
