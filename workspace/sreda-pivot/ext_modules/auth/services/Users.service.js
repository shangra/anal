const GlobalService = require('../../../core/services/Global.service');
const ApiError = require('../../../core/exceptions/ApiError');
const UserDto = require('../db/dtos/user-dto');
const UserInfoDto = require('../db/dtos/userInfo-dto');
const RoleDto = require('../db/dtos/role-dto');
const GroupDto = require('../db/dtos/group-dto');
const RuleDto = require('../db/dtos/rule-dto');
const UAttributeDto = require('../db/dtos/UAttributes-dto');
const UserDataDto = require('../db/dtos/userdata-dto');

const UsersModel = require('./models/Users.model');
const RulesModel = require('./models/Rules.model');
const RolesModel = require('./models/Roles.model');
const GroupsModel = require('./models/Groups.model');
const Extensions = require('../../../core/class/Extensions.class');

const fsp = require('fs').promises;
const FormData = require('form-data');
const esbApi = require('../../../core/services/esb-api');
const httpContext = require('../../../core/services/http-context');

class UsersService extends Extensions {
    async getUsers(ids, options = {}) {
        return (
            await this.getAllUsersWithOptions({
                ...options,
                where: { id: ids },
            })
        ).items;
    }

    async getAllUsersWithOptions(options = {}) {
        const users = await UsersModel.getAllUsersWithOptions(options);
        const usersCount = await UsersModel.countUsersWithOptions(options);
        const formattedUsers = users.map((user) => {
            const attributes = user.UserData.map(
                (data) => new UserDataDto(data)
            );
            return {
                ...new UserDto(user),
                ...new UserInfoDto(user.UserInfo),
                attributes,
            };
        });
        return { items: formattedUsers, total: usersCount };
    }

    async getAllUsers(options = {}) {
        const users = await UsersModel.getAllUsers(options);
        const usersCount = await UsersModel.countUsers(options);
        const formattedUsers = users.map((user) => {
            const attributes = user.UserData.map(
                (data) => new UserDataDto(data)
            );
            return {
                ...new UserDto(user),
                ...new UserInfoDto(user.UserInfo),
                attributes,
            };
        });
        return { items: formattedUsers, total: usersCount };
    }

    //  //метод для ограничения передаваемых на фронт аттрибутов пользователей
    async getAllUsersWithAllowedAttributes(options = {}) {
        return this.getAllUsers(options);
    }

    async searchUserByAttributeValue(value) {
        return UsersModel.searchUserByAttributeValue(value);
    }

    async searchUsersByFio(fio, options) {
        return UsersModel.searchUsersByFio(fio, options);
    }

    async getUserGroups(idUser) {
        await this.checkUser(idUser);
        return UsersModel.getUserGroups(idUser);
    }

    async getRules(ids, options = {}) {
        const rules = await RulesModel.getRules(ids, options);
        return rules.map((rule) => new RuleDto(rule));
    }

    async getAllRules(options = {}) {
        const rules = await RulesModel.getAllRules(options);
        return rules.map((rule) => new RuleDto(rule));
    }

    async getRoles(ids, options = {}) {
        const roles = await RolesModel.getRoles(ids, options);
        return roles.map((role) => new RoleDto(role));
    }

    async getAllRoles(options = {}) {
        const roles = await RolesModel.getAllRoles(options);
        return roles.map((role) => new RoleDto(role));
    }

    async getRealAllRoles(options = {}) {
        const roles = await RolesModel.getRealAllRoles(options);
        return roles.map((role) => new RoleDto(role));
    }

    async createRole(data) {
        await this.checkRoleName(data.name);
        const roleData = new RoleDto(data);
        const newRole = await RolesModel.createRole(roleData);
        return new RoleDto(newRole);
    }

    async editRole(id, data) {
        await this.checkRole(id);
        // if (data.name) {
        //     await this.checkRoleName(data.name, id)
        // }
        const newData = new RoleDto(data);
        const [, [newRole]] = await RolesModel.updateRole(id, newData);
        return new RoleDto(newRole);
    }

    async restoreUser(id) {
        const [, [updatedUser]] = await UsersModel.userUpdate(
            id,
            { markdel: 0 },
            { where: { markdel: 1 } }
        );

        return updatedUser;
    }

    async editUser(id, data, options = {}) {
        await this.checkUser(id, options);

        if (data.upload) {
            const { status, body } = await GlobalService.upload(
                `/users/${id}`,
                data.upload,
                'avatar.jpeg'
            );
            if (status === 201 || status === 200) {
                data.avatar = body.id;
            }

            fsp.unlink(data.upload.path).catch((e) => console.log(e));
        }

        return this.fullUpdateUser(id, data);
    }

    async fullUpdateUser(id, data) {
        const newUserData = new UserDto(data);
        const newUserInfoData = new UserInfoDto(data);
        delete newUserData.id;
        delete newUserInfoData.id;

        let result = {};
        const userUpdateData = await UsersModel.userUpdate(id, newUserData);
        if (userUpdateData) {
            const [, [updatedUser]] = userUpdateData;
            if (updatedUser) {
                result = { ...result, ...new UserDto(updatedUser) };
            }
        }

        const userInfoUpdateData = await UsersModel.userInfoUpdate(
            id,
            newUserInfoData
        );
        if (userInfoUpdateData) {
            const [, [updatedUserInfo]] = userInfoUpdateData;
            if (updatedUserInfo) {
                result = { ...result, ...new UserInfoDto(updatedUserInfo) };
            }
        }

        return result;
    }

    async deleteUser(id) {
        await UsersModel.delUser(id);
        await UsersModel.delUserInfo(id);
    }

    async addUserRule(userId, ruleId) {
        await this.checkUser(userId);
        await this.checkRule(ruleId);
        return UsersModel.addUserRule(userId, ruleId);
    }

    async addUserRole(userId, roleId) {
        await this.checkUser(userId);
        await this.checkRole(roleId);
        return UsersModel.addUserRole(userId, roleId);
    }

    async delUserRole(userId, roleId) {
        await this.checkUser(userId);
        await this.checkRole(roleId);
        return UsersModel.delUserRole(userId, roleId);
    }

    async getRoleUsers(id) {
        await this.checkRole(id);
        const users = await RolesModel.getRoleUsers(id);
        return users.map((user) => new UserDto(user));
    }

    async getRoleRules(id) {
        await this.checkRole(id);
        const rules = await RolesModel.getRoleRules(id);
        return rules.map((rule) => new RuleDto(rule));
    }

    async getRole(id) {
        const role = await this.checkRole(id);
        return new RoleDto(role);
    }

    async getRoleByName(name) {
        const role = await RolesModel.getRoleByName(name, [0, 1]);
        return role ? new RoleDto(role) : role;
    }

    async getRoleByCode(code) {
        const role = await RolesModel.getRoleByCode(code, [0, 1]);
        return role ? new RoleDto(role) : role;
    }

    async addRoleRule(roleId, ruleId) {
        await this.checkRole(roleId);
        await this.checkRule(ruleId);
        return RolesModel.addRoleRule(roleId, ruleId);
    }

    async getRuleRoles(id) {
        await this.checkRule(id);
        const roles = await RulesModel.getRuleRoles(id);
        return roles.map((role) => new RoleDto(role));
    }

    async getRuleUsers(id) {
        await this.checkRule(id);
        const users = await RulesModel.getRuleUsers(id);
        return users.map((user) => new UserDto(user));
    }

    async createGroup(data) {
        const groupData = new GroupDto(data);
        const { description, name } = groupData;
        if (!name && !description)
            return ApiError.BadRequest('Отсутствует имя или описание группы');
        const editedGroupData = {
            ...groupData,
            ...(description && !name
                ? {
                      name: GlobalService.transliterate(
                          description.trim().toLowerCase(),
                          {
                              ext_array: { ' ': '_', _: '_' },
                              onlyLetters: true,
                          }
                      ),
                  }
                : {}),
        };
        const group = await GroupsModel.createGroup(editedGroupData);
        return new GroupDto(group);
    }

    async getGroup(id) {
        const group = await this.checkGroup(id);
        return new GroupDto(group);
    }

    async getOpenGroups() {
        return GroupsModel.getOpenGroups();
    }

    async editGroup(id, data) {
        await this.checkGroup(id);
        if (data.name) {
            await this.checkGroupName(data.name, id);
        }
        const newData = new GroupDto(data);

        // поле open устанавливается только при создании
        // open = true создаются зеркальные копии в user-news
        // open = false создается только группа
        delete newData.open;

        const [, [newGroup]] = await GroupsModel.updateGroup(id, newData);
        return new GroupDto(newGroup);
    }

    async delGroup(id) {
        await this.checkGroup(id);
        await GroupsModel.delGroup(id);
        return { result: true };
    }

    async getGroupUsers(id) {
        await this.checkGroup(id);
        const users = await GroupsModel.getGroupUsers(id);
        return users.map((user) => new UserDto(user));
    }

    async getGroupsUsers(groupIds) {
        await this.checkGroups(groupIds);
        return GroupsModel.getGroupsUserIds(groupIds);
    }

    async addUserGroup(userId, groupId) {
        await this.checkUser(userId);
        await this.checkGroup(groupId);
        return GroupsModel.addUserGroup(userId, groupId);
    }

    async delUserGroup(userId, groupId) {
        await this.checkUser(userId);
        await this.checkGroup(groupId);
        await GroupsModel.delUserGroup(userId, groupId);

        return { result: true };
    }

    async getRoleRuleMatrix() {
        const AllRoles = await RolesModel.getAllRoles();
        const AllRules = await RulesModel.getAllRules();

        const AllRolesObject = {};
        const AllRolesArray = [];
        AllRoles.forEach((value) => {
            AllRolesObject[value.id] = { name: value.name };
            AllRolesArray.push(value.id);
        });

        const AllRulesObject = {};
        const AllRulesArray = [];
        AllRules.forEach((value) => {
            AllRulesObject[value.id] = { name: value.name };
            AllRulesArray.push(value.id);
        });

        const AllMatrix = [];
        const MatrixRolesRules = await RolesModel.getRoleRulesMatrix();
        MatrixRolesRules.forEach((value) => {
            const indexRole = AllRolesArray.indexOf(value.role_id);
            const indexRule = AllRulesArray.indexOf(value.rule_id);

            AllMatrix.push(`${indexRole}_${indexRule}`);
        });

        return { AllRolesObject, AllRulesObject, AllMatrix };
    }

    async getUserRoleMatrix(options = {}) {
        const usersOptions = {
            ...(options.xFilter ? { filter: options.xFilter } : {}),
        };
        const AllUsers = await UsersModel.getAllUsers(usersOptions);
        const AllRoles = await RolesModel.getAllRoles();

        const AllUsersObject = {};
        const AllUsersArray = [];
        AllUsers.forEach((value) => {
            AllUsersObject[value.id] = { name: value.login };
            AllUsersArray.push(value.id);
        });

        const AllRolesObject = {};
        const AllRolesArray = [];
        AllRoles.forEach((value) => {
            AllRolesObject[value.id] = { name: value.name };
            AllRolesArray.push(value.id);
        });

        const AllMatrix = [];
        const matrixOptions = {
            users: AllUsers.map((user) => user.id),
        };
        const MatrixRolesRules = await UsersModel.getUserRolesMatrix(
            matrixOptions
        );
        MatrixRolesRules.forEach((value) => {
            const indexUser = AllUsersArray.indexOf(value.user_id);
            const indexRole = AllRolesArray.indexOf(value.role_id);

            AllMatrix.push(`${indexUser}_${indexRole}`);
        });

        return { AllUsersObject, AllRolesObject, AllMatrix };
    }

    async getUserGroupMatrix(options = {}) {
        const usersOptions = {
            ...(options.xFilter ? { filter: options.xFilter } : {}),
        };
        const AllUsers = await UsersModel.getAllUsers(usersOptions);
        const AllGroups = await GroupsModel.getAllGroups();

        const AllUsersObject = {};
        const AllUsersArray = [];
        AllUsers.forEach((value) => {
            AllUsersObject[value.id] = { name: value.login };
            AllUsersArray.push(value.id);
        });

        const AllGroupsObject = {};
        const AllGroupsArray = [];
        AllGroups.forEach((value) => {
            AllGroupsObject[value.id] = { name: value.name };
            AllGroupsArray.push(value.id);
        });

        const AllMatrix = [];
        const matrixOptions = {
            users: AllUsers.map((user) => user.id),
        };
        const MatrixUserGroups = await UsersModel.getUserGroupsMatrix(
            matrixOptions
        );
        MatrixUserGroups.forEach((value) => {
            const indexUser = AllUsersArray.indexOf(value.user_id);
            const indexGroup = AllGroupsArray.indexOf(value.group_id);

            AllMatrix.push(`${indexUser}_${indexGroup}`);
        });

        return { AllUsersObject, AllGroupsObject, AllMatrix };
    }

    async getUserRuleMatrix(options = {}) {
        const usersOptions = {
            ...(options.xFilter ? { filter: options.xFilter } : {}),
        };
        const AllUsers = await UsersModel.getAllUsers(usersOptions);
        const AllRules = await RulesModel.getAllRules();

        const AllUsersObject = {};
        const AllUsersArray = [];
        AllUsers.forEach((value) => {
            AllUsersObject[value.id] = { name: value.login };
            AllUsersArray.push(value.id);
        });

        const AllRulesObject = {};
        const AllRulesArray = [];
        AllRules.forEach((value) => {
            AllRulesObject[value.id] = { name: value.name };
            AllRulesArray.push(value.id);
        });

        const AllMatrix = [];
        const matrixOptions = {
            users: AllUsers.map((user) => user.id),
        };
        const MatrixUserRules = await UsersModel.getUserRulesMatrix(
            matrixOptions
        );
        MatrixUserRules.forEach((value) => {
            const indexUser = AllUsersArray.indexOf(value.user_id);
            const indexRule = AllRulesArray.indexOf(value.rule_id);

            AllMatrix.push(`${indexUser}_${indexRule}`);
        });

        return { AllUsersObject, AllRulesObject, AllMatrix };
    }

    async checkRule(id) {
        const rule = await RulesModel.getRule(id);
        if (!rule) {
            throw ApiError.BadRequest('Такого права не существует');
        }
        return rule;
    }

    async checkUser(id, options = {}) {
        const user = await UsersModel.getUser(id, options);
        if (!user) {
            throw ApiError.BadRequest('Такого пользователя не существует');
        }
        return user;
    }

    async checkRole(id) {
        const role = await RolesModel.getRole(id);
        if (!role) {
            throw ApiError.BadRequest('Такой роли не существует');
        }
        return role;
    }

    async checkGroup(id) {
        const group = await GroupsModel.getGroup(id);
        if (!group) {
            throw ApiError.BadRequest('Такой группы не существует');
        }
        return group;
    }

    async checkGroups(ids) {
        const groups = await GroupsModel.getGroups(ids);
        if (groups.length !== ids.length) {
            throw ApiError.BadRequest('Такой групп не существует');
        }

        return groups;
    }

    async checkRoleName(name) {
        // roleId
        const currRole = await RolesModel.getRoleByName(name, [0, 1]);
        if (currRole) {
            // && roleId !== currRole.id
            throw ApiError.BadRequest('Роль с таким именем уже существует');
        }
        return currRole;
    }

    async checkGroupName(name, groupId) {
        const currGroup = await GroupsModel.getGroupByName(name, [0, 1]);
        if (currGroup && currGroup.id !== groupId) {
            throw ApiError.BadRequest('Группа с таким именем уже существует');
        }
        return currGroup;
    }

    async getUserIdByLogin(login) {
        const userData = await UsersModel.getUserByLogin(login);
        return { ...new UserDto(userData) };
    }

    async getUser(id) {
        const user = await this.checkUser(id);
        // todo написать тесты на получения аттрибутов после создания механизма добавлени
        const userData = await UsersModel.getUserData(id);
        // todo поискать вариант с измененеием имени при запросе в sequelize
        const formattedUserData = userData.map(
            (data) => new UAttributeDto(data)
        );
        return {
            ...new UserDto(user),
            ...new UserInfoDto(user.UserInfo),
            attributes: formattedUserData,
        };
    }

    async getUserAttribute(userId, attributeId, options = {}) {
        if (
            options.disableChecked === undefined ||
            options.disableChecked === false
        ) {
            await this.checkUser(userId);
            await this.checkAttribute(attributeId);
        }
        const data = await UsersModel.getUserAttribute(userId, attributeId);
        return data === null ? '' : data.value;
    }

    async setUserAttribute(userId, attributeId, value, options = {}) {
        if (
            options.disableChecked === undefined ||
            options.disableChecked === false
        ) {
            await this.checkUser(userId);
            await this.checkAttribute(attributeId);
        }
        await UsersModel.setUserAttribute(userId, attributeId, value);
    }

    async checkAttribute(attributeId) {
        const attribute = await UsersModel.getAttribute(attributeId);
        if (!attribute) {
            throw ApiError.BadRequest('Такого аттрибута не существует');
        }
        return attribute;
    }

    async getAllAttributes() {
        return UsersModel.getAllAttributes();
    }

    // перегружается дополнительным расширением (sber-allowed-attributes) в котором вынимаются разрешенные параметры
    async getAllowedAttributes() {
        return this.getAllAttributes();
    }

    async getUserMeta(id) {
        const user = await this.getUser(id);
        return user;
    }

    async blockUser(userId) {
        await UsersModel.blockUser(userId);
        const result = await GlobalService.getFromEsb(
            `/auth/userdata/${userId}`,
            {
                method: 'DELETE',
            }
        );
        return result;
    }

    async unblockUser(userId) {
        return UsersModel.unblockUser(userId);
    }
}

module.exports = UsersService;
