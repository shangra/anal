/*
Вот пример тестов для класса `SchemaService` с использованием библиотеки Jest:


Эти тесты покрывают основные методы класса `SchemaService`. Они проверяют взаимодействие с зависимыми сервисами, обработку параметров и возврат ожидаемых результатов.
*/

const SchemaService = require('../../services/SchemasManager.service');
const ServiceClass = require('../../metadata-guide/services/Guide.service');
jest.mock('../../metadata-guide/services/Guide.service');

describe('SchemaService', () => {
    let service;
    
    beforeEach(() => {
        service = new SchemaService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllSchemas', () => {
        test('should return schemas for given owner', async () => {
            const ownerId = 'owner-id';
            const expectedResult = [{ id: 'schema-1' }, { id: 'schema-2' }];
            
            ServiceClass.prototype.read.mockResolvedValue(expectedResult);

            const result = await service.getAllSchemas(ownerId);

            expect(ServiceClass.prototype.read).toHaveBeenCalledWith(GUID_ID, {
                attributes: ['id', 'name', 'standart_schema', 'createdUser'],
                where: { schema_owner: ownerId, markdel: false }
            });
            expect(result).toEqual(expectedResult);
        });
    });

    describe('getSchema', () => {
        test('should return single schema with permissions check', async () => {
            const ownerId = 'owner-id';
            const schemaId = 'schema-id';
            const expectedForAll = [];
            const expectedMetadata = [{ id: schemaId, name: 'Test Schema' }];

            ServiceClass.prototype.read.mockResolvedValue(expectedMetadata);
            RlsCoreService.getPermissions.mockResolvedValue(expectedForAll);

            const result = await service.getSchema(ownerId, schemaId);

            expect(RlsCoreService.getPermissions).toHaveBeenCalledWith(TABLE_NAME, schemaId, 'rules', 'view', READALL_ID);
            expect(ServiceClass.prototype.read).toHaveBeenCalledWith(GUID_ID, {
                attributes: ['name', 'standart_schema', 'schema', 'snapshot', 'createdUser'],
                where: { id: schemaId, schema_owner: ownerId, markdel: false }
            });
            expect(result).toEqual([{ id: schemaId, name: 'Test Schema', forAll: false }]);
        });
    });

    describe('editSchema', () => {
        test('should update existing schema and handle permissions correctly', async () => {
            const ownerId = 'owner-id';
            const schemaId = 'schema-id';
            const shemaInfo = { name: 'Updated Name', forAll: true };
            const schema = { key: 'value' };
            const snapshot = { snapKey: 'snapVal' };

            ServiceClass.prototype.update.mockResolvedValue({ success: true });

            const result = await service.editSchema(ownerId, schemaId, shemaInfo, schema, snapshot);

            expect(ServiceClass.prototype.update).toHaveBeenCalledWith(GUID_ID, {
                id: schemaId,
                schema_owner: ownerId,
                name: shemaInfo.name,
                standart_schema: shemaInfo.standart || false,
                schema: schema ? schema : null,
                snapshot: snapshot ? snapshot : null
            });
            expect(service.createPermissionReadAll).toHaveBeenCalledWith(schemaId);
            expect(result).toEqual({ success: true });
        });
    });

    describe('createSchema', () => {
        test('should create a new schema and assign appropriate permissions', async () => {
            const ownerId = 'owner-id';
            const shemaInfo = { name: 'New Schema', forAll: true };
            const schema = { key: 'value' };
            const snapshot = { snapKey: 'snapVal' };
            const userId = 'user-id';

            ServiceClass.prototype.create.mockResolvedValue({
                data: { id: 'new-schema-id' }
            });

            const result = await service.createSchema(ownerId, shemaInfo, schema, snapshot, userId);

            expect(ServiceClass.prototype.create).toHaveBeenCalledWith(GUID_ID, {
                schema_owner: ownerId,
                name: shemaInfo.name,
                standart_schema: shemaInfo.standart || false,
                schema: schema ? schema : null,
                snapshot: snapshot ? snapshot : null
            }, { customRls: true });

            expect(service.createPermissions).toHaveBeenCalledWith('new-schema-id', userId, 'write');
            expect(service.createPermissionReadAll).toHaveBeenCalledWith('new-schema-id');
            expect(result).toEqual({
                data: { id: 'new-schema-id' }
            });
        });
    });

    describe('delSchema', () => {
        test('should delete an existing schema', async () => {
            const ownerId = 'owner-id';
            const schemaId = 'schema-id';

            ServiceClass.prototype.delete.mockResolvedValue({ success: true });

            const result = await service.delSchema(ownerId, schemaId);

            expect(ServiceClass.prototype.delete).toHaveBeenCalledWith(GUID_ID, {
                id: schemaId,
                schema_owner: ownerId
            });
            expect(result).toEqual({ success: true });
        });
    });

    describe('setPermissions', () => {
        test('should set permissions only for schema owner', async () => {
            const ownerId = 'owner-id';
            const schemaId = 'schema-id';
            const user_id = 'user-id';
            const typePermission = 'read';

            const sessionStorageMock = { user: { id: ownerId } };
            httpContext.get.mockReturnValue(sessionStorageMock);

            const metadataResponse = { rows: [{ createdUser: ownerId }] };
            ServiceClass.prototype.read.mockResolvedValue(metadataResponse);

            const result = await service.setPermissions(ownerId, schemaId, user_id, typePermission);

            expect(httpContext.get).toHaveBeenCalledWith('sessionStorage');
            expect(ServiceClass.prototype.read).toHaveBeenCalledWith(ownerId, schemaId);
            expect(service.createPermissions).toHaveBeenCalledWith(schemaId, user_id, typePermission);
            expect(result).toEqual({ result: true });
        });
    });

    describe('deleleAllPermission', () => {
        test('should remove all permissions from specified schema and user', async () => {
            const schemaId = 'schema-id';
            const user_id = 'user-id';

            await service.deleleAllPermission(schemaId, user_id);

            expect(RlsCoreService.delPermissionNested).toHaveBeenCalledTimes(3);
            expect(RlsCoreService.delPermissionNested).toHaveBeenNthCalledWith(1, 'PivotSchemas', schemaId, 'read', 'users', user_id);
            expect(RlsCoreService.delPermissionNested).toHaveBeenNthCalledWith(2, 'PivotSchemas', schemaId, 'view', 'users', user_id);
            expect(RlsCoreService.delPermissionNested).toHaveBeenNthCalledWith(3, 'PivotSchemas', schemaId, 'write', 'users', user_id);
        });
    });
});
