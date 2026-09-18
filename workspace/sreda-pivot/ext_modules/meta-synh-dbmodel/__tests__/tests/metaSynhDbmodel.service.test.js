/*
Вот пример тестов для класса `metaSynhDbmodelService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/metaSynhDbmodel.service.test.js` следующего содержания:


Эти тесты покрывают основные методы вашего сервиса и проверяют их функциональность. Вы можете добавлять дополнительные проверки и сценарии тестирования в зависимости от специфики вашего приложения и требований к покрытию кода.
*/

const MetaSynhDbmodelService = require('../../services/metaSynhDbmodel.service');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const MetadataDBModel = require('../../metadata-cmp/services/model/MetadataDB.model');

jest.mock('../../metadata-cmp/services/Metadata.service');
jest.mock('../../metadata-cmp/services/model/MetadataDB.model');

describe('MetaSynhDbmodelService', () => {
    let service;

    beforeAll(() => {
        service = new MetaSynhDbmodelService();
    });

    describe('formAfter', () => {
        test('should add button to innerResult', async () => {
            const innerResult = {};
            const functionInput = { id: 'some-id' };
            const expectedButton = {
                name: 'MetaSynhDBModel',
                component: 'MetaSynhDBModel',
                props: {
                    icon: 'bi bi-repeat',
                    type: 'update',
                    server: global.env.ESB_NAME || '',
                    service: `metadata/metasynhdbmodel/synch/${functionInput.id}`,
                    title: 'Синхронизировать объект метаданных',
                },
            };

            const result = await service.formAfter(innerResult, functionInput);

            expect(result.buttons).toContainEqual(expectedButton);
        });
    });

    describe('dropMetadata', () => {
        test('should remove metadata and its children', async () => {
            const id = 'some-id';
            const allChildren = [{ id: 'child1' }, { id: 'child2' }];

            jest.spyOn(MetadataDBModel, 'getMetadataChildren').mockResolvedValueOnce(allChildren);
            jest.spyOn(MetadataDBModel, 'del').mockResolvedValue(true);

            const result = await service.dropMetadata(id);

            expect(MetadataDBModel.getMetadataChildren).toHaveBeenCalledWith(id);
            expect(MetadataDBModel.del).toHaveBeenCalledTimes(3);
            expect(result).toBeTruthy();
        });
    });

    describe('synchMetadata', () => {
        test('should synchronize metadata with database', async () => {
            const id = 'some-id';
            const allChildren = [{ id: 'child1' }, { id: 'child2' }];

            jest.spyOn(Metadata, 'getMetadataChildren').mockResolvedValueOnce(allChildren);
            jest.spyOn(MetadataDBModel, 'del').mockResolvedValue(true);
            jest.spyOn(MetadataDBModel, 'synchDataModel').mockResolvedValue(true);

            const result = await service.synchMetadata(id);

            expect(Metadata.getMetadataChildren).toHaveBeenCalledWith(id);
            expect(MetadataDBModel.del).toHaveBeenCalled();
            expect(MetadataDBModel.synchDataModel).toHaveBeenCalled();
            expect(result).toBeTruthy();
        });
    });

    describe('diffField', () => {
        test('should compare two fields correctly', async () => {
            const fieldNew = { field: 'f1', type: 'int', len: 10, increment: false, notnull: true };
            const fieldOld = { field: 'f1', type: 'int', len: 10, increment: false, notnull: true };

            const result = await service.diffField(fieldNew, fieldOld);

            expect(result).toBe(true);
        });

        test('should detect differences between fields', async () => {
            const fieldNew = { field: 'f1', type: 'varchar', len: 50, increment: false, notnull: true };
            const fieldOld = { field: 'f1', type: 'int', len: 10, increment: false, notnull: true };

            const result = await service.diffField(fieldNew, fieldOld);

            expect(result).toBe(false);
        });
    });

    describe('hydrateTreeObject', () => {
        test('should return same tree object without modifications', async () => {
            const treeObject = { someKey: 'someValue' };

            const result = await service.hydrateTreeObject(treeObject);

            expect(result).toEqual(treeObject);
        });
    });

    describe('metadataDeleteAfter', () => {
        test('should handle deletion of metadata and related records', async () => {
            const innerResult = {};
            const functionInput = { id: 'some-id' };
            const children = [{ id: 'child1' }, { id: 'child2' }];

            jest.spyOn(MetadataDBModel, 'getChild').mockResolvedValueOnce(children);
            jest.spyOn(MetadataDBModel, 'del').mockResolvedValue(true);

            const result = await service.metadataDeleteAfter(innerResult, functionInput);

            expect(MetadataDBModel.getChild).toHaveBeenCalledWith(functionInput.id);
            expect(MetadataDBModel.del).toHaveBeenCalledTimes(3);
            expect(result).toEqual(innerResult);
        });
    });

    describe('getMeta', () => {
        test('should retrieve metadata information successfully', async () => {
            const id = 'some-id';
            const data = { manifest: { settings: { table: 'main_table' } } };

            jest.spyOn(service, 'getMetadata').mockResolvedValueOnce(data);
            jest.spyOn(service, 'getConnector').mockResolvedValueOnce({ connector: {} });

            const result = await service.getMeta({ meta: Metadata, id, throwError: true });

            expect(service.getMetadata).toHaveBeenCalledWith(id, { MetadataModel: Metadata.MetadataModel, instance: true });
            expect(service.getConnector).toHaveBeenCalledWith(data);
            expect(result.tables['main_table']).toEqual({});
            expect(result.allTables).toContain('main_table');
        });
    });

    describe('getConnector', () => {
        test('should retrieve connector information based on provided ID', async () => {
            const item = { manifest: { settings: { connector: 'conn_id' } } };
            const ConnectorClassMock = { getConnector: jest.fn().mockResolvedValue({ connector: {}, connectorData: {} }) };

            jest.mock('../../metadata-connector/services/metadata/Connector.class', () => ConnectorClassMock);

            const result = await service.getConnector(item);

            expect(ConnectorClassMock.getConnector).toHaveBeenCalledWith('conn_id');
            expect(result.connector).toEqual({});
            expect(result.connectorData).toEqual({});
        });
    });
});
