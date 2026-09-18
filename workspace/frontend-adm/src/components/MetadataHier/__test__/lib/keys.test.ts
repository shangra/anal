import { buildNodeKey, isRootNodeKey } from 'components/MetadataHier/lib/keys';

describe('buildNodeKey', () => {
    test('должен вернуть rawId как есть, если parentNodeKey отсутствует (null)', () => {
        expect(buildNodeKey(null, 'root-id')).toBe('root-id');
    });

    test('должен склеить parentNodeKey и rawId через "/"', () => {
        expect(buildNodeKey('root-id', 'child-1')).toBe('root-id/child-1');
    });

    test('должен корректно работать для многоуровневой вложенности (рекурсивное построение)', () => {
        const level1 = buildNodeKey(null, 'root');
        const level2 = buildNodeKey(level1, 'child');
        const level3 = buildNodeKey(level2, 'grandchild');
        expect(level3).toBe('root/child/grandchild');
    });

    test('должен вернуть rawId как есть при пустой строке parentNodeKey (falsy)', () => {
        expect(buildNodeKey('', 'child-1')).toBe('child-1');
    });
});

describe('isRootNodeKey', () => {
    test('должен вернуть true для ключа без "/"', () => {
        expect(isRootNodeKey('root-id')).toBe(true);
    });

    test('должен вернуть false для ключа с "/"', () => {
        expect(isRootNodeKey('root-id/child-1')).toBe(false);
    });

    test('должен вернуть false для глубоко вложенного ключа', () => {
        expect(isRootNodeKey('root-id/child-1/grandchild-1')).toBe(false);
    });
});
