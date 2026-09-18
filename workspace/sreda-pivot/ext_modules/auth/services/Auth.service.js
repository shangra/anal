const ApiError = require('../../../core/exceptions/ApiError');
const { User, UserInfo, UserRule, UserRole, GroupUser, URule, URole } =
    sreda.models;
const UserDto = require('../db/dtos/user-dto');
const UserInfoDto = require('../db/dtos/userInfo-dto');
const RoleDto = require('../db/dtos/role-dto');
const RuleDto = require('../db/dtos/rule-dto');
const {
    defaultRules,
    defaultRoles,
    defaultGroups,
} = require('../src/constants');
const UsersServiceClass = require('./Users.service');
const UsersService = new UsersServiceClass();

const GlobalService = require('../../../core/services/Global.service');
const Extensions = require('../../../core/class/Extensions.class');
const UsersModel = require('./models/Users.model');
const httpContext = require('../../../core/services/http-context');

class AuthService extends Extensions {
    /**
     * @param {object} userData
     * @returns
     */
    async createUser(userData) {
        const { login, password } = userData;
        const existedLogin = await UsersModel.getUserByLogin(login, [0, 1]);
        if (existedLogin) {
            throw ApiError.BadRequest(
                'Пользователь с таким логином уже существует'
            );
        }
        const cryptPassword = GlobalService.md5(
            password + sreda.env.SALT || ''
        );
        const user = await User.create({ password: cryptPassword, login });
        await this.addUserPermission(user.id);
        return new UserDto(user);
    }

    /**
     * @param {object} data
     * @returns
     */
    async fullCreateUser(data) {
        const user = await this.createUser(data);
        const userInfo = await this.addUserInfo(user.id, data);
        return { ...user, ...userInfo };
    }

    /**
     * @param {string} login
     * @param {string} password
     * @returns
     */
    async changeUserPassword(login, password) {
        let result;
        const userData = await UsersModel.getUserByLogin(login, [0, 1]);
        // let userData = await UsersModel.getUser(existedLogin.id);
        if (userData) {
            const cryptPassword = GlobalService.md5(
                password + sreda.env.SALT || ''
            );
            await UsersModel.userUpdate(userData.id, {
                password: cryptPassword,
            });
            result = new UserDto(userData);
        }
        return result;
    }

    /**
     * @param {string} userId
     * @param {string} password
     * @returns
     */
    async changeUserPasswordByID(userId, password) {
        let result;
        // const userData = await UsersModel.getUserByLogin(login, [0, 1])
        const userData = await UsersModel.getUser(userId);
        if (userData) {
            const cryptPassword = GlobalService.md5(
                password + sreda.env.SALT || ''
            );
            await UsersModel.userUpdate(userData.id, {
                password: cryptPassword,
            });
            result = new UserDto(userData);
        }
        return result;
    }

    /**
     *
     * @param {string} userId
     * @param {string[]} rules
     * @param {string[]} roles
     * @param {string[]} groups
     */
    async addUserPermission(
        userId,
        rules = defaultRules,
        roles = defaultRoles,
        groups = defaultGroups
    ) {
        await this.addUserRules(userId, rules);
        await this.addUserRoles(userId, roles);
        await this.addUserGroups(userId, groups);
    }

    /**
     * @param {string} userId
     * @param {string[]} rules
     */
    async addUserRules(userId, rules = defaultRules) {
        const data = rules.map((rule) => ({ user_id: userId, rule_id: rule }));
        await UserRule.bulkCreate(data);
    }

    /**
     * @param {string} userId
     * @param {string[]} roles
     */
    async addUserRoles(userId, roles = defaultRoles) {
        const data = roles.map((role) => ({ user_id: userId, role_id: role }));
        await UserRole.bulkCreate(data);
    }

    /**
     * @param {string} userId
     * @param {string[]} roles
     */
    async delUserRoles(userId, roles) {
        const options = {
            where: {
                user_id: userId,
                role_id: roles,
            },
        };
        await UserRole.destroy(options);
    }

    /**
     * @param {string} userId
     * @param {string[]} groups
     */
    async addUserGroups(userId, groups = defaultGroups) {
        const data = groups.map((group) => ({
            user_id: userId,
            group_id: group,
        }));
        await GroupUser.bulkCreate(data);
    }

    /**
     * @param {string} id
     * @returns
     */
    async getAllUserRules(id) {
        await UsersService.checkUser(id);
        const userRoleRules = await this.getUserRolesWithRules(id);
        const ruleFromUser = await this.getUserRules(id);

        const ruleFromRole = userRoleRules
            .map((role) =>
                role.URules.map((rule) => ({
                    ...new RuleDto(rule),
                    role: new RoleDto(role),
                }))
            )
            .flat();

        const hash = {};
        ruleFromRole.forEach((el) => {
            const { name } = el;
            if (!hash[name]) {
                hash[name] = { ...el };
                hash[name].role = [];
                hash[name].role.push(el.role);
            } else {
                hash[name].role.push(el.role);
            }
        });
        ruleFromUser.forEach((el) => {
            const { name } = el;
            if (hash[name]) {
                hash[name].owned = true;
            } else {
                hash[name] = el;
                hash[name].owned = true;
                hash[name].role = [];
            }
        });

        const ruleList = {};
        const ruleNameList = {};
        const ruleLogs = {};
        for (const key in hash) {
            const rule = hash[key];
            ruleList[rule.id] = {
                id: rule.id,
                name: rule.name,
                details: rule.details,
                owned: !!rule.owned,
                role: rule.role,
            };
            ruleNameList[rule.name] = {
                id: rule.id,
                name: rule.name,
                details: rule.details,
                owned: !!rule.owned,
                role: rule.role,
            };
            ruleLogs[rule.id] = rule.name;
        }

        return [ruleList, ruleNameList, ruleLogs];
    }

    /**
     * @param {string} id
     * @returns
     */
    async getUserRolesWithRules(id) {
        await UsersService.checkUser(id);
        const userRoleRules = await User.findOne({
            where: { id },
            include: {
                through: {
                    where: {
                        markdel: 0,
                    },
                },
                model: URole,
                include: [URule],
            },
        });

        return userRoleRules?.URoles ? userRoleRules.URoles : [];
    }

    /**
     * @param {string} id
     * @returns
     */
    async getUserRules(id) {
        const userRules = await User.findOne({
            where: { id },
            include: {
                model: URule,
                through: {
                    where: {
                        markdel: 0,
                    },
                },
            },
        });
        return userRules ? userRules.URules : [];
    }

    /**
     * @param {string} id
     * @returns
     */
    async getUserRoles(id) {
        await UsersService.checkUser(id, { where: { markdel: [0, 1] } });
        const userRoles = await User.findOne({
            where: { id, markdel: [0, 1] },
            include: {
                through: {
                    where: {
                        markdel: [0, 1], // TODO FIX пользователи не могут быть доступны, если они удалены
                    },
                },
                model: URole,
                raw: true,
            },
        });
        if (!userRoles) {
            return;
        }
        return userRoles.URoles.map((role) => new RoleDto(role));
    }

    /**
     * @param {string} id
     * @returns
     */
    async getUserRolesAndGroups(id) {
        const defaultRoles = await this.getUserRoles(id);
        const defaultGroups = await UsersService.getUserGroups(id);

        const roles = {};
        defaultRoles.forEach((value) => {
            roles[value.id] = value.name;
        });

        const groups = {};
        defaultGroups.forEach((value) => {
            groups[value.id] = value.name;
        });

        return [roles, groups];
    }

    /**
     * @param {string} id
     * @param {object} data
     * @returns
     */
    async addUserInfo(id, data) {
        const newDataInfo = new UserInfoDto(data);
        // todo  удалить заглушку после создание формы для заполнения инфо о пользователе

        // newDataInfo.name = data.login;
        const userInfo = await UserInfo.findOne({ where: { id } });
        if (userInfo) {
            Object.entries(newDataInfo).forEach(([key, value]) => {
                userInfo[key] = value;
            });
            await userInfo.save();
            return new UserInfoDto(userInfo);
        }
        const info = await UserInfo.create({ ...newDataInfo, id });
        return new UserInfoDto(info);
    }

    /**
     * @param {string} id
     * @returns
     */
    async getUserInfo(id) {
        const info = await UserInfo.findOne({ where: { id } });
        return new UserInfoDto(info);
    }

    /**
     *
     * @param {{id: string, login: string}} user
     * @param {string} sessionId
     * @returns
     */
    async saveSessionId(user, sessionId) {
        const existUser = await User.findOne({ where: { id: user.id } });
        if (!existUser) {
            return User.create({
                id: user.id,
                name: user.login,
                email: '',
                details: '',
                avatar: '',
                session: sessionId,
            });
        }
        existUser.session = sessionId;
        await existUser.save();
    }

    /**
     *
     * @param {{ login: string, password: string }} data
     * @returns
     */
    async login(data) {
        console.log(data);
        const { login, password } = data;
        if (password.trim().length === 0 || login.trim().length === 0) {
            throw ApiError.BadRequest('Все поля должны быть заполнены');
        }
        const user = await User.findOne({ all: true, where: { login } });
        console.log(1)
        if (!user) {
            throw ApiError.BadRequest('Неверный логин');
        }

        // todo удалить после добавления тестовой учетную запись которая будет генерироваться при сборке проекта
        // пароль должен создаваться с использованием текущего значение SALT в файле .env
        if (process.env.NODE_ENV === 'test') return new UserDto(user);
        console.log(2)
        const cryptedPassword = GlobalService.md5(
            password + sreda.env.SALT || ''
        ); //
        if (user.password !== cryptedPassword) {
            console.log(3)
            throw ApiError.BadRequest('Неверный пароль');
        }
        console.log(4)
        return new UserDto(user);
    }

    /**
     * @param {object} userData
     * @returns
     */
    async setUserInSession(userData) {
        const user = userData;

        user.info = await this.getUserInfo(user.id);
        const [rules, ruleNameList, ruleLogs] = await this.getAllUserRules(
            user.id
        );
        const allinfo = await UsersService.getUser(user.id);
        const attributes = {};
        if (allinfo && Array.isArray(allinfo.attributes)) {
            allinfo.attributes.forEach((attribute) => {
                attributes[attribute.id] = attribute;
            });
            user.attributes = attributes;
        }
        const [roles, groups] = await this.getUserRolesAndGroups(user.id);
        user.rules = rules;
        user.ruleLogs = ruleLogs;
        user.rulesName = ruleNameList;
        user.roles = roles;
        user.groups = groups;

        return user;
    }

    async setUserInStore(store, user) {
        const sessionStorage = httpContext.get('sessionStorage');
        sessionStorage.user = user;
        httpContext.set('sessionStorage', sessionStorage);

        if (sessionStorage.SID) {
            store.set(
                sessionStorage.SID.slice(2, 34),
                JSON.stringify(sessionStorage)
            );
        }

        return user;
    }

    /**
     * @param {string} id
     * @returns
     */
    async setUserLastAccessDate(id) {
        const user = UsersModel.userUpdate(id, { lastAccessDate: new Date() });

        return new UserDto(user);
    }

    /**
     * Хук после авторизации. Для перегрузок.
     *
     * @param {object} userData
     */
    async afterLogin(userData) {
        return userData;
    }
}


module.exports = AuthService;
