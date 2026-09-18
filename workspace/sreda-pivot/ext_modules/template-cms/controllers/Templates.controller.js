const TemplatesServiceClass = require('../services/Templates.service');
const TemplatesService = new TemplatesServiceClass();
/**
 * @swagger
 * tags:
 *   - name: Templates
 *     description: Управление шаблонами
 */
class TemplatesController {
  /**
   * @swagger
   * /templates/getlisttypes:
   *   get:
   *     summary: Список типов параметра шаблона
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: Массив сущностей типов параметра шаблона
   */
  static async getListTypes(req, res, next) {
    res.locals.description = 'Просмотр списка типов параметра шаблона страницы';
    try {
      const result = await TemplatesService.getListTypes();
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /templates/copy:
   *   post:
   *     summary: Копирование шаблона
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id:
   *                 type: string
   *                 description: UUID копируемого шаблона
   *               name:
   *                 type: string
   *                 description: Имя нового шаблона
   *     responses:
   *       200:
   *         description: Объект с данными созданного шаблона
   */
  static async copyTemplate(req, res, next) {
    res.locals.description = 'Копирование шаблона страницы';
    try {
      const {
        id,
        name
      } = req.body;
      const result = await TemplatesService.copyTemplate(id, name);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /templates/{id}:
   *   delete:
   *     summary: Удаление шаблона
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: UUID удаляемого шаблона
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Объект с result = true
   */
  static async delTemplate(req, res, next) {
    res.locals.description = 'Удаление шаблона страницы';
    try {
      const {
        id
      } = req.params;
      const result = await TemplatesService.delTemplate(id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /templates:
   *   get:
   *     summary: Список шаблонов
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: Массив сущностей шаблонов
   */
  static async getAllTemplates(req, res, next) {
    res.locals.description = 'Просмотр списка шаблонов страниц';
    try {
      const filter = JSON.parse(req.query.filter ?? '{}');
      const options = {
        filter
      };
      const templates = await TemplatesService.getAllTemplates(options);
      res.json(templates);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /templates/{id}:
   *   get:
   *     summary: Данные о шаблоне
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: UUID шаблона
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Сущность шаблона
   */
  static async getTemplate(req, res, next) {
    res.locals.description = 'Просмотр данных шаблона страницы';
    try {
      const {
        id
      } = req.params;
      const template = await TemplatesService.checkTemplate(id);
      res.json(template);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /templates/{id}:
   *   get:
   *     summary: Мета информация о шаблоне
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: UUID шаблона
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Объект с мета информацией
   */
  static async getTemplateMeta(req, res, next) {
    res.locals.description = 'Получение данных шаблона страницы';
    try {
      const {
        id
      } = req.params;
      const filter = JSON.parse(req.query.filter ?? '{}');
      const options = {
        filter
      };
      const template = await TemplatesService.checkTemplate(id, options);
      template.ParentInfo = {
        id: template.ParentInfo.id,
        name: template.ParentInfo.name,
        parent: template.ParentInfo.parent
      };
      const children = await TemplatesService.getTemplateChildren(id, options);
      res.json({
        children,
        template
      });
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /templates/{id}/params:
   *   get:
   *     summary: Список параметров шаблона
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: UUID шаблона
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Массив параметров шаблона
   */
  static async getTemplateParams(req, res, next) {
    res.locals.description = 'Просмотр мета информации параметров шаблона страницы';
    try {
      const {
        id
      } = req.params;
      const filter = JSON.parse(req.query.filter ?? '{}');
      const options = {
        filter
      };
      const params = await TemplatesService.getTemplateParams(id, options);
      res.json(params);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /templates/{id}/params/{param_id}:
   *   put:
   *     summary: Редактирование типа параметра шаблона
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: UUID шаблона
   *         in: path
   *         required: true
   *         type: string
   *       - name: param_id
   *         description: UUID параметра
   *         in: path
   *         required: true
   *         type: string
   *     requestBody:
   *       description: Данные шаблона
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               params_type_id:
   *                 type: string
   *                 description: UUID типа параметра шаблона
   *     responses:
   *       200:
   *         description: Объект с result = true
   */
  static async setTemplateParamType(req, res, next) {
    res.locals.description = 'Редактирование типа параметра шаблона страницы';
    try {
      const {
        id,
        param_id: paramId
      } = req.params;
      const {
        params_type_id: paramsTypeId,
        params_description: paramsDescription
      } = req.body;
      await TemplatesService.setTemplateParam(id, paramId, paramsTypeId, paramsDescription);
      res.json({
        result: true
      });
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /templates/{id}:
   *   put:
   *     summary: Редактирование шаблона
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: UUID шаблона
   *         in: path
   *         required: true
   *         type: string
   *     requestBody:
   *       description: Данные шаблона
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 description: имя шаблона
   *               data:
   *                 type: string
   *                 description: содержимое шаблона
   *     responses:
   *       200:
   *         description: Объект с данными измененного шаблона
   */
  static async editTemplate(req, res, next) {
    res.locals.description = 'Редактирование шаблона страницы';
    try {
      const data = req.body;
      const {
        id
      } = req.params;
      const template = await TemplatesService.setTemplateData(id, data);
      res.json(template);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /templates:
   *   post:
   *     summary: Создание шаблона
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 description: Имя нового шаблона
   *     responses:
   *       200:
   *         description: Объект с данными созданного шаблона
   */
  static async createTemplate(req, res, next) {
    res.locals.description = 'Создание шаблона страницы';
    try {
      const {
        name,
        parent
      } = req.body;
      const template = await TemplatesService.createTemplate(name, parent);
      res.json(template);
    } catch (e) {
      next(e);
    }
  }

  /**
   * @swagger
   * /templates/{id}/restore:
   *   put:
   *     summary: Восстановление удаленного шаблона
   *     tags: [pageCMP]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: id
   *         description: UUID шаблона
   *         in: path
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Объект с данными измененного шаблона
   */
  static async restoreTemplate(req, res, next) {
    try {
      const {
        id
      } = req.params;
      const restoredTemplate = await TemplatesService.restoreTemplate(id);
      res.json(restoredTemplate);
    } catch (e) {
      next(e);
    }
  }
}
module.exports = TemplatesController;