const ServiceClass = require('../services/code.service');
const Service = new ServiceClass();
class codeController {
    /**
     * Получение всех дочерних элементов кода.
     *
     * @swagger
     * /code:
     *   get:
     *     summary: Получение всех дочерних элементов кода
     *     tags: [Code]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Список дочерних элементов кода
     */
    static async getAll(req, res, next) {
        try {
            const id = '00000000-0000-0000-0000-000000000000';
            let result = await Service.getChildren(id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
    /**
     * Получение элемента кода по ID.
     *
     * @swagger
     * /code/{id}:
     *   get:
     *     summary: Получение элемента кода по ID
     *     tags: [Code]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: ID элемента кода
     *         in: path
     *         required: true
     *         type: string
     *       - name: filter
     *         description: Дополнительный фильтр
     *         in: query
     *         required: false
     *         type: string
     *     responses:
     *       200:
     *         description: Элемент кода
     */
    static async get(req, res, next) {
        try {
            const { id } = req.params;
            const filter = JSON.parse(req.query.filter ?? '{}');
            let result = await Service.get(id, {
                filter,
            });
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
    /**
     * Создание нового элемента кода.
     *
     * @swagger
     * /code:
     *   post:
     *     summary: Создание нового элемента кода
     *     tags: [Code]
     *     produces:
     *       - application/json
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Данные нового элемента кода
     *     responses:
     *       200:
     *         description: Созданный элемент кода
     */
    static async post(req, res, next) {
        try {
            const body = req.body;
            let result = await Service.post(body);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
    /**
     * Копирование элемента кода.
     *
     * @swagger
     * /code/copy:
     *   post:
     *     summary: Копирование элемента кода
     *     tags: [Code]
     *     produces:
     *       - application/json
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Данные копируемого элемента кода
     *     responses:
     *       200:
     *         description: Скопированный элемент кода
     */
    static async copy(req, res, next) {
        try {
            const body = req.body;
            let result = await Service.copy(body);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
    /**
     * Запуск элемента кода.
     *
     * @swagger
     * /code/run/{id}:
     *   get:
     *     summary: Запуск элемента кода
     *     tags: [Code]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: ID элемента кода
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат запуска элемента кода
     */
    static async run(req, res, next) {
        try {
            const { id } = req.params;
            let result = await Service.run(id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
    /**
     * Обновление элемента кода.
     *
     * @swagger
     * /code/{id}:
     *   put:
     *     summary: Обновление элемента кода
     *     tags: [Code]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: ID элемента кода
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             description: Обновленные данные элемента кода
     *     responses:
     *       200:
     *         description: Обновленный элемент кода
     */
    static async put(req, res, next) {
        try {
            const { id } = req.params;
            const body = req.body;
            let result = await Service.put(id, body);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
    /**
     * Удаление элемента кода.
     *
     * @swagger
     * /code/{id}:
     *   delete:
     *     summary: Удаление элемента кода
     *     tags: [Code]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: ID элемента кода
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления элемента кода
     */
    static async del(req, res, next) {
        try {
            const { id } = req.params;
            let result = await Service.del(id);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = codeController;
