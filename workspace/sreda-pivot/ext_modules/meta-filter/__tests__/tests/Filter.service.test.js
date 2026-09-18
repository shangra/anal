/*
Вот пример тестов для класса `FilterService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/Filter.service.test.js` следующего содержания:


Эти тесты покрывают основные публичные методы класса `FilterService`: `getLevels`, `filter`, `parseRows`, `generateILikeSQL`, `getLevelParams`, `addChildren`. Они используют мокинг зависимостей через Jest для изоляции тестирования каждого метода.
*/

const FilterService = require('../../services/Filter.service');
const MetadataService = require('../../metadata-cmp/services/Metadata.service');
const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');

jest.mock('../../metadata-cmp/services/Metadata.service');
jest.mock('../../metadata-connector/services/metadata/Connector.class');

describe('Filter Service', () => {
    let service;
    
    beforeEach(() => {
        service = new FilterService();
        
        // Mocking dependencies
        MetadataService.getParentInstance.mockResolvedValue({
            getItem: jest.fn(),
            tableInfo: jest.fn()
        });
        
        ConnectorClass.mockImplementation(() => ({
            getConnector: jest.fn().mockResolvedValue({
                connector: {
                    findSQL: jest.fn(),
                    findAll: jest.fn(),
                    generateRecursive: jest.fn(),
                    union: jest.fn(),
                    generateFrom: jest.fn()
                },
                connectorData: {}
            })
        }));
    });

    test('should get levels correctly', async () => {
        const id = 'some-id';
        const expectedResponse = [{ level: 0, name: 'Уровень 1', description: 'Уровень 1' }];

        MetadataService.getParentInstance.mockResolvedValueOnce({
            getItem: jest.fn().mockResolvedValue({ manifest: { settings: { hierarchy: true } } }),
            tableInfo: jest.fn().mockResolvedValue({})
        });

        const response = await service.getLevels(id);
        expect(response).toEqual(expectedResponse);
    });

    test('should filter items correctly', async () => {
        const data = {
            id: 'some-id',
            level: 1,
            parent: 'parent-id',
            name: 'search-term',
            where: {},
            limit: 10,
            offset: 0
        };

        const expectedResponse = [{ id: 'child-id', name: 'Child Name', children: [] }];

        MetadataService.getParentInstance.mockResolvedValueOnce({
            getItem: jest.fn().mockResolvedValue({}),
            tableInfo: jest.fn().mockResolvedValue({}),
            getHierarchySettings: jest.fn().mockResolvedValue({})
        });

        const response = await service.filter(data);
        expect(response).toEqual(expectedResponse);
    });

    test('parseRows should handle empty input', () => {
        const rows = [];
        const parsed = service.parseRows(rows);
        expect(parsed).toBeNull();
    });

    test('parseRows should map and structure rows properly', () => {
        const rows = [{
            _path: ['root', 'child'],
            _v: ['Root Name', 'Child Name']
        }];

        const expectedParsed = [{ id: 'root', name: 'Root Name', children: [{ id: 'child', name: 'Child Name', children: [] }] }];

        const parsed = service.parseRows(rows);
        expect(parsed).toEqual(expectedParsed);
    });

    test('generateILikeSQL should create correct SQL structure', async () => {
        const params = {
            id: 'some-id',
            from: { table: 'original_table' },
            levelMeta: { start: 1, end: 3 },
            connector: {},
            options: { where: {}, hierarchy: true },
            parentField: 'parent_field',
            primaryKey: 'pk_field',
            viewKey: 'view_key',
            fieldhierarchydefault: {}
        };

        const result = await service.generateILikeSQL(params);
        expect(result).toHaveProperty('alias');
        expect(result).toHaveProperty('table');
    });

    test('getLevelParams should calculate proper slice values', () => {
        const result = service.getLevelParams('parent-id', 'search-term', 2);
        expect(result.start).toBe(3);
        expect(result.end).toBe(3);
    });

    test('addChildren should initialize children array', () => {
        const rows = [{ id: 'row1', name: 'Row One' }, { id: 'row2', name: 'Row Two' }];
        const processed = service.addChildren(rows);
        expect(processed.every(row => Array.isArray(row.children))).toBe(true);
    });
});
