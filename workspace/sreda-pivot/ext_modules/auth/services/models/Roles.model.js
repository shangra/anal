const { URole, RoleRule, User, URule } = sreda.models;
const RoleQueryDto = require('../../db/dtos/role-query-dto');

class RolesModel {
    static async getRealAllRoles(options = {}) {
        return URole.findAll(options);
    }

    static async getAllRoles(options = {}) {
        const { force = false, searchOff } = options;
        const formattedOptions = await RoleQueryDto.normalizeQuery(options, {
            force,
            searchOff,
        });
        const currentOptions = {
            attributes: {
                include: ['markdel', 'createdAt', 'updatedAt'],
            },
            force,
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        return URole.findAll(extendedOptions);
    }

    static async getRoles(ids, options = {}) {
        const formattedOptions = await RoleQueryDto.normalizeQuery(options);
        const currentOptions = {
            where: {
                id: ids,
            },
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        return URole.findAll(extendedOptions);
    }

    static async getRole(id) {
        return URole.findOne({
            where: {
                id,
            },
        });
    }

    static async getRoleByName(name, markdel) {
        return await URole.findOne({
            where: {
                name,
                markdel,
            },
        });
    }

    static async getRoleByCode(code, markdel) {
        return await URole.findOne({
            where: {
                code,
                markdel,
            },
        });
    }

    static async createRole(data) {
        return await URole.create(data);
    }

    static async updateRole(id, data) {
        return URole.update(data, {
            where: {
                id,
            },
            returning: true,
        });
    }

    static async delAllRoleRules(role_id) {
        return RoleRule.destroy({
            where: {
                role_id,
            },
        });
    }

    static async getRoleUsers(id) {
        const role = await URole.findOne({
            where: {
                id,
            },
            include: {
                model: User,
                through: {
                    where: {
                        markdel: 0,
                    },
                },
            },
        });
        return role ? role.Users : [];
    }

    static async getRoleRules(id) {
        const role = await URole.findOne({
            where: {
                id,
            },
            include: {
                model: URule,
                through: {
                    where: {
                        markdel: 0,
                    },
                },
            },
            order: [[URule, 'name', 'ASC']],
        });
        return role ? role.URules : [];
    }

    static async delRole(id) {
        await URole.destroy({
            where: {
                id,
            },
        });
    }

    static async addRoleRule(role_id, rule_id) {
        return RoleRule.create({
            role_id,
            rule_id,
        });
    }

    static async delRoleRule(role_id, rule_id) {
        return RoleRule.destroy({
            where: {
                role_id,
                rule_id,
            },
        });
    }

    static async getRoleRulesMatrix() {
        const role = await RoleRule.findAll({
            where: {
                markdel: 0,
            },
        });
        return role || [];
    }
}

module.exports = RolesModel;
