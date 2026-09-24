const httpContext = require('../../../core/services/http-context');

const Extensions = require('../../../core/class/Extensions.class');
const ServiceClass = require('../../metadata-guide/services/Guide.service');
const Service = new ServiceClass();
const RlsCoreServiceClass = require('../../rls-core/services/RlsCore.service');
const RlsCoreService = new RlsCoreServiceClass();
const { GUID_ID, ADMINISTRATOR_ID, READALL_ID, TABLE_NAME } = require('../constants');

function asText(value) {
    if (value == null) {
        return null;
    }
    if (typeof value === 'string') {
        return value;
    }
    return JSON.stringify(value);
}

class SchemaService extends Extensions {
    async getAllSchemas(ownerId) {
        // ../api/metadata/guide/0b0595bb-d11e-49f7-8b76-15e2b6cd43a5?options=%7B%22limit%22%3A200%2C%22offset%22%3A0%7D
        const id = GUID_ID;
        const options = {
            attributes: ['id', 'name', 'standart_schema', 'createdUser'],
            where: {
                schema_owner: ownerId,
                markdel: false,
            },
        };
        const metadata = await Service.read(id, options);
        return metadata;
    }

    async getSchema(ownerId, schemaId) {
        // ../api/metadata/guide/0b0595bb-d11e-49f7-8b76-15e2b6cd43a5?options=%7B%22limit%22%3A200%2C%22offset%22%3A0%7D
        const id = GUID_ID;
        const forAll = await RlsCoreService.getPermissions(
            TABLE_NAME,
            schemaId,
            'rules',
            'view',
            READALL_ID
        );
        const isForAll = Array.isArray(forAll) && forAll.length > 0;
        const options = {
            attributes: [
                'name',
                'standart_schema',
                'schema',
                'snapshot',
                'createdUser',
            ],
            where: {
                id: schemaId,
                schema_owner: ownerId,
                markdel: false,
            },
        };
        const metadata = await Service.read(id, options);
        const rows = metadata?.rows || (Array.isArray(metadata) ? metadata : null);
        if (Array.isArray(rows)) {
            rows.forEach((row) => {
                if (row && typeof row === 'object') {
                    row.forAll = isForAll;
                }
            });
        }
        return metadata;
    }

    async editSchema(ownerId, schemaId, shemaInfo, schema, snapshot) {
        // ../api/metadata/guide/0b0595bb-d11e-49f7-8b76-15e2b6cd43a5?options=%7B%22limit%22%3A200%2C%22offset%22%3A0%7D
        const id = GUID_ID;
        const forAll = shemaInfo.forAll;
        const values = {
            id: schemaId,
            schema_owner: ownerId,
            name: shemaInfo.name,
            standart_schema: shemaInfo.standart ?? false,
            schema: asText(schema),
            snapshot: asText(snapshot),
        };
        const metadata = await Service.update(id, values);

        if (schemaId) {
            if (forAll) {
                await this.createPermissionReadAll(schemaId);
            } else {
                await this.delPermissionReadAll(schemaId);
            }
        }

        return metadata;
    }

    async createSchema(ownerId, shemaInfo, schema, snapshot, userId = undefined) {
        // ../api/metadata/guide/0b0595bb-d11e-49f7-8b76-15e2b6cd43a5?options=%7B%22limit%22%3A200%2C%22offset%22%3A0%7D
        const id = GUID_ID;
        const forAll = shemaInfo.forAll;
        const values = {
            schema_owner: ownerId,
            name: shemaInfo.name,
            standart_schema: shemaInfo.standart ?? false,
            schema: asText(schema),
            snapshot: asText(snapshot),
        };
        const metadata = await Service.create(id, values, { customRls: true });
        const row = Array.isArray(metadata?.data)
            ? metadata.data[0]
            : metadata?.data?.id
              ? metadata.data
              : metadata;
        const schemaId = row?.id;
        if (schemaId) {
            if (userId) {
                await this.createPermissions(schemaId, userId, 'write');
            } else {
                const { user } = httpContext.get('sessionStorage');
                await this.createPermissions(schemaId, user.id, 'write');
            }

            if (forAll) {
                await this.createPermissionReadAll(schemaId);
            } else {
                await this.delPermissionReadAll(schemaId);
            }
        }

        return { result: true, data: row || metadata };
    }

    async delSchema(ownerId, schemaId) {
        // ../api/metadata/guide/0b0595bb-d11e-49f7-8b76-15e2b6cd43a5?options=%7B%22limit%22%3A200%2C%22offset%22%3A0%7D
        const id = GUID_ID;
        const values = {
            id: schemaId,
            schema_owner: ownerId,
        };
        const metadata = await Service.delete(id, values);
        return metadata;
    }

    async deleleAllPermission(schemaId, user_id) {
        const table_name = 'PivotSchemas';
        const owner = 'users';

        await RlsCoreService.delPermissionNested(table_name, schemaId, 'read', owner, user_id);
        await RlsCoreService.delPermissionNested(table_name, schemaId, 'view', owner, user_id);
        await RlsCoreService.delPermissionNested(table_name, schemaId, 'write', owner, user_id);
    }

    async createPermissionRules(schemaId, rules_id) {
        const table_name = 'PivotSchemas';
        const owner = 'rules';

        await RlsCoreService.addPermissionNested(table_name, schemaId, 'view', owner, rules_id);
        await RlsCoreService.addPermissionNested(table_name, schemaId, 'read', owner, rules_id);
    }

    async delPermissionRules(schemaId, rules_id) {
        const table_name = 'PivotSchemas';
        const owner = 'rules';

        await RlsCoreService.delPermissionNested(table_name, schemaId, 'view', owner, rules_id);
        await RlsCoreService.delPermissionNested(table_name, schemaId, 'read', owner, rules_id);
    }

    async createPermissionReadAll(schemaId) {
        await this.createPermissionRules(schemaId, READALL_ID);
    }

    async delPermissionReadAll(schemaId) {
        await this.delPermissionRules(schemaId, READALL_ID);
    }

    async createPermissionAdministrator(schemaId) {
        await this.createPermissionRules(schemaId, ADMINISTRATOR_ID);
    }

    async createPermissions(schemaId, user_id, typePermission = 'read') {
        const table_name = 'PivotSchemas';
        const owner = 'users';

        await this.deleleAllPermission(schemaId, user_id);
        // await RlsCoreService.delPermissionsByTableId(table_name, schemaId) //Не помню зачем это сделал, но закомментил
        await this.createPermissionAdministrator(schemaId);

        if (typePermission === 'read') {
            await RlsCoreService.addPermissionNested(table_name, schemaId, 'view', owner, user_id);
            await RlsCoreService.addPermissionNested(table_name, schemaId, 'read', owner, user_id);
        } else {
            await RlsCoreService.addPermissionNested(table_name, schemaId, 'view', owner, user_id);
            await RlsCoreService.addPermissionNested(table_name, schemaId, 'read', owner, user_id);
            await RlsCoreService.addPermissionNested(table_name, schemaId, 'write', owner, user_id);
        }
    }

    async setPermissions(ownerId, schemaId, user_id, typePermission = 'read') {
        // POST http://localhost:3000/api/to/pivot/rls/PivotSchemas/702b4b28-8066-428a-a052-885dce9f4017/users/?type=read
        // body {"user_id":"fae8a4cd-0810-4cbd-9b7b-9d021970a27d"}

        let result = { result: false };

        //Только владелец может менять права
        const { user } = httpContext.get('sessionStorage');
        const metadata = await this.getSchema(ownerId, schemaId);
        const schema = metadata.rows[0];
        if (user.id === schema.createdUser) {
            await this.createPermissions(schemaId, user_id, typePermission);
            result = { result: true };
        }
        return result;
    }

    async delPermissions(ownerId, schemaId, user_id) {
        // DELETE http://localhost:3000/api/to/pivot/rls/PivotSchemas/702b4b28-8066-428a-a052-885dce9f4017/users/?type=read
        // body {"user_id":"fae8a4cd-0810-4cbd-9b7b-9d021970a27d"}

        let result = { result: false };

        //Только владелец может менять права
        const { user } = httpContext.get('sessionStorage');
        const metadata = await this.getSchema(ownerId, schemaId);
        const schema = metadata.rows[0];
        if (user.id === schema.createdUser) {
            await this.deleleAllPermission(schemaId, user_id);
            result = { result: true };
        }

        return result;
    }
}

module.exports = SchemaService;
