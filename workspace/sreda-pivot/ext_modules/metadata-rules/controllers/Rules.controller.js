const RulesServiceClass = require('../services/Rules.service');
const RulesService = new RulesServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Rules
 *     description: Управление метаданными правил
 */
class RulesController {
    /**
     * @swagger
     * /rules/metadata:
     *   get:
     *     summary: Получение списка метаданных правил
     *     tags: [Rules]
     *     security:
     *       - AccessToken: []
     *     responses:
     *       200:
     *         description: Список метаданных правил
     */
    static async metadata(req, res, next) {
        try {
            const form = await RulesService.metadata();
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /rules/metadata/{id}:
     *   get:
     *     summary: Получение метаданных правила по идентификатору
     *     tags: [Rules]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных правила
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные правила
     */
    static async metadataItem(req, res, next) {
        try {
            const { id } = req.params;
            const form = await RulesService.metadataItem(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /rules/metadata:
     *   post:
     *     summary: Создание новых метаданных правила
     *     tags: [Rules]
     *     security:
     *       - AccessToken: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Rule'
     *     responses:
     *       200:
     *         description: Созданные метаданные правила
     */
    static async createMetadata(req, res, next) {
        try {
            const { body } = req;
            const form = await RulesService.createMetadata(body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /rules/metadata/{id}:
     *   put:
     *     summary: Обновление метаданных правила по идентификатору
     *     tags: [Rules]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных правила
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Rule'
     *     responses:
     *       200:
     *         description: Обновленные метаданные правила
     */
    static async updateMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const { body } = req;
            const form = await RulesService.updateMetadata(id, body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /rules/metadata/{id}:
     *   delete:
     *     summary: Удаление метаданных правила по идентификатору
     *     tags: [Rules]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных правила
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления метаданных правила
     */
    static async deleteMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const form = await RulesService.deleteMetadata(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /rules/{id}:
     *   post:
     *     summary: Создание нового правила
     *     tags: [Rules]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор правила
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Rule'
     *     responses:
     *       200:
     *         description: Созданное правило
     */
    static async create(req, res, next) {
        try {
            const id = req.params.id;
            const body = req.body;
            const metadata = await RulesService.create(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /rules/{id}:
     *   get:
     *     summary: Чтение данных правила по идентификатору
     *     tags: [Rules]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор правила
     *         in: path
     *         required: true
     *         type: string
     *       - name: options
     *         description: Дополнительные параметры запроса
     *         in: query
     *         required: false
     *         type: string
     *     responses:
     *       200:
     *         description: Данные правила
     */
    static async read(req, res, next) {
        try {
            const id = req.params.id;
            let options = req.query.options ?? '{}';
            options = JSON.parse(options);
            const metadata = await RulesService.read(id, options);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /rules/{id}:
     *   put:
     *     summary: Обновление существующего правила
     *     tags: [Rules]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор правила
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Rule'
     *     responses:
     *       200:
     *         description: Обновленное правило
     */
    static async update(req, res, next) {
        try {
            const id = req.params.id;
            const body = req.body;
            const metadata = await RulesService.update(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /rules/{id}:
     *   delete:
     *     summary: Удаление правила по идентификатору
     *     tags: [Rules]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор правила
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления правила
     */
    static async delete(req, res, next) {
        try {
            const id = req.params.id;
            const body = req.body;
            const metadata = await RulesService.delete(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = RulesController;
