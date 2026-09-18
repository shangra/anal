const GlobalService = require('../../../core/services/Global.service');
const PagesServiceClass = require('../services/Pages.service');
const PagesService = new PagesServiceClass();
const httpContext = require('../../../core/services/http-context');

/**
 * @swagger
 * tags:
 *   - name: pageCMP
 *     description: расширение
 */
class PagesController {
    /**
     * @swagger
     * /pages/copy:
     *   post:
     *     summary: Копирование страницы
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
     *                 description: UUID копируемой страницы
     *               name:
     *                 type: string
     *                 description: Имя создаваемой страницы
     *     responses:
     *       200:
     *         description: Созданная копия страницы
     */
    static async copyPage(req, res, next) {
        res.locals.description = 'Создание копии страницы';
        try {
            const { id, name } = req.body;
            const result = await PagesService.copyPage(id, name);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/{id}:
     *   delete:
     *     summary: Удаление страницы
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID удаляемой страницы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Объект с result = true
     */
    static async delPage(req, res, next) {
        res.locals.description = 'Удаление страницы';
        try {
            const { id } = req.params;
            await PagesService.delPage(id);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /generateUri:
     *   get:
     *     summary: Получить uri страницы по description
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: description
     *         description: Description или Name страницы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Объект с result = string
     */
    static async generateUri(req, res, next) {
        res.locals.description = 'Получить uri используя description';
        try {
            const { description } = req.query;
            const uri = PagesService.getUriByDescription(description);
            res.json({
                result: uri,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/{id}:
     *   get:
     *     summary: Мета информация по странице
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID страницы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Данные по странице и ее потомкам
     */
    static async getPageMeta(req, res, next) {
        res.locals.description = 'Получение данных страницы';
        try {
            const { id } = req.params;
            const filter = JSON.parse(req.query.filter ?? '{}');
            const options = {
                filter,
                withSubChildren: req.query.withSubChildren === 'true',
                withRls: req.query.withRls === 'true',
            };
            const page = await PagesService.checkPage(id, options);
            page.Template = {
                id: page.Template.id,
                name: page.Template.name,
                parent: page.Template.parent,
            };
            page.ParentInfo = {
                id: page.ParentInfo.id,
                name: page.ParentInfo.name,
                parent: page.ParentInfo.parent,
                uri: page.ParentInfo.uri,
            };
            page.PageLink = {
                id: page.PageLink.id,
                name: page.PageLink.name,
                parent: page.PageLink.parent,
            };
            const children = await PagesService.getPageChildren(id, options);
            res.json({
                children,
                page,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/{id}/v2:
     *   get:
     *     summary: Мета информация по странице
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID страницы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Данные по странице и ее потомкам
     */
    static async getPageMetaV2(req, res, next) {
        res.locals.description = 'Получение данных страницы v2';
        try {
            const { id } = req.params;
            const { filter = '{}' } = req.query;
            const options = JSON.parse(filter);
            // Получаем значение из кеша
            const sessionStorage = httpContext.get('sessionStorage');
            const userId =
                sessionStorage.user.id ??
                '00000000-0000-0000-0000-000000000000';
            // Получаем хэш фильтров для кеширования значений с учетом фильтров
            const hash = GlobalService.md5(filter);
            const cacheKey = `tree/${id}/${hash}/${userId}`;
            const cached = await req.cached.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }

            // Стандартные фильтры
            options.where ||= {};
            options.where.markdel = options.where.markdel ?? 0;
            options.where.active = options.where.active ?? 1;
            const page = await PagesService.checkPage(id, {
                filter: options,
            });
            page.Template = {
                id: page.Template.id,
                name: page.Template.name,
                parent: page.Template.parent,
            };
            page.ParentInfo = {
                id: page.ParentInfo.id,
                name: page.ParentInfo.name,
                parent: page.ParentInfo.parent,
                uri: page.ParentInfo.uri,
            };
            page.PageLink = {
                id: page.PageLink.id,
                name: page.PageLink.name,
                parent: page.PageLink.parent,
            };

            // Получаем дерево дочерних элементов страницы
            // @todo Можно объединить с запрос на получение страницы
            const children = await PagesService.getPageTree(id, {
                force: options?.force,
                where: options?.where || {},
                attributes: ['descendants'],
            });
            await req.cached.set(
                cacheKey,
                JSON.stringify({
                    children,
                    page,
                })
            );
            res.json({
                children,
                page,
            });
        } catch (e) {
            next(e);
        }
    }

    // static async getPageMetaWithSubChildren(req, res, next) {
    //     res.locals.description = 'Получение данных страницы';
    //     try {
    //         const {id} = req.params;
    //         const filter = JSON.parse(req.query.filter ?? "{}")
    //
    //         const page = await PagesService.getPage(id, filter);
    //         page.Template = { id: page.Template.id, name: page.Template.name};
    //         page.ParentInfo = { id: page.ParentInfo.id, name: page.ParentInfo.name};
    //         page.PageLink = { id: page.PageLink.id, name: page.PageLink.name};
    //         const children = await PagesService.getPageChildren(id, {withSubChildren: true, filter:filter} );
    //         res.json({children, page});
    //     } catch (e) {
    //         next(e)
    //     }
    // }

    /**
     * @swagger
     * /pages:
     *   post:
     *     summary: Создание страницы
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
     *               parent:
     *                 type: string
     *                 description: UUID родителя
     *               parentUri:
     *                 type: string
     *                 description: uri родителя
     *               name:
     *                 type: string
     *                 description: Имя создаваемой страницы
     *     responses:
     *       200:
     *         description: Объект с данными созданной страницы
     */
    static async createPage(req, res, next) {
        res.locals.description = 'Создание страницы';
        try {
            const data = req.body;
            const resetParams = req.query.resetParams === 'true';
            const page = await PagesService.addPage(data, resetParams);
            res.json(page);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/{id}/template/{template_id}/params:
     *   get:
     *     summary: Список параметров страницы
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID страницы
     *         in: path
     *         required: true
     *         type: string
     *       - name: template_id
     *         description: UUID шаблона
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Массив параметров страницы со значениеми
     */
    static async getPageParamsByTemplate(req, res, next) {
        res.locals.description =
            'Получение текущего содержимого параметров страницы';
        try {
            const { id, template_id: templateId } = req.params;
            const filter = JSON.parse(req.query.filter ?? '{}');
            const options = {
                filter,
            };
            const params = await PagesService.getPageParamsByTemplate(
                id,
                templateId,
                options
            );
            res.json(params);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/public/{id}/pname/{paramName}:
     *   get:
     *     summary: Список параметров страницы
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID страницы
     *         in: path
     *         required: true
     *         type: string
     *       - name: template_id
     *         description: UUID шаблона
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Массив параметров страницы со значением
     */
    static async getPageParamsByName(req, res, next) {
        res.locals.description =
            'Получение текущего содержимого параметров страницы по имени';
        try {
            const { id, paramName } = req.params;
            const params = await PagesService.getPageParamsByName(
                id,
                paramName
            );
            res.json(params);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/{id}:
     *   put:
     *     summary: Редактирование страницы
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID страницы
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       description: Данные параметра
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               parent:
     *                 type: string
     *                 description: родитель
     *               name:
     *                 type: string
     *                 description: имя страницы
     *               description:
     *                 type: string
     *                 description: описание страницы
     *               active:
     *                 type: string
     *                 description: статус страницы
     *               content_type:
     *                 type: string
     *                 description: тип контента
     *               template:
     *                 type: string
     *                 description: UUID шаблона
     *               link:
     *                 type: string
     *                 description: ссылка на другую страницу
     *     responses:
     *       200:
     *         description: Измененная страница
     */
    static async editPage(req, res, next) {
        res.locals.description = 'Редактирование свойств страницы';
        try {
            const data = req.body;
            const { id } = req.params;
            const result = await PagesService.editPage(id, data);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/{id}/params/{paramId}:
     *   put:
     *     summary: Редактирование или создание параметра страницы
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID страницы
     *         in: path
     *         required: true
     *         type: string
     *       - name: paramId
     *         description: UUID редактируемого параметра шаблона TemplateParam
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       description: Данные параметра
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               value:
     *                 type: string
     *     responses:
     *       200:
     *         description: Измененный параметр
     */
    static async editPageParam(req, res, next) {
        res.locals.description = 'Редактирование контента страницы';
        try {
            const data = req.body;
            const { id, paramId } = req.params;
            await PagesService.editPageParam(id, paramId, data);
            res.json({
                result: true,
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/public/{id}/params/{paramName}:
     *   put:
     *     summary: Редактирование или создание параметра страницы
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID страницы
     *         in: path
     *         required: true
     *         type: string
     *       - name: paramId
     *         description: UUID редактируемого параметра шаблона TemplateParam
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       description: Данные параметра
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               value:
     *                 type: string
     *     responses:
     *       200:
     *         description: Измененный параметр
     */
    static async editPublicPageParamByName(req, res, next) {
        try {
            const { id, paramName } = req.params;
            const { body } = req;
            const result = await PagesService.editPublicPageParamByName(
                id,
                paramName,
                body
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/params/{paramId}:
     *   put:
     *     summary: Редактирование параметра страницы
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: paramId
     *         description: UUID редактируемого параметра страницы PageParam
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
     *                 description: новое значение параметра
     *     responses:
     *       200:
     *         description: Измененный параметр
     */
    static async editPageParamById(req, res, next) {
        res.locals.description = 'Редактирование контента страницы';
        try {
            const data = req.body;
            const { paramId } = req.params;
            const result = await PagesService.editPageParamById(paramId, data);
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/public/params/{paramId}:
     *   put:
     *     summary: Редактирование параметра страницы (публичный маршрут)
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: paramId
     *         description: UUID редактируемого параметра страницы PageParam
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
     *                 description: новое значение параметра
     *     responses:
     *       200:
     *         description: Измененный параметр
     */
    static async editPublicPageParamById(req, res, next) {
        res.locals.description = 'Редактирование контента страницы';
        try {
            const data = req.body;
            const { paramId } = req.params;
            const result = await PagesService.editPublicPageParamById(
                paramId,
                data
            );
            res.json(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /pages/{id}:
     *   put:
     *     summary: Восстановление удаленной страницы
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID страницы
     *         in: path
     *         required: true
     *         type: string
     *     responses:
     *       200:
     *         description: Восстановленная страница
     */
    static async restorePage(req, res, next) {
        try {
            res.locals.description = 'Восстановление удаленной страницы';
            const { id } = req.params;
            const restoredPage = await PagesService.restorePage(id);
            res.json(restoredPage);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /pages:
     *   get:
     *     summary: Получить все страницы
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: filter
     *         description: Фильтр для выборки страниц
     *         in: query
     *         required: false
     *         type: string
     *     responses:
     *       200:
     *         description: Список страниц
     */
    static async getAllPages(req, res, next) {
        try {
            const filter = JSON.parse(req.query.filter ?? '{}');
            const options = {
                filter,
            };
            const pages = await PagesService.getAllPages(options);
            res.json(pages);
        } catch (e) {
            next(e);
        }
    }
    /**
     * @swagger
     * /pages/rank:
     *   put:
     *     summary: Установить ранги страниц
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: ID родительской страницы
     *         in: path
     *         required: true
     *         type: string
     *     requestBody:
     *       description: Массив рангов страниц
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: array
     *             items:
     *               type: integer
     *     responses:
     *       200:
     *         description: Результат обновления рангов
     */
    static async setRanks(req, res, next) {
        try {
            const parentId = req.params.id;
            const pagesRanks = req.body ?? [];
            const pages = await PagesService.setRanks(parentId, pagesRanks);
            res.json({
                result: pages.length === pagesRanks.length,
            });
        } catch (e) {
            next(e);
        }
    }
}
module.exports = PagesController;
