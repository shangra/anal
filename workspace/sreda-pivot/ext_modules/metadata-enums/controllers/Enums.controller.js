const ServiceClass = require('../services/Enums.service');
const Service = new ServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Enums
 *     description: Управление метаданными и элементами перечислений
 */
class EnumsController {
  /**
     * @swagger
     * /Enums/metadata:
     *   get:
     *     summary: Получить метаданные всех перечислений
     *     tags: [Enums]
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Метаданные перечислений
     */
  static async metadata(req, res, next) {
    try {
      const form = await Service.metadata();
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /Enums/metadata/{id}:
     *   get:
     *     summary: Получить метаданные конкретного перечисления
     *     tags: [Enums]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор перечисления
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные перечисления
     */
  static async metadataItem(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await Service.metadataItem(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /Enums/metadata:
     *   post:
     *     summary: Создать новое перечисление
     *     tags: [Enums]
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/EnumMetadata'
     *     responses:
     *       200:
     *         description: Созданное перечисление
     */
  static async createMetadata(req, res, next) {
    try {
      const {
        body
      } = req;
      const form = await Service.createMetadata(body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /Enums/metadata/{id}:
     *   put:
     *     summary: Обновить метаданные перечисления
     *     tags: [Enums]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор перечисления
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/EnumMetadata'
     *     responses:
     *       200:
     *         description: Обновлённые метаданные перечисления
     */
  static async updateMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const form = await Service.updateMetadata(id, body);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /Enums/metadata/{id}:
     *   delete:
     *     summary: Удалить перечисление
     *     tags: [Enums]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор перечисления
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления перечисления
     */
  static async deleteMetadata(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const form = await Service.deleteMetadata(id);
      res.json(form);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /Enums/{id}/autofill:
     *   post:
     *     summary: Автозаполнение элемента перечисления
     *     tags: [Enums]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор перечисления
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AutofillRequest'
     *     responses:
     *       200:
     *         description: Заполненные данные элемента
     */
  static async autofill(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      const metadata = await Service.autofill(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /Enums/{id}:
     *   post:
     *     summary: Создать элемент перечисления
     *     tags: [Enums]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор перечисления
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/EnumElement'
     *     responses:
     *       200:
     *         description: Созданный элемент перечисления
     */
  static async create(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      const metadata = await Service.create(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /Enums/{id}:
     *   get:
     *     summary: Прочитать элементы перечисления
     *     tags: [Enums]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор перечисления
     *         in: path
     *         required: true
     *         type: string
     *       - name: options
     *         description: Опциональные параметры фильтрации
     *         in: query
     *         required: false
     *         type: string
     *     responses:
     *       200:
     *         description: Элементы перечисления
     */
  static async read(req, res, next) {
    try {
      const id = req.params.id;
      let options = req.query.options ?? '{}';
      options = JSON.parse(options);
      const metadata = await Service.read(id, options);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /Enums/{id}:
     *   put:
     *     summary: Обновить элемент перечисления
     *     tags: [Enums]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор перечисления
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/EnumElement'
     *     responses:
     *       200:
     *         description: Обновлённый элемент перечисления
     */
  static async update(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      const metadata = await Service.update(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /Enums/{id}:
     *   delete:
     *     summary: Удалить элемент перечисления
     *     tags: [Enums]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор перечисления
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/DeleteRequest'
     *     responses:
     *       200:
     *         description: Результат удаления элемента
     */
  static async delete(req, res, next) {
    try {
      const id = req.params.id;
      const body = req.body;
      const metadata = await Service.delete(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = EnumsController;