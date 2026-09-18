const ServiceClass = require('../services/Guide.service');
const Service = new ServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Guide
 *     description: Контроллер управления гидами
 */
class GuideController {
  /**
     * @swagger
     * /guide/metadata:
     *   get:
     *     summary: Получить метаданные всех гидов
     *     tags: [Guide]
     *     security:
     *       - AccessToken: []
     *     responses:
     *       200:
     *         description: Метаданные всех гидов
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
     * /guide/metadata/{id}:
     *   get:
     *     summary: Получить метаданные гида по ID
     *     tags: [Guide]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: ID гида
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Метаданные гида
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
     * /guide/metadata:
     *   post:
     *     summary: Создать метаданные нового гида
     *     tags: [Guide]
     *     security:
     *       - AccessToken: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Guide'
     *     responses:
     *       200:
     *         description: Созданные метаданные гида
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
     * /guide/metadata/{id}:
     *   put:
     *     summary: Обновить метаданные гида
     *     tags: [Guide]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: ID гида
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Guide'
     *     responses:
     *       200:
     *         description: Обновленные метаданные гида
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
     * /guide/metadata/{id}:
     *   delete:
     *     summary: Удалить метаданные гида
     *     tags: [Guide]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: ID гида
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления метаданных гида
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
     * /guide/{id}:
     *   post:
     *     summary: Создать запись гида
     *     tags: [Guide]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: ID гида
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Record'
     *     responses:
     *       200:
     *         description: Созданная запись гида
     */
  static async create(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const body = req.body.record ?? req.body;
      const metadata = await Service.create(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /guide/{id}:
     *   get:
     *     summary: Прочитать запись гида
     *     tags: [Guide]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: ID гида
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Запись гида
     */
  static async read(req, res, next) {
    try {
      const {
        id
      } = req.params;
      let options = req.query.options ?? '{}';
      options = JSON.parse(options);
      const metadata = await Service.read(id, options);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }

  // static async view(req, res, next) {
  //     try {
  //         const { id } = req.params;
  //         let options = req.query.options ?? '{}';
  //         options = JSON.parse(options);
  //         const metadata = await Service.view(id, options);
  //         res.json(metadata);
  //     } catch (e) {
  //         next(e);
  //     }
  // }

  /**
     * @swagger
     * /guide/{id}:
     *   put:
     *     summary: Обновить запись гида
     *     tags: [Guide]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: ID гида
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Record'
     *     responses:
     *       200:
     *         description: Обновленная запись гида
     */
  static async update(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const body = req.body.record ?? req.body;
      const metadata = await Service.update(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
  /**
     * @swagger
     * /guide/{id}:
     *   delete:
     *     summary: Удалить запись гида
     *     tags: [Guide]
     *     security:
     *       - AccessToken: []
     *     parameters:
     *       - name: id
     *         description: ID гида
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Результат удаления записи гида
     */
  static async delete(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const {
        body
      } = req;
      const metadata = await Service.delete(id, body);
      res.json(metadata);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = GuideController;