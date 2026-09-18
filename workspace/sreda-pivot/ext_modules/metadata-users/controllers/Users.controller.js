const UsersServiceClass = require('../services/Users.service');
const UsersService = new UsersServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Управление пользователями
 */
class UsersController {
    /**
     * @swagger
     * /users/metadata:
     *   get:
     *     summary: Получить метаданные пользователей
     *     tags: [Users]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     responses:
     *       200:
     *         description: Метаданные пользователей
     */
    static async metadata(req, res, next) {
        try {
            const form = await UsersService.metadata();
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /users/metadata/{id}:
     *   get:
     *     summary: Получить метаданные пользователя по ID
     *     tags: [Users]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные пользователя
     */
    static async metadataItem(req, res, next) {
        try {
            const { id } = req.params;
            const form = await UsersService.metadataItem(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /users/metadata:
     *   post:
     *     summary: Создать метаданные нового пользователя
     *     tags: [Users]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               username:
     *                 type: string
     *               email:
     *                 type: string
     *     responses:
     *       200:
     *         description: Метаданные созданного пользователя
     */
    static async createMetadata(req, res, next) {
        try {
            const { body } = req;
            const form = await UsersService.createMetadata(body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /users/metadata/{id}:
     *   put:
     *     summary: Обновить метаданные пользователя по ID
     *     tags: [Users]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор пользователя
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
     *               username:
     *                 type: string
     *               email:
     *                 type: string
     *     responses:
     *       200:
     *         description: Обновленные метаданные пользователя
     */
    static async updateMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const { body } = req;
            const form = await UsersService.updateMetadata(id, body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /users/metadata/{id}:
     *   delete:
     *     summary: Удалить метаданные пользователя по ID
     *     tags: [Users]
     *     security:
     *       - Adminpanel: []
     *       - MetadataAdmin: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления метаданных пользователя
     */
    static async deleteMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const form = await UsersService.deleteMetadata(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /users/{id}:
     *   post:
     *     summary: Создать пользователя
     *     tags: [Users]
     *     security:
     *       - MetadataDataWrite: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор пользователя
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
     *               username:
     *                 type: string
     *               email:
     *                 type: string
     *     responses:
     *       200:
     *         description: Информация о созданном пользователе
     */
    static async create(req, res, next) {
        try {
            const id = req.params.id;
            const body = req.body;
            const metadata = await UsersService.create(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /users/{id}:
     *   get:
     *     summary: Получить информацию о пользователе по ID
     *     tags: [Users]
     *     security:
     *       - MetadataRead: []
     *       - MetadataDataRead: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Информация о пользователе
     */
    static async read(req, res, next) {
        try {
            const id = req.params.id;
            let options = req.query.options ?? '{}';
            options = JSON.parse(options);
            const metadata = await UsersService.read(id, options);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /users/{id}:
     *   put:
     *     summary: Обновить информацию о пользователе по ID
     *     tags: [Users]
     *     security:
     *       - MetadataDataWrite: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор пользователя
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
     *               username:
     *                 type: string
     *               email:
     *                 type: string
     *     responses:
     *       200:
     *         description: Обновленная информация о пользователе
     */
    static async update(req, res, next) {
        try {
            const id = req.params.id;
            const body = req.body;
            const metadata = await UsersService.update(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /users/{id}:
     *   delete:
     *     summary: Удалить пользователя по ID
     *     tags: [Users]
     *     security:
     *       - MetadataDataWrite: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор пользователя
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления пользователя
     */
    static async delete(req, res, next) {
        try {
            const id = req.params.id;
            const body = req.body;
            const metadata = await UsersService.delete(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = UsersController;
