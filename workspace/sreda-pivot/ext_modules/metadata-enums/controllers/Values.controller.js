const ServiceClass = require('../services/Values.service');
const Service = new ServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Values
 *     description: Управление значениями
 */
class ValuesController {
  /**
     * @swagger
     * /values/metadata:
     *   get:
     *     summary: Получить метаданные
     *     tags: [Values]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Метаданные успешно получены
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
     * /values/metadata/{id}:
     *   get:
     *     summary: Получить конкретное метаданное по ID
     *     tags: [Values]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Конкретное метаданное успешно получено
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
     * /values/metadata:
     *   post:
     *     summary: Создать новое метаданное
     *     tags: [Values]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Metadata'
     *     responses:
     *       200:
     *         description: Новое метаданное успешно создано
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
     * /values/metadata/{id}:
     *   put:
     *     summary: Обновить существующее метаданное
     *     tags: [Values]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Metadata'
     *     responses:
     *       200:
     *         description: Метаданное успешно обновлено
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
     * /values/metadata/{id}:
     *   delete:
     *     summary: Удалить метаданное
     *     tags: [Values]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор метаданных
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданное успешно удалено
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
     * /values:
     *   post:
     *     summary: Создать новое значение
     *     tags: [Values]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Value'
     *     responses:
     *       200:
     *         description: Новое значение успешно создано
     */
  static async create(req, res, next) {
    try {
      const body = req.body;
      const metadata = await Service.create(body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /values/{id}:
     *   get:
     *     summary: Получить значение по ID
     *     tags: [Values]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор значения
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Значение успешно получено
     */
  static async read(req, res, next) {
    try {
      const id = req.params.id;
      const metadata = await Service.read(id);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /values/{id}:
     *   put:
     *     summary: Обновить значение
     *     tags: [Values]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор значения
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Value'
     *     responses:
     *       200:
     *         description: Значение успешно обновлено
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
     * /values/{id}:
     *   delete:
     *     summary: Удалить значение
     *     tags: [Values]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         description: Идентификатор значения
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Значение успешно удалено
     */
  static async delete(req, res, next) {
    try {
      const id = req.params.id;
      const metadata = await Service.delete(id);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = ValuesController;