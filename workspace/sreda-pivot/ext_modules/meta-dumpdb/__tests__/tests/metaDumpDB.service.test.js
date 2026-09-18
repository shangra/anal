/*
Вот пример тестов для класса `metaDumpDBService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/metaDumpDB.service.test.js` следующего содержания:


Эти тесты покрывают основные методы класса `metaDumpDBService` и проверяют их функциональность. Тесты используют мокирование зависимостей через `jest.mock()` для имитации поведения внешних сервисов.
*/

const metaDumpDBService = require('../../services/metaDumpDB.service');
const Metadata = require('../../metadata-cmp/services/Metadata.service');
const DumpDBService = require('../../dump-cms/services/DumpDB.service');

jest.mock('../../metadata-cmp/services/Metadata.service');
jest.mock('../../dump-cms/services/DumpDB.service');

describe('metaDumpDBService', () => {
    let service;
    
    beforeEach(() => {
        service = new metaDumpDBService();
    });

    describe('formAfterWithRefs', () => {
        test('добавляет кнопку с флагом withRef=true', async () => {
            const input = { id: 'some-id' };
            const initialResult = { buttons: [] };
            
            const result = await service.formAfterWithRefs(initialResult, input);

            expect(result.buttons.length).toEqual(1);
            expect(result.buttons[0]).toHaveProperty('props.withRef', true);
        });
    });

    describe('formAfter', () => {
        test('добавляет кнопку с флагом withRef=false', async () => {
            const input = { id: 'some-id' };
            const initialResult = { buttons: [] };
            
            const result = await service.formAfter(initialResult, input);

            expect(result.buttons.length).toEqual(1);
            expect(result.buttons[0]).toHaveProperty('props.withRef', false);
        });
    });

    describe('getButton', () => {
        test('возвращает объект кнопки с правильными свойствами', () => {
            const button = service.getButton('some-id');

            expect(button).toMatchObject({
                name: 'MetaDumpDB',
                component: 'MetaDumpDB',
                props: {
                    type: 'dump',
                    id: 'some-id',
                    withRef: false,
                    icon: 'bi bi-box-arrow-up'
                }
            });
        });
    });

    describe('getMetaList', () => {
        test('рекурсивно собирает ID всех дочерних объектов', async () => {
            const tree = {
                id: 'root',
                children: [
                    { id: 'child1' },
                    { id: 'child2', children: [{ id: 'grandchild1' }] }
                ]
            };

            const result = await service.getMetaList(tree);

            expect(result.sort()).toEqual(['root', 'child1', 'child2', 'grandchild1']);
        });
    });

    describe('getMetadataWithRefs', () => {
        test('корректно строит карту зависимых метаданных', async () => {
            Metadata.getMetadataByOptions.mockResolvedValue([
                { id: 'child1', class: 'Fields', manifest: '{"settings": {"ref": {"value": "ref1"}}}' },
                { id: 'child2', class: 'Infoservices', manifest: '{"settings": {"ref": {"value": "ref2"}}}' }
            ]);

            const result = await service.getMetadataWithRefs('parentId');

            expect(Object.keys(result)).toContain('parentId');
            expect(Object.keys(result)).toContain('child1');
            expect(Object.keys(result)).toContain('child2');
            expect(Object.keys(result)).toContain('ref1');
            expect(Object.keys(result)).toContain('ref2');
        });
    });

    describe('dumpWithRefs', () => {
        test('вызывает метод Dump с правильным набором параметров', async () => {
            service.getMetadataWithRefs.mockResolvedValue({ 'parent': true, 'child1': true, 'child2': true });
            DumpDBService.Dump.mockResolvedValue('dumped-data');

            const result = await service.dumpWithRefs('parent');

            expect(service.getMetadataWithRefs).toHaveBeenCalledWith('parent');
            expect(DumpDBService.Dump).toHaveBeenCalledWith({
                table: 'Metadata',
                where: { id: ['parent', 'child1', 'child2'] },
                withRls: true
            });

            expect(result).toEqual('dumped-data');
        });
    });

    describe('dumpdb', () => {
        test('вызывает метод Dump с правильным набором параметров', async () => {
            Metadata.getMetadata.mockResolvedValueOnce({ id: 'parent', children: [{ id: 'child1' }, { id: 'child2' }] });
            DumpDBService.Dump.mockResolvedValue('dumped-data');

            const result = await service.dumpdb('parent');

            expect(Metadata.getMetadata).toHaveBeenCalledWith('parent', {});
            expect(DumpDBService.Dump).toHaveBeenCalledWith({
                table: 'Metadata',
                where: { id: ['parent', 'child1', 'child2'] }
            });

            expect(result).toEqual('dumped-data');
        });
    });
});
