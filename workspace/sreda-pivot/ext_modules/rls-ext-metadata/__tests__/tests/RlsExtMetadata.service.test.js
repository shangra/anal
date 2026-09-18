/*
Вот пример тестов для модуля `RlsExtMetadataService` с использованием библиотеки Jest:

Создайте файл `__tests__/tests/RlsExtMetadata.service.test.js` следующего содержания:


Эти тесты покрывают основные методы класса `RlsExtMetadataService` и проверяют их функциональность в различных сценариях.
*/

const RlsExtMetadataService = require('../../services/RlsExtMetadata.service');
const RlsCoreServiceClass = require('../../rls-core/services/RlsCore.service');
const MetadataServiceClass = require('../../metadata-cmp/services/Metadata.service');
const ApiError = require('../../../core/exceptions/ApiError');

jest.mock('../../rls-core/services/RlsCore.service');
jest.mock('../../metadata-cmp/services/Metadata.service');

describe('RlsExtMetadataService', () => {
    let service;
    beforeEach(() => {
        service = new RlsExtMetadataService();
    });

    describe('createMetadataAfter', () => {
        test('should add parent permissions and return innerResult', async () => {
            const innerResult = { parent: 'parent-id', id: 'child-id' };
            jest.spyOn(RlsCoreServiceClass.prototype, 'addParentPermissionsNested').mockResolvedValueOnce();
            
            const result = await service.createMetadataAfter(innerResult);
            
            expect(result).toEqual(innerResult);
            expect(RlsCoreServiceClass.prototype.addParentPermissionsNested).toHaveBeenCalledWith(
                'parent-id',
                'child-id',
                'metadata',
                expect.any(Object)
            );
        });
    });

    describe('addMetadataBefore', () => {
        test('should check access write for metadata', async () => {
            const innerResult = {};
            const functionParams = { metadata: { owner_id: 'metadata-id' } };
            jest.spyOn(RlsCoreServiceClass.prototype, 'checkAccessWrite').mockResolvedValueOnce();
            
            const result = await service.addMetadataBefore(innerResult, functionParams);
            
            expect(result).toEqual(innerResult);
            expect(RlsCoreServiceClass.prototype.checkAccessWrite).toHaveBeenCalledWith('Metadata', 'metadata-id');
        });
    });

    describe('extendChildrenGetter', () => {
        test('should extend children getter with correct method', async () => {
            const innerResult = {};
            const functionParams = { table_name: 'metadata', this: {} };
            
            const result = await service.extendChildrenGetter(innerResult, functionParams);
            
            expect(result).toEqual(innerResult);
            expect(functionParams.this.childrenGetters['metadata']).toBeDefined();
            expect(functionParams.this.childrenGetters['metadata'].binded).toBe(MetadataServiceClass);
        });
        
        test('should throw error when method already exists', async () => {
            const innerResult = {};
            const functionParams = { table_name: 'metadata', this: { childrenGetters: { metadata: { binded: 'other-service' } } } };
            
            await expect(service.extendChildrenGetter(innerResult, functionParams))
                .rejects.toThrow(ApiError.BadRequest(`Ошибка при расширении childrenGetters, добавляемый метод уже определен (metadata)`));
        });
    });

    describe('setMapping', () => {
        test('should merge mappings correctly', async () => {
            const innerResult = {};
            const functionParams = { this: { mapping: { existingKey: 'existingValue' } } };
            
            const result = await service.setMapping(innerResult, functionParams);
            
            expect(result).toEqual(innerResult);
            expect(functionParams.this.mapping).toEqual({
                existingKey: 'existingValue',
                metadata: 'Metadata'
            });
        });
    });
});
