const ApiError = require('../../../core/exceptions/ApiError');
const Extensions = require('../../../core/class/Extensions.class');
const UsersServiceClass = wrapper('../../auth/services/Users.service');
const GroupsServiceClass = wrapper('../../auth/services/Groups.service');
const RlsCoreServiceClass = require('../../rls-core/services/RlsCore.service');

const RlsCoreService = new RlsCoreServiceClass();
const UsersService = new UsersServiceClass();
const GroupsService = new GroupsServiceClass();

class RlsUIService extends Extensions {
    async getAllPermissions(table_name, table_id, queryType) {
        const type = queryType || 'read';
        const users = await this.getAdmittedUsers(table_name, table_id, type);
        const roles = await this.getAdmittedRoles(table_name, table_id, type);
        const rules = await this.getAdmittedRules(table_name, table_id, type);
        const groups = await this.getAdmittedGroups(table_name, table_id, type);
        return { users, roles, rules, groups };
    }

    async getAdmittedUsers(table_name, table_id, type) {
        const permissions = await RlsCoreService.getPermissions(
            table_name,
            table_id,
            'users',
            type
        );
        const ids = permissions.map((perm) => perm.owner_id);
        const users = await UsersService.getUsers(ids);
        return users;
    }

    async getAdmittedRoles(table_name, table_id, type) {
        const permissions = await RlsCoreService.getPermissions(
            table_name,
            table_id,
            'roles',
            type
        );
        const ids = permissions.map((perm) => perm.owner_id);
        const roles = await UsersService.getRoles(ids);
        return roles;
    }

    async getAdmittedRules(table_name, table_id, type) {
        const permissions = await RlsCoreService.getPermissions(
            table_name,
            table_id,
            'rules',
            type
        );
        const ids = permissions.map((perm) => perm.owner_id);
        const rules = await UsersService.getRules(ids);
        return rules;
    }

    async getAdmittedGroups(table_name, table_id, type) {
        const permissions = await RlsCoreService.getPermissions(
            table_name,
            table_id,
            'groups',
            type
        );
        const ids = permissions.map((perm) => perm.owner_id);
        const groups = await GroupsService.getGroups(ids);
        return groups;
    }

    async getPermissionsMeta(table_name, table_id, owner, type) {
        let result;
        switch (owner.toLowerCase()) {
            case 'users':
                result = await this.getAdmittedUsers(
                    table_name,
                    table_id,
                    type
                );
                break;
            case 'roles':
                result = await this.getAdmittedRoles(
                    table_name,
                    table_id,
                    type
                );
                break;
            case 'rules':
                result = await this.getAdmittedRules(
                    table_name,
                    table_id,
                    type
                );
                break;
            case 'groups':
                result = await this.getAdmittedGroups(
                    table_name,
                    table_id,
                    type
                );
                break;
            default:
                throw ApiError.BadRequest(
                    `Некорректное значение ${owner} владельца записи`
                );
        }
        return result;
    }

    async getEntityAllTypePermissions(table_name, table_id, owner) {
        const accessTypes = ['view', 'read', 'write', 'delete'];

        const entitiesByCertainAccessTypes = await Promise.all(
            accessTypes.map((accessType) =>
                this.getPermissionsMeta(table_name, table_id, owner, accessType)
            )
        );

        // Для того чтобы по id сущности собрать сущность со всеми ролями
        const entityByIdMap = {};

        for (let idx = 0; idx < accessTypes.length; idx++) {
            for (const item of entitiesByCertainAccessTypes[idx]) {
                if (entityByIdMap[item.id]) {
                    entityByIdMap[item.id].access.push(accessTypes[idx]);
                    continue;
                }

                entityByIdMap[item.id] = {
                    ...item,
                    access: [accessTypes[idx]],
                };
            }
        }

        return Object.values(entityByIdMap);
    }
}

module.exports = RlsUIService;
