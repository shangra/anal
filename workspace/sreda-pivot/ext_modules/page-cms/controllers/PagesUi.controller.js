const PagesServiceClass = require('../services/Pages.service');
const PagesService = new PagesServiceClass();
const PagesUiServiceClass = require('../services/PagesUi.service');
const PagesUiService = new PagesUiServiceClass();
/**
 * @swagger
 * tags:
 *   - name: PagesUI
 *     description: Контроллер для рендеринга страниц UI
 */
class PagesUiController {
    /**
     * @swagger
     * /dynpage/*:
     *   get:
     *     summary: Динамическая генерация страницы
     *     tags: [pageCMP]
     *     responses:
     *       200:
     *         description: Строка с отрендеренной страницей
     */
    static async getPage(req, res, next) {
        res.locals.description = 'Просмотр контента страницы';
        try {
            let result = {
                result: false,
            };
            const url = req.params[0];
            const page = await PagesService.getPageFromURL(url);
            if (page) {
                res.setHeader('Content-Type', page.content_type);
                const request = {
                    method: req.method,
                    url: req.url,
                    baseUrl: req.baseUrl,
                    originalUrl: req.originalUrl,
                    params: req.params,
                    query: req.query,
                    cookies: req.cookies,
                    headers: req.headers, // -> X-User-Segment: sigma/alpha
                };
                result = await PagesUiService.RenderPage(
                    page,
                    {
                        query: req.query,
                        url,
                    },
                    {
                        request,
                    }
                );
            }
            res.send(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /dynpage/meta/{id}:
     *   get:
     *     summary: Все потомки страницы
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: UUID страницы
     *         in: path
     *         required: true
     *         type: string
     *       - in: query
     *         name: filter
     *         description: Сериализованный объект с полями фильтрации для детей страницы </br></br> offset - Значение смещения в запросе </br> limit - Ограничение на количество возвращаемых элементов </br> order - Сортировка по параметру
     *         schema:
     *           type: object
     *           properties:
     *             offset:
     *               type: integer
     *               description: Значение смещения в запросе
     *             limit:
     *               type: integer
     *               description: Ограничение на количество
     *             order:
     *                 type: array
     *                 items:
     *                   example: ["code", "ASC"]
     *     responses:
     *       200:
     *         description: Объект с массивом сущностей страниц по ключу children
     */
    static async getPageMeta(req, res, next) {
        res.locals.description = 'Просмотр мета данных всех вложенных страниц'; //change here for base
        try {
            const { id } = req.params;
            const filter = JSON.parse(req.query.filter ?? '{}');
            const offset = req.query.offset && Number(req.query.offset);
            const limit = req.query.limit && Number(req.query.limit);
            const { sort, sortBy, withUsers, search } = req.query;
            const options = {
                filter,
                sortBy,
                sort,
                offset,
                limit,
                withUsers: withUsers === 'true',
                search,
            };
            const page = await PagesService.getPage(id);
            const { children, total } = await PagesService.getFullPageChildren(
                id,
                options
            );
            const childrenTotalCount = limit
                ? total
                : await PagesService.getCountPageChildren(id, options);
            res.json({
                page,
                children,
                total: childrenTotalCount,
            });
        } catch (e) {
            next(e);
        }
    }
    /**
     * Рендеринг шаблона страницы
     *
     * @swagger
     * /pagesui/render/{id}:
     *   post:
     *     summary: Рендеринг шаблона страницы
     *     tags: [PagesUI]
     *     security:
     *       - bearerAuth: []
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Идентификатор страницы
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
     *               name:
     *                 type: string
     *                 description: Имя параметра
     *               value:
     *                 type: string
     *                 description: Значение параметра
     *               paramtype:
     *                 type: string
     *                 nullable: true
     *                 description: Тип параметра
     *     responses:
     *       200:
     *         description: Результат рендеринга страницы
     */
    static async renderTemplate(req, res, next) {
        res.locals.description = 'Просмотр контента страницы';
        try {
            let result = {
                result: false,
            };
            const { id } = req.params;
            const params = req.body;
            const template = await PagesService.renderTemplate(id, params);
            res.setHeader('Content-Type', 'application/json');
            if (template) {
                template.content_type = 'application/json';
                res.setHeader('Content-Type', template.content_type);
                result = await PagesUiService.RenderPage(
                    template,
                    {
                        query: req.query,
                    },
                    {
                        request: req,
                    }
                );
            }
            res.send(result);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /dynpage/breadcrumbs/{id}:
     *   get:
     *     summary: Все родители страницы до корневого элемента
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
     *         description: Массив сущностей страниц
     */
    static async getPageBreadCrumbs(req, res, next) {
        res.locals.description = 'Просмотр полного пути до страницы';
        try {
            const { id } = req.params;
            const breadcrumbs = await PagesService.getFullListPageParents(id);
            res.json(breadcrumbs);
        } catch (e) {
            next(e);
        }
    }

    /**
     * @swagger
     * /dynpage/render:
     *   post:
     *     summary: Рендер произвольного шаблона
     *     tags: [pageCMP]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: сформированный шаблон
     */
    static async render(req, res, next) {
        res.locals.description = 'Рендер произвольного шаблона';
        try {
            // Body Template
            // {
            //     "content_type": "Application/json"
            //     "Template" : {
            //          "form": "",
            //          "script": ""
            //     },
            //     "PagesParams": [],
            //     "UrlParams" : []
            // }
            let result = {
                result: false,
            };
            const page = req.body;
            if (page) {
                res.setHeader('Content-Type', page.content_type);
                result = await PagesUiService.RenderPage(
                    page,
                    {
                        query: req.query,
                    },
                    {
                        request: req,
                    }
                );
            }
            res.send(result);
        } catch (e) {
            next(e);
        }
    }
}
module.exports = PagesUiController;
