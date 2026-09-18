jest.mock('components/MetadataHier/lib/flatAdapter', () => ({
    buildFlatFromMap: jest.fn(() => [{ id: 'mocked' }]),
}));

import { buildFlatFromMap } from 'components/MetadataHier/lib/flatAdapter';
import { TreeDataCache } from 'components/MetadataHier/lib/treeMemo';
import type { TreeMap } from 'components/MetadataHier/types';

const mockedBuildFlatFromMap = buildFlatFromMap as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('TreeDataCache.getTreeData', () => {
    test('должен вернуть [] и не звать buildFlatFromMap, если rootId === null', () => {
        const cache = new TreeDataCache();
        const result = cache.getTreeData(null, new Map(), new Set(), new Set(), 0, 's');
        expect(result).toEqual([]);
        expect(mockedBuildFlatFromMap).not.toHaveBeenCalled();
    });

    test('должен вызвать buildFlatFromMap при первом вызове', () => {
        const cache = new TreeDataCache();
        const nodes: TreeMap = new Map();
        cache.getTreeData('root', nodes, new Set(), new Set(), 1, 's');
        expect(mockedBuildFlatFromMap).toHaveBeenCalledTimes(1);
    });

    test('должен вернуть закэшированный результат при повторном вызове с теми же rootId/version', () => {
        const cache = new TreeDataCache();
        const nodes: TreeMap = new Map();
        const first = cache.getTreeData('root', nodes, new Set(), new Set(), 1, 's');
        const second = cache.getTreeData('root', nodes, new Set(), new Set(), 1, 's');
        expect(mockedBuildFlatFromMap).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);
    });

    test('должен пересчитать данные при изменении version', () => {
        const cache = new TreeDataCache();
        cache.getTreeData('root', new Map(), new Set(), new Set(), 1, 's');
        cache.getTreeData('root', new Map(), new Set(), new Set(), 2, 's');
        expect(mockedBuildFlatFromMap).toHaveBeenCalledTimes(2);
    });

    test('должен пересчитать данные при изменении rootId', () => {
        const cache = new TreeDataCache();
        cache.getTreeData('root-1', new Map(), new Set(), new Set(), 1, 's');
        cache.getTreeData('root-2', new Map(), new Set(), new Set(), 1, 's');
        expect(mockedBuildFlatFromMap).toHaveBeenCalledTimes(2);
    });

    test('переход на rootId === null должен сбросить кэш (следующий непустой вызов — новый расчёт)', () => {
        const cache = new TreeDataCache();
        cache.getTreeData('root', new Map(), new Set(), new Set(), 1, 's');
        cache.getTreeData(null, new Map(), new Set(), new Set(), 1, 's');
        cache.getTreeData('root', new Map(), new Set(), new Set(), 1, 's');
        expect(mockedBuildFlatFromMap).toHaveBeenCalledTimes(2);
    });
});

describe('TreeDataCache.reset', () => {
    test('должен сбросить кэш — следующий вызов с теми же параметрами пересчитывает данные', () => {
        const cache = new TreeDataCache();
        cache.getTreeData('root', new Map(), new Set(), new Set(), 1, 's');
        cache.reset();
        cache.getTreeData('root', new Map(), new Set(), new Set(), 1, 's');
        expect(mockedBuildFlatFromMap).toHaveBeenCalledTimes(2);
    });
});
