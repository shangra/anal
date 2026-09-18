/*
Вот пример тестов для указанного модуля с использованием библиотеки Jest:

Создайте файл `metaCopyInfofields.service.test.js` в директории `__tests__/tests/`:


Эти тесты покрывают основные методы класса `metaCopyInfofieldsService`. Они проверяют работу методов через мокирование зависимостей и проверку ожидаемого поведения каждого метода. Вы можете расширить этот набор тестов дополнительными кейсами в зависимости от специфики вашего приложения и требований к покрытию кода.
*/

const MetaCopyInfofieldsService = require('../../services/metaCopyInfofields.service');
const MetadataService = require('../../metadata-cmp/services/Metadata.service');

describe('MetaCopyInfofields Service', () => {
    let service;
    beforeEach(() => {
        service = new MetaCopyInfofieldsService();
    });

    test('formAfter should add a button to innerResult', async () => {
        const innerResult = { buttons: [] };
        const functionInput = { id: 'some-id' };
        
        const result = await service.formAfter(innerResult, functionInput);
        
        expect(result.buttons.length).toEqual(1);
        expect(result.buttons[0].name).toEqual('MetaCubeCopyInfofields');
    });
    
    test('setInfoservices should resolve with updated tree', async () => {
        jest.spyOn(service, 'setInfoFields').mockResolvedValue(undefined);

        const mData = { classInstance: {} };
        const id = 'some-id';
        const MeasuresObject = {};
        const DimensionsObject = {};

        const result = await service.setInfoservices(mData, id, MeasuresObject, DimensionsObject);

        expect(service.setInfoFields).toHaveBeenCalledTimes(2);
        expect(typeof result).toEqual('object');
    });

    test('copyfield should handle transaction and delegate to _copyfield', async () => {
        jest.spyOn(service, '_copyfield').mockResolvedValue({ result: 'new-tree' });

        const id = 'some-id';
        const body = {};

        const result = await service.copyfield(id, body);

        expect(service._copyfield).toHaveBeenCalledWith(id, body);
        expect(result.result).toEqual('new-tree');
    });

    test('_copyfield should process measures and dimensions correctly', async () => {
        jest.spyOn(MetadataService.prototype, 'getMetadata').mockResolvedValue({ children: [], classInstance: {}, treeObject: {} });
        jest.spyOn(service, 'create').mockResolvedValue(undefined);
        jest.spyOn(service, 'update').mockResolvedValue(undefined);
        jest.spyOn(service, 'clearDiff').mockResolvedValue(undefined);

        const id = 'some-id';
        const body = {};

        const result = await service._copyfield(id, body);

        expect(result.result).not.toBeNull();
    });

    test('parseTemplateCubes should generate correct cube template', () => {
        const Value = {
            InfoserviceInfo: { someKey: { name: 'Test Name', description: 'Test Description' }},
            data: { id: 'some-data-id'}
        };
        const InfoserviceKey = 'someKey';
        const newTree = {
            Infoservices: { someKey: { class_id: 'service-class-id'} },
            InfoservicesGUID: { someKey: { parentInfo: { id: 'parent-info-id'}}}
        };

        const template = service.parseTemplateCubes(Value, InfoserviceKey, newTree);

        expect(template.owner_id).toEqual('some-data-id');
        expect(template.class_id).toEqual('4bc0bfd0-6fb5-4f85-8668-117a42604ddc');
        expect(template.class).toEqual('InfoserviseList');
        expect(template.name).toEqual('Test Name');
        expect(template.description).toEqual('Test Description');
    });

    test('parseTemplateReports should generate correct report template', () => {
        const Value = {
            InfoserviceInfo: { someKey: { name: 'Test Name', description: 'Test Description' }},
            data: { id: 'some-data-id'}
        };
        const InfoserviceKey = 'someKey';
        const newTree = {
            Infoservices: { someKey: { class_id: 'service-class-id'} },
            InfoservicesGUID: { someKey: { parentInfo: { id: 'parent-info-id'}}}
        };

        const template = service.parseTemplateReports(Value, InfoserviceKey, newTree);

        expect(template.owner_id).toEqual('some-data-id');
        expect(template.class_id).toEqual('04ef8cae-65fe-4ad2-9e5f-121419c652ad');
        expect(template.class).toEqual('InfoserviseList');
        expect(template.name).toEqual('Test Name');
        expect(template.description).toEqual('Test Description');
    });

    test('updateOrCreateMetadataManifestWithoutId should update or create metadata based on conditions', async () => {
        const metadata = {
            owner_id: 'owner-id',
            class_id: 'class-id',
            class: 'class-name',
            name: 'metadata-name'
        };
        const searchWhere = { manifest: { [Op.like]: '%some-condition%' }};

        const oldMetaMock = { id: 'existing-meta-id'};
        jest.spyOn(MetadataService.prototype, 'getMetadataByOptions')
            .mockResolvedValueOnce([oldMetaMock]);

        const result = await service.updateOrCreateMetadataManifestWithoutId(metadata, searchWhere);

        expect(result).not.toBeNull();
    });
});
