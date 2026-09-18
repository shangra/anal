/*
Вот пример тестов для класса `MetaMultiFieldService`, написанных с использованием библиотеки Jest:


Эти тесты покрывают основные публичные методы класса `MetaMultiFieldService`. Для каждого метода создаются соответствующие мок-объекты и проверяется работа методов через ассерты. Тесты охватывают обработку композиционных полей, трансформацию атрибутов, условий фильтрации и значений, а также проверку синхронизации дерева объектов.
*/

const MetaMultiFieldService = require('./MetaMultiField.service');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();

describe('MetaMultiFieldService', () => {
    let service;

    beforeEach(() => {
        service = new MetaMultiFieldService();
    });

    describe('formAfter', () => {
        test('should modify form and push multiRef field', async () => {
            const innerResult = {
                form: [{ name: 'type', list: {} }],
            };
            const functionParams = {};

            const modifiedResult = await service.formAfter(
                innerResult,
                functionParams
            );

            expect(modifiedResult.form.some((f) => f.name === 'multiRef')).toBe(
                true
            );
        });
    });

    describe('findAllInner', () => {
        test('should correctly process composite fields', async () => {
            const innerResult = {};
            const functionParams = {
                connector: {},
                options: { where: {}, attributes: [], order: [], group: [] },
                table: '',
                this: { props: { id: '' } },
            };

            jest.spyOn(service, 'tableInfo').mockResolvedValueOnce({
                Refs: { field: { type: 'composite' } },
            });
            jest.spyOn(service, 'mutateWhere').mockReturnValueOnce({});
            jest.spyOn(service, 'mutateAttributes').mockReturnValueOnce([]);
            jest.spyOn(service, 'mutateOrder').mockReturnValueOnce([]);
            jest.spyOn(service, 'mutateGroup').mockReturnValueOnce([]);
            jest.spyOn(service, '#mk_fields_name2spec').mockReturnValueOnce({});
            jest.spyOn(service, 'transformRows').mockReturnValueOnce([]);

            const result = await service.findAllInner(
                innerResult,
                functionParams
            );

            expect(service.mutateWhere).toHaveBeenCalled();
            expect(service.mutateAttributes).toHaveBeenCalled();
            expect(service.mutateOrder).toHaveBeenCalled();
            expect(service.mutateGroup).toHaveBeenCalled();
            expect(service.transformRows).toHaveBeenCalled();
        });
    });

    describe('countInner', () => {
        test('should correctly process composite fields for counting', async () => {
            const innerResult = {};
            const functionParams = {
                connector: {},
                options: { where: {}, attributes: [], order: [] },
                table: '',
                this: { props: { id: '' } },
            };

            jest.spyOn(service, 'tableInfo').mockResolvedValueOnce({
                Refs: { field: { type: 'composite' } },
            });
            jest.spyOn(service, 'mutateWhere').mockReturnValueOnce({});
            jest.spyOn(service, 'mutateAttributes').mockReturnValueOnce([]);
            jest.spyOn(service, 'mutateOrder').mockReturnValueOnce([]);
            jest.spyOn(service, '#mk_fields_name2spec').mockReturnValueOnce({});

            const result = await service.countInner(
                innerResult,
                functionParams
            );

            expect(service.mutateWhere).toHaveBeenCalled();
            expect(service.mutateAttributes).toHaveBeenCalled();
            expect(service.mutateOrder).toHaveBeenCalled();
        });
    });

    describe('dataUpdateInner', () => {
        test('should update data with transformed values', async () => {
            const innerResult = {};
            const functionParams = {
                connector: {},
                table: '',
                values: {},
                options: { where: {}, transaction: {} },
                this: { props: { id: '', owner_id: '' } },
            };

            jest.spyOn(service, 'tableInfo').mockResolvedValueOnce({});
            jest.spyOn(Metadata, 'getItem').mockResolvedValueOnce({});
            jest.spyOn(service, 'mutateWhere').mockReturnValueOnce({});
            jest.spyOn(service, 'mutateValues').mockReturnValueOnce({});
            jest.spyOn(service, '#mk_fields_name2spec').mockReturnValueOnce({});

            const result = await service.dataUpdateInner(
                innerResult,
                functionParams
            );

            expect(service.mutateWhere).toHaveBeenCalled();
            expect(service.mutateValues).toHaveBeenCalled();
        });
    });

    describe('generateBodyAfter', () => {
        test('should transform body according to composite fields', async () => {
            const innerResult = {
                id: '',
                body: { field: { type: 0, value: 'test' } },
            };
            const functionParams = {
                id: '',
                body: {},
                tableInfo: { Fields: { field: { type: 'composite' } } },
            };

            const result = await service.generateBodyAfter(
                innerResult,
                functionParams
            );

            expect(result.body['field__type']).toEqual(0);
            expect(result.body['field__string']).toEqual('test');
        });
    });

    describe('hydrateTreeObject', () => {
        test('should hydrate tree object with synced fields', async () => {
            const innerResult = {};
            const functionParams = {
                treeObject: { Fields: { field: { type: 'composite' } } },
            };

            jest.spyOn(service, 'generateSyncField').mockResolvedValueOnce({});
            jest.spyOn(service, 'generateKeys').mockResolvedValueOnce({});

            const result = await service.hydrateTreeObject(
                innerResult,
                functionParams
            );

            expect(service.generateSyncField).toHaveBeenCalled();
            expect(service.generateKeys).toHaveBeenCalled();
        });
    });
});
