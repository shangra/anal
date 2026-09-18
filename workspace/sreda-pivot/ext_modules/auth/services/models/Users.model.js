const { Op, QueryTypes } = require('sequelize');
const {
    User,
    UserInfo,
    UserRule,
    UserRole,
    UAttribute,
    UserData,
    GroupUser,
    Group,
    sequelize,
} = sreda.models;
const UserQueryDto = require('../../db/dtos/user-query-dto');

class UsersModel {
    static async getAllUsersWithOptions(options = {}) {
        const currentOptions = {
            include: [
                {
                    model: UserInfo,
                    required: false,
                },
                {
                    model: UserData,
                    required: false,
                    include: [
                        {
                            model: UAttribute,
                            required: false,
                        },
                    ],
                },
            ],
        };
        const extendedOptions = { ...options, ...currentOptions };
        const users = await User.findAll(extendedOptions);
        return [].concat(users || []).map((user) => user.get({ plain: true }));
    }

    static async getAllUsers(options = {}) {
        const { filter = {} } = options;
        const formattedOptions = await UserQueryDto.normalizeQuery(filter);
        const currentOptions = {
            include: [
                {
                    model: UserInfo,
                },
                {
                    model: UserData,
                    include: [
                        {
                            model: UAttribute,
                        },
                    ],
                },
            ],
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        return User.findAll(extendedOptions);
    }

    static async getUsers(ids, options = {}) {
        const formattedOptions = await UserQueryDto.normalizeQuery(options);
        const currentOptions = {
            include: UserInfo,
            where: {
                id: ids,
            },
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        return User.findAll(extendedOptions);
    }

    static async getUsersWithOptions(ids, options = {}) {
        const formattedOptions = await UserQueryDto.normalizeQuery(options);
        const currentOptions = {
            where: {
                id: ids,
            },
            include: [
                {
                    model: UserInfo,
                    required: false,
                },
                {
                    model: UserData,
                    required: false,
                    include: [
                        {
                            model: UAttribute,
                            required: false,
                        },
                    ],
                },
            ],
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        const users = await User.findAll(extendedOptions);
        return users.map((user) => user.get({ plain: true }));
    }

    static async getUser(id, options = {}) {
        return User.findOne({
            include: UserInfo,
            where: {
                ...options?.where,
                id,
                markdel: [0, 1], // TODO FIX пользователи не могут быть доступны, если они удалены
            },
        });
    }

    static async searchUserByAttributeValue(value) {
        return UserData.findAll({
            attributes: ['user_id'],
            where: {
                value: { [Op.iLike]: value },
            },
            group: ['user_id'],
        });
    }

    static async searchUsersByFio(value, options = {}) {
        const sql = `
            SELECT 
                u.id
            FROM 
                "${sreda.env.DB_SCHEMA}"."Users" u 
                LEFT JOIN "${sreda.env.DB_SCHEMA}"."UserData" a1 ON a1.user_id = u.id AND a1.attribute_id = '156a7669-c2d9-447e-8956-75710f0dc3c7' 
                LEFT JOIN "${sreda.env.DB_SCHEMA}"."UserData" a2 ON a2.user_id = u.id AND a2.attribute_id = '074bd055-409b-4ad3-b73f-04620511c46f' 
                LEFT JOIN "${sreda.env.DB_SCHEMA}"."UserData" a3 ON a3.user_id = u.id AND a3.attribute_id = '18e71a0f-d76a-4c8e-b7f1-c49cff474536' 
            WHERE 
                a1.value || ' ' || a2.value || ' ' || a3.value ILIKE '${value}'
        `;
        const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });
        const ids = rows.map((row) => row.id);
        const users = await this.getAllUsersWithOptions({
            ...options,
            plain: true,
            where: { id: ids },
        });
        return users.map((user) => ({
            ...user,
            ...user.UserInfo,
            attributes: user.UserData,
        }));
    }

    // todo переделать на 1 запрос с join   User -> Groups
    static async getUserGroups(userId) {
        const data = await GroupUser.findAll({
            where: {
                user_id: userId,
            },
            order: [['createdAt', 'ASC']],
        });

        const ids = data.map((value) => value.group_id);

        const groups = await Group.findAll({
            attributes: [
                'id',
                'description',
                'logo',
                'name',
                'open',
                'private',
            ],
            where: { id: ids },
            order: [['createdAt', 'ASC']],
        });

        return groups;
    }

    static async userUpdate(id, data, options = {}) {
        return User.update(data, {
            where: {
                ...options?.where,
                id,
            },
            returning: true,
        });
    }

    static async userInfoUpdate(id, data) {
        return UserInfo.update(data, {
            where: {
                id,
            },
            returning: true,
        });
    }

    static async delUser(id) {
        return User.destroy({
            where: {
                id,
            },
        });
    }

    static async delUserInfo(id) {
        return UserInfo.destroy({
            where: {
                id,
            },
        });
    }

    static async addUserRule(userId, ruleId) {
        return UserRule.create({
            user_id: userId,
            rule_id: ruleId,
        });
    }

    static async addUserRole(userId, roleId) {
        return UserRole.create({
            user_id: userId,
            role_id: roleId,
        });
    }

    static async delUserRule(userId, ruleId) {
        return UserRule.destroy({
            where: {
                user_id: userId,
                rule_id: ruleId,
            },
        });
    }

    static async delUserRole(userId, roleId) {
        return UserRole.destroy({
            where: {
                user_id: userId,
                role_id: roleId,
            },
        });
    }

    static async getUserData(id) {
        return UAttribute.findAll({
            include: [
                {
                    model: UserData,
                    attributes: ['value'],
                    where: { user_id: id },
                    required: false,
                },
            ],
        });
    }

    static async getUserRolesMatrix(options = {}) {
        const { users } = options;
        const role = await UserRole.findAll({
            where: {
                ...(users ? { user_id: users } : {}),
                markdel: 0,
            },
        });
        return role || [];
    }

    static async getUserGroupsMatrix(options = {}) {
        const { users } = options;
        return GroupUser.findAll({
            where: {
                ...(users ? { user_id: users } : {}),
                markdel: 0,
            },
        });
    }

    static async getUserRulesMatrix(options = {}) {
        const { users } = options;
        return UserRule.findAll({
            where: {
                ...(users ? { user_id: users } : {}),
                markdel: 0,
            },
        });
    }

    static async getAttribute(id) {
        return UAttribute.findOne({
            where: {
                id,
            },
        });
    }

    static async setUserAttribute(userId, attributeId, value) {
        const data = await UserData.findOne({
            where: {
                user_id: userId,
                attribute_id: attributeId,
            },
        });
        if (data) {
            await UserData.update(
                { value },
                {
                    where: {
                        user_id: userId,
                        attribute_id: attributeId,
                    },
                }
            );
        } else {
            await UserData.create({
                user_id: userId,
                attribute_id: attributeId,
                value,
            });
        }
    }

    static async getUserAttribute(userId, attributeId) {
        return UserData.findOne({
            where: {
                user_id: userId,
                attribute_id: attributeId,
            },
        });
    }

    static async getUserByLogin(login, markdel = [0]) {
        return User.findOne({
            where: {
                login,
                markdel,
            },
        });
    }

    static async getAllAttributes() {
        return UAttribute.findAll();
    }

    static async countUsersWithOptions(options = {}) {
        const countOptions = await UserQueryDto.cleanCountOptions(options);
        return User.count(countOptions);
    }

    static async countUsers(options = {}) {
        const { filter = {} } = options;
        const formattedOptions = await UserQueryDto.normalizeQuery(filter);
        const extendedOptions = await formattedOptions.getOptions();
        const countOptions = await UserQueryDto.cleanCountOptions(
            extendedOptions
        );
        return User.count(countOptions);
    }

    static async blockUser(userId) {
        return User.update(
            {
                status: 1,
            },
            {
                where: {
                    id: userId,
                },
            }
        );
    }

    static async unblockUser(userId) {
        return User.update(
            {
                status: 0,
            },
            {
                where: {
                    id: userId,
                },
            }
        );
    }
}

module.exports = UsersModel;
