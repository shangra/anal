const UsersServiceClass = require('../services/Users.service');
const UsersModel = require('../services/models/Users.model');
const RolesModel = require('../services/models/Roles.model');
const AuthServiceClass = require('../services/Auth.service');
const GroupsServiceClass = require('../services/Groups.service'); // NewsService

const UsersService = new UsersServiceClass();
const AuthService = new AuthServiceClass();
const GroupsService = new GroupsServiceClass();

/**
 * @swagger
 * tags:
 *   - name: authCMP
 *     description: расширение
 */

// todo исправить имена функций
class UsersUiController {
    /**
     * @swagger
     * /usersui/users:
     *   get:
     *     summary: Список пользователей
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Массив с пользователями
     */
    static async getUsers(req, res, next) {
        res.locals.description = 'Просмотр списка пользователей';
        try {
            const filter = JSON.parse(req.query.filter ?? '{}');
            const options = {
                filter,
            };
            const users = await UsersService.getAllUsersWithAllowedAttributes(
                options
            );
            res.json(users);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users:
     *   post:
     *     summary: Создание пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               password:
     *                 type: string
     *                 description: пароль
     *               login:
     *                 type: string
     *                 description: логин пользователя
     *     responses:
     *       200:
     *         description: Объект с данными созданного пользователя
     */
    // todo добавить полную валидацию пользовательского ввода
    static async createUser(req, res, next) {
        res.locals.description = 'Создание пользователя';
        try {
            const data = req.body;
            const result = await AuthService.fullCreateUser(data);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles:
     *   get:
     *     summary: Список всех ролей
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Массив с ролями
     */
    static async getAllRoles(req, res, next) {
        res.locals.description = 'Просмотр списка ролей';
        try {
            const filter = JSON.parse(req.query.filter ?? '{}');
            const result = await UsersService.getAllRoles(filter);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/rules:
     *   get:
     *     summary: Список всех прав системы
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Массив сущностей прав
     */
    static async getAllRules(req, res, next) {
        res.locals.description = 'Просмотр списка прав';
        try {
            const filter = JSON.parse(req.query.filter ?? '{}');
            const result = await UsersService.getAllRules(filter);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}:
     *   get:
     *     summary: Информация о пользователе
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Объект со всей информацией о пользователе
     */
    // todo доделать
    static async getUser(req, res, next) {
        res.locals.description = 'Просмотр данных о пользователе';
        try {
            const { id } = req.params;
            const user = await UsersService.getUser(id);
            res.json(user);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/private/users/{id}/meta:
     *   get:
     *     summary: Мета информация по пользователю
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Данные по пользователю, его права, роли и группы
     */
    static async getUserMeta(req, res, next) {
        res.locals.description = 'Просмотр ролевой модели пользователя';
        try {
            const { id } = req.params;
            // todo перенести все методы в UsersService
            const user = await UsersService.getUserMeta(id);
            const [rules] = await AuthService.getAllUserRules(id);
            const roles = await AuthService.getUserRoles(id);
            const groups = await UsersService.getUserGroups(id);
            delete user.session;
            user.rules = rules;
            user.roles = roles;
            user.groups = groups;
            res.json(user);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles:
     *   post:
     *     summary: Создание роли
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *              - name
     *             properties:
     *               name:
     *                 type: string
     *                 description: имя роли
     *               color:
     *                 type: string
     *                 description: цвет роли
     *               details:
     *                 type: string
     *                 description: описание роли
     *     responses:
     *       200:
     *         description: Объект с данными созданной роли
     */
    static async createRole(req, res, next) {
        res.locals.description = 'Создание новой роли';
        try {
            const data = req.body;
            const role = await UsersService.createRole(data);
            res.json(role);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/groups:
     *   post:
     *     summary: Создание группы
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *              - name
     *             properties:
     *               name:
     *                 type: string
     *                 description: имя группы
     *     responses:
     *       200:
     *         description: Объект с данными созданной группы
     */
    static async createGroup(req, res, next) {
        res.locals.description = 'Создание новой группы';
        try {
            const groupData = req.body;
            const group = await UsersService.createGroup(groupData);
            res.json(group);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles/{id}:
     *   put:
     *     summary: Редактирование данных роли
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID роли
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       description: Данные роли
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 description: имя роли
     *               details:
     *                 type: string
     *                 description: описание роли
     *               color:
     *                 type: string
     *                 description: цвет роли
     *     responses:
     *       200:
     *         description: Объект с данными измененной роли
     */
    static async editRole(req, res, next) {
        res.locals.description = 'Редактирование роли';
        try {
            const { id } = req.params;
            const data = req.body;
            const role = await UsersService.editRole(id, data);
            res.json(role);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}:
     *   put:
     *     summary: Редактирование данных пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       description: Данные пользователя
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               login:
     *                 type: string
     *                 description: логин пользователя
     *               status:
     *                 type: string
     *                 description: статус пользователя
     *               name:
     *                 type: string
     *                 description: имя пользователя
     *               details:
     *                 type: string
     *                 description: описание пользователя
     *               avatar:
     *                 type: string
     *                 description: хэш файл аватара
     *               email:
     *                 type: string
     *                 description: почта пользователя
     *               upload:
     *                 type: string
     *                 description: новый аватар
     *                 format: binary
     *     responses:
     *       200:
     *         description: Объект с данными измененного пользователя
     */
    static async editUser(req, res, next) {
        res.locals.description = 'Редактирование пользователя';
        try {
            const { id } = req.params;
            const data = req.body;
            data.upload = req.file;
            const result = await UsersService.editUser(id, data);
            if (data.password) {
                await AuthService.changeUserPasswordByID(id, data.password);
            }
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}:
     *   delete:
     *     summary: Удаление пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID удаляемого польщователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Объект result = true
     */
    static async deleteUser(req, res, next) {
        res.locals.description = 'Удаление пользователя';
        try {
            const { id } = req.params;
            await UsersService.deleteUser(id);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/rules:
     *   get:
     *     summary: Список прав пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Массив с правами пользователя
     */
    static async getUserRules(req, res, next) {
        res.locals.description = 'Просмотр всех прав пользователя';
        try {
            const { id } = req.params;
            const [rules] = await AuthService.getAllUserRules(id);
            res.json(rules);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/rules:
     *   post:
     *     summary: Добавление пользователю права
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               rule_id:
     *                 type: string
     *                 description: UUID добавляемого права
     *     responses:
     *       200:
     *         description: Объект с result = true
     */
    static async addUserRule(req, res, next) {
        res.locals.description = 'Добавление права пользователю';
        try {
            const { rule_id: ruleId } = req.body;
            const { id } = req.params;
            await UsersService.addUserRule(id, ruleId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/rules:
     *   delete:
     *     summary: Удаление права у пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               rule_id:
     *                 type: string
     *                 description: UUID удаляемого права
     *     responses:
     *       200:
     *         description: Объект result = true
     */
    static async delUserRule(req, res, next) {
        res.locals.description = 'Удаление права у пользователя';
        try {
            const { rule_id: ruleId } = req.body;
            const { id } = req.params;
            await UsersModel.delUserRule(id, ruleId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/roles:
     *   get:
     *     summary: Список ролей пользователей
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Массив с ролями пользователя
     */
    static async getUserRoles(req, res, next) {
        res.locals.description = 'Просмотр ролей пользователя';
        try {
            const { id } = req.params;
            const roles = await AuthService.getUserRolesWithRules(id);
            res.json(roles);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/roles:
     *   delete:
     *     summary: Удаление роли у пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               role_id:
     *                 type: string
     *                 description: UUID удаляемой роли
     *     responses:
     *       200:
     *         description: Объект result = true
     */
    static async delUserRole(req, res, next) {
        res.locals.description = 'Удаление роли у пользователя';
        try {
            const { id } = req.params;
            const { role_id: roleId } = req.body;
            await UsersService.delUserRole(id, roleId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/roles:
     *   post:
     *     summary: Добавление пользователю роли
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               role_id:
     *                 type: string
     *                 description: UUID добавляемой роли
     *     responses:
     *       200:
     *         description: Объект с result = true
     */
    static async addUserRole(req, res, next) {
        res.locals.description = 'Добавление роли пользователю';
        try {
            const { id } = req.params;
            const { role_id: roleId } = req.body;
            await UsersService.addUserRole(id, roleId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/groups:
     *   post:
     *     summary: Добавление пользователю в группу
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               group_id:
     *                 type: string
     *                 description: UUID группы
     *     responses:
     *       200:
     *         description: Объект с result = true
     */
    static async addUserGroup(req, res, next) {
        res.locals.description = 'Добавление пользователя в группу';
        try {
            const { id } = req.params;
            const { group_id: groupId } = req.body;
            await UsersService.addUserGroup(id, groupId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/groups:
     *   delete:
     *     summary: Удаление пользователя из группы
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               group_id:
     *                 type: string
     *                 description: UUID группы
     *     responses:
     *       200:
     *         description: Объект result = true
     */
    static async delUserGroup(req, res, next) {
        res.locals.description = 'Удаление пользователя из группы';
        try {
            const { id } = req.params;
            const { group_id: groupId } = req.body;
            await UsersService.delUserGroup(id, groupId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles/{id}/meta:
     *   get:
     *     summary: Мета информация роли
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID роли
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Объект с массивом пользователей и массивом прав данной роли
     */
    static async getRoleMeta(req, res, next) {
        res.locals.description =
            'Просмотр списка пользователей и прав, прикрепленных к роли';
        try {
            const { id } = req.params;
            const users = await UsersService.getRoleUsers(id);
            const rules = await UsersService.getRoleRules(id);
            res.json({
                users,
                rules,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles/{id}:
     *   get:
     *     summary: Информация о роли
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID роли
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Объект с данными роли
     */
    static async getRole(req, res, next) {
        res.locals.description = 'Просмотр данных роли';
        try {
            const { id } = req.params;
            const role = await UsersService.getRole(id);
            res.json(role);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles/{id}:
     *   delete:
     *     summary: Удаление роли
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID роли
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Объект result = true
     */
    static async delRole(req, res, next) {
        res.locals.description = 'Удаление роли';
        try {
            const { id } = req.params;
            await RolesModel.delRole(id);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles/{id}/rules:
     *   get:
     *     summary: Информация о права роли
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID роли
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Массив прав роли
     */
    static async getRoleRules(req, res, next) {
        res.locals.description = 'Просмотр всех прав у роли';
        try {
            const { id } = req.params;
            const rules = await UsersService.getRoleRules(id);
            res.json(rules);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles/{id}/rules:
     *   post:
     *     summary: Добавление в роль права
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID роли
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               rule_id:
     *                 type: string
     *                 description: UUID добавляемого права
     *     responses:
     *       200:
     *         description: Объект с result = true
     */
    static async addRoleRule(req, res, next) {
        res.locals.description = 'Добавление нового права у роли';
        try {
            const { id } = req.params;
            const { rule_id: ruleId } = req.body;
            await UsersService.addRoleRule(id, ruleId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles/{id}/rules:
     *   delete:
     *     summary: Удаление права у роли
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID роли
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               rule_id:
     *                 type: string
     *                 description: UUID удаляемой роли
     *     responses:
     *       200:
     *         description: Объект result = true
     */
    static async delRoleRule(req, res, next) {
        res.locals.description = 'Удаление права у роли';
        try {
            const { id } = req.params;
            const { rule_id: ruleId } = req.body;
            await RolesModel.delRoleRule(id, ruleId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles/{id}/users:
     *   get:
     *     summary: Информация о пользователях с данной ролью
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID роли
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Массив пользователей с данной ролью
     */
    static async getRoleUsers(req, res, next) {
        res.locals.description = 'Просмотр списка пользователей у роли';
        try {
            const { id } = req.params;
            const users = await UsersService.getRoleUsers(id);
            res.json(users);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles/{id}/users:
     *   delete:
     *     summary: Удаление роли у пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID роли
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               user_id:
     *                 type: string
     *                 description: UUID пользователя
     *     responses:
     *       200:
     *         description: Объект result = true
     */
    static async delRoleUser(req, res, next) {
        res.locals.description = 'Удаление роли у пользователя';
        try {
            const roleId = req.params.id;
            const { user_id: userId } = req.body;
            await UsersModel.delUserRole(userId, roleId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/roles/{id}/users:
     *   post:
     *     summary: Добавление пользователю роли
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID роли
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               user_id:
     *                 type: string
     *                 description: UUID пользователя
     *     responses:
     *       200:
     *         description: Объект с result = true
     */
    static async addRoleUser(req, res, next) {
        res.locals.description = 'Добавление роли пользователю';
        try {
            const roleId = req.params.id;
            const { user_id: userId } = req.body;
            await UsersService.addUserRole(userId, roleId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/rules/{id}/meta:
     *   get:
     *     summary: Мета информация по конкретному праву
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID права
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Роли и пользователи с данным правом
     */
    static async getRuleMeta(req, res, next) {
        res.locals.description =
            'Просмотр списка ролей и пользователей у права';
        try {
            const { id } = req.params;
            const roles = await UsersService.getRuleRoles(id);
            const users = await UsersService.getRuleUsers(id);
            res.json({
                users,
                roles,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/groups/{id}:
     *   get:
     *     summary: Информация о группе
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID группы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Объект с данными группы
     */
    static async getGroup(req, res, next) {
        res.locals.description = 'Просмотр данных группы';
        try {
            const { id } = req.params;
            const group = await UsersService.getGroup(id);
            res.json(group);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/groups/{id}:
     *   put:
     *     summary: Редактирование данных группы
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID группы
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       description: Данные группы
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 description: имя группы
     *               description:
     *                 type: string
     *                 description: описание группы
     *               open:
     *                 type: string
     *                 description: статус группы
     *               private:
     *                 type: string
     *                 description: приватность группы
     *               logo:
     *                 type: string
     *                 description: логотип группы
     *     responses:
     *       200:
     *         description: Объект с данными измененной группы
     */
    static async editGroup(req, res, next) {
        res.locals.description = 'Редактирование группы';
        try {
            const { id } = req.params;
            const data = req.body;
            const group = await UsersService.editGroup(id, data);
            res.json(group);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/groups/{id}:
     *   delete:
     *     summary: Удаление группы
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID группы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Объект result = true
     */
    static async delGroup(req, res, next) {
        res.locals.description = 'Удаление группы';
        try {
            const { id } = req.params;
            const result = await UsersService.delGroup(id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/groups:
     *   get:
     *     summary: Список групп
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Массив с группами
     */
    static async getAllGroups(req, res, next) {
        res.locals.description = 'Просмотр списка групп';
        try {
            const filter = JSON.parse(req.query.filter ?? '{}');
            const groups = await GroupsService.getAllGroups(filter);
            res.json(groups);
        } catch (e) {
            next(e);
        }
    }
    static async getGroupMeta(req, res, next) {
        res.locals.description = 'Просмотр списка пользователей у группы';
        try {
            const { id } = req.params;
            const users = await UsersService.getGroupUsers(id);
            res.json({
                users,
            });
        } catch (e) {
            next(e);
        }
    }
    static async getGroupsUsers(req, res, next) {
        res.locals.description =
            'Просмотр списка пользователей у списка группы';
        try {
            const { groupIds } = req.body;
            const users = await UsersService.getGroupsUsers(groupIds);
            res.json({
                users,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/groups/{id}/users:
     *   get:
     *     summary: Пользователи состоящие в группе
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID группы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Массив с пользователями
     */
    static async getGroupUsers(req, res, next) {
        res.locals.description = 'Просмотр списка пользователей у группы';
        try {
            const { id } = req.params;
            const users = await UsersService.getGroupUsers(id);
            res.json(users);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/groups/{id}/users:
     *   post:
     *     summary: Добавление пользователя в группу
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID группы
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *              - user_id
     *             properties:
     *               user_id:
     *                 type: string
     *                 description: UUID пользователя
     *     responses:
     *       200:
     *         description: Объект с result = true
     */
    static async addGroupUser(req, res, next) {
        res.locals.description = 'Добавление пользователя в группу';
        try {
            const groupId = req.params.id;
            const { user_id: userId } = req.body;
            await UsersService.addUserGroup(userId, groupId);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/groups/{id}/users:
     *   delete:
     *     summary: Удаление пользователя из группы
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID группы
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               user_id:
     *                 type: string
     *                 description: UUID пользователя
     *     responses:
     *       200:
     *         description: Объект result = true
     */
    static async delGroupUser(req, res, next) {
        res.locals.description = 'Удаление пользователя из группы';
        try {
            const groupId = req.params.id;
            const { user_id: userId } = req.body;
            const result = await UsersService.delUserGroup(userId, groupId);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/matrix/rolerule:
     *   get:
     *     summary: Матрица прав и ролей
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Объект с данными матрицы
     */
    static async getRoleRuleMatrix(req, res, next) {
        res.locals.description = 'Просмотр матрицы ролей и прав';
        try {
            const result = await UsersService.getRoleRuleMatrix();
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/matrix/userrole:
     *   get:
     *     summary: Матрица пользователей и ролей
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Объект с данными матрицы
     */
    static async getUserRoleMatrix(req, res, next) {
        res.locals.description = 'Просмотр матрицы пользователей и ролей';
        try {
            const xFilter = JSON.parse(req.query.xFilter ?? '{}');
            const options = {
                xFilter,
            };
            const result = await UsersService.getUserRoleMatrix(options);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/matrix/usergroup:
     *   get:
     *     summary: Матрица пользователей и групп
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Объект с данными матрицы
     */
    static async getUserGroupMatrix(req, res, next) {
        res.locals.description = 'Просмотр матрицы пользователей и групп';
        try {
            const xFilter = JSON.parse(req.query.xFilter ?? '{}');
            const options = {
                xFilter,
            };
            const result = await UsersService.getUserGroupMatrix(options);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/matrix/userrule:
     *   get:
     *     summary: Матрица пользователей и прав
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Объект с данными матрицы
     */
    static async getUserRuleMatrix(req, res, next) {
        res.locals.description = 'Просмотр матрицы пользователей и прав';
        try {
            const xFilter = JSON.parse(req.query.xFilter ?? '{}');
            const options = {
                xFilter,
            };
            const result = await UsersService.getUserRuleMatrix(options);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/attribute/{attributeId}:
     *   post:
     *     summary: Установка значение аттрибута пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *       - name: attributeId
     *         description: UUID аттрибута
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               value:
     *                 type: string
     *                 description: Новое значение аттрибута
     *     responses:
     *       200:
     *         description: объект result = true
     */
    static async setUserAttribute(req, res, next) {
        res.locals.description = 'Редактирование данных пользователя';
        try {
            const { id, attributeId } = req.params;
            const { value } = req.body;
            await UsersService.setUserAttribute(id, attributeId, value);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/groups:
     *   get:
     *     summary: Список групп пользователя
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Массив с группами пользователя
     */
    static async getUserGroups(req, res, next) {
        res.locals.description = 'Просмотр списка групп';
        try {
            const { id } = req.params;
            const groups = await UsersService.getUserGroups(id);
            res.json(groups);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/groups:
     *   get:
     *     summary: Список открытых групп
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Массив с группами
     */
    static async getOpenGroups(req, res, next) {
        res.locals.description = 'Просмотр списка открытых групп';
        try {
            const groups = await UsersService.getOpenGroups();
            res.json(groups);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/attributes/allowed:
     *   get:
     *     summary: Список ролей пользователей
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Массив с разрешенными аттрибутами пользователя
     */
    static async getAllowedAttributes(req, res, next) {
        res.locals.description =
            'Просмотр списка разрешенных аттрибутов пользователя';
        try {
            const attributes = await UsersService.getAllowedAttributes();
            res.json(attributes);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/block:
     *   get:
     *     summary: <Блокировка пользователя>
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: {result: true}
     */
    static async blockUser(req, res, next) {
        try {
            res.locals.description = 'Блокировка пользователя';
            const { id } = req.params;
            await UsersService.blockUser(id);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /usersui/users/{id}/unblock:
     *   get:
     *     summary: <Разблокировка пользователя>
     *     tags: [authCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: {result: true}
     */
    static async unblockUser(req, res, next) {
        try {
            res.locals.description = 'Разблокировка пользователя';
            const { id } = req.params;
            await UsersService.unblockUser(id);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }
}
module.exports = UsersUiController;
