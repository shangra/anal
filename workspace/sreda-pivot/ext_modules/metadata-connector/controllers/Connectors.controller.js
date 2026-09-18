const ConnectorsServiceClass = require('../services/Connectors.service');
const ConnectorsService = new ConnectorsServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Connectors
 *     description: Управление коннекторами
 */
class ConnectorsController {
    /**
     * @swagger
     * /connectors/metadata:
     *   get:
     *     summary: Получить метаданные всех коннекторов
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Метаданные коннекторов
     */
    static async metadata(req, res, next) {
        try {
            const form = await ConnectorsService.metadata();
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /connectors/metadata/{id}:
     *   get:
     *     summary: Получить метаданные одного коннектора
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID коннектора
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные коннектора
     */
    static async metadataItem(req, res, next) {
        try {
            const { id } = req.params;
            const form = await ConnectorsService.metadataItem(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /connectors/metadata:
     *   post:
     *     summary: Создать метаданные нового коннектора
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Connector'
     *     responses:
     *       200:
     *         description: Созданные метаданные коннектора
     */
    static async createMetadata(req, res, next) {
        try {
            const { body } = req;
            const form = await ConnectorsService.createMetadata(body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /connectors/metadata/{id}:
     *   put:
     *     summary: Обновить метаданные существующего коннектора
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID коннектора
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Connector'
     *     responses:
     *       200:
     *         description: Обновленные метаданные коннектора
     */
    static async updateMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const { body } = req;
            const form = await ConnectorsService.updateMetadata(id, body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /connectors/metadata/{id}:
     *   patch:
     *     summary: Частично обновить метаданные существующего коннектора
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID коннектора
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ConnectorPatch'
     *     responses:
     *       200:
     *         description: Частично обновленные метаданные коннектора
     */
    static async patchMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const { body } = req;
            const form = await ConnectorsService.patchMetadata(id, body);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /connectors/metadata/{id}:
     *   delete:
     *     summary: Удалить метаданные коннектора
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID коннектора
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления метаданных
     */
    static async deleteMetadata(req, res, next) {
        try {
            const { id } = req.params;
            const form = await ConnectorsService.deleteMetadata(id);
            res.json(form);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /connectors:
     *   post:
     *     summary: Создать новый коннектор
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ConnectorCreate'
     *     responses:
     *       200:
     *         description: Созданный коннектор
     */
    static async create(req, res, next) {
        try {
            const body = req.body;
            const metadata = await ConnectorsService.create(body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /connectors/{id}:
     *   get:
     *     summary: Получить информацию о конкретном коннекторе
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID коннектора
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Информация о коннекторе
     */
    static async read(req, res, next) {
        try {
            const id = req.params.id;
            const metadata = await ConnectorsService.read(id);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /connectors/{id}:
     *   put:
     *     summary: Полностью обновить информацию о коннекторе
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID коннектора
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ConnectorUpdate'
     *     responses:
     *       200:
     *         description: Обновленный коннектор
     */
    static async update(req, res, next) {
        try {
            const id = req.params.id;
            const body = req.body;
            const metadata = await ConnectorsService.update(id, body);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /connectors/{id}:
     *   delete:
     *     summary: Удалить коннектор
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID коннектора
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления коннектора
     */
    static async delete(req, res, next) {
        try {
            const id = req.params.id;
            const metadata = await ConnectorsService.delete(id);
            res.json(metadata);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /connectors/{id}/test:
     *   get:
     *     summary: Протестировать работу коннектора
     *     tags: [Connectors]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: ID коннектора
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результаты тестирования
     */
    static async test(req, res, next) {
        try {
            const id = req.params.id;
            const result = await ConnectorsService.test(id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = ConnectorsController;
