const PagesModel = require('./model/Pages.model');
const TemplatesModel = require('../../template-cms/services/model/Templates.model');

const ApiError = require('../../../core/exceptions/ApiError');
const PageDto = require('../db/dtos/page-dto');
const RootPageDto = require('../db/dtos/rootPage-dto');
const PageParamDto = require('../db/dtos/pageParam-dto');

const TemplatesServiceClass = require('../../template-cms/services/Templates.service');

const TemplatesService = new TemplatesServiceClass();

// const Extensions = require('../../../config/extensions');
// const GlobalService = require('../../../services/Global.service');
const Extensions = require('../../../core/class/Extensions.class');
const GlobalService = require('../../../core/services/Global.service');

const { MSG_ERROR_EXIST_PAGE, PAGE_ROOT_ID } = require('../src/constants');
const UsersModel = require('../../auth/services/models/Users.model');

class PagesService extends Extensions {
    async getAllPages(options) {
        return PagesModel.getAllPages(options);
    }

    async getPagesByParams(params, options) {
        return PagesModel.getPagesByParams(params, options);
    }

    async getPagesWhereParams(type, value) {
        return await PagesModel.GetPagesWhereParams(type, value);
    }

    async getDelPageIds(pageId) {
        const pageChildren = await this.getPageChildrenIdNested(pageId);
        const pageChildrenIds = pageChildren.map((child) => child.id);
        const pageIdsForDel = [pageId, ...pageChildrenIds];
        return pageIdsForDel;
    }

    // todo тест на проверку рекурсивного удаления
    async delPage(pageId) {
        const pageIdsForDel = await this.getDelPageIds(pageId);
        const promises = pageIdsForDel.map((id) => PagesModel.delPage(id));
        return Promise.all(promises);
    }

    async getPageParams(pageId) {
        const resultParams = [];

        let id = '00000000-0000-0000-0000-000000000000';
        if (pageId !== undefined) {
            id =
                pageId === '' ? '00000000-0000-0000-0000-000000000000' : pageId;
        }

        const metadata = await PagesModel.GetPage(id);

        if (metadata) {
            const templateId = metadata.template;
            const PageParams = await PagesModel.GetPageParams(id);
            const DefaultParams = await TemplatesModel.GetTemplateParams(
                templateId
            );

            for (const key in DefaultParams) {
                const DefaultParam = DefaultParams[key];

                let resultParam = {};
                for (const key2 in PageParams) {
                    const currParam = PageParams[key2];

                    if (currParam.template_param_id === DefaultParam.id) {
                        // Нашлось что-то
                        resultParam = {
                            id: currParam.id,
                            params: DefaultParam.name,
                            templateparamsid: DefaultParam.id,
                            value: currParam.value,
                            typeid: DefaultParam.type,
                            paramtype: DefaultParam.paramtype,
                            typename: DefaultParam.typename,
                        };
                    }
                }

                // todo refactor logics
                if (resultParam.id === undefined) {
                    // Не заполненно
                    resultParam = {
                        paramid: DefaultParam.id,
                        params: DefaultParam.name,
                        templateparamsid: DefaultParam.id,
                        value: '',
                        typeid: DefaultParam.type,
                        paramtype: DefaultParam.paramtype,
                        typename: DefaultParam.typename,
                    };
                }

                resultParams.push(resultParam);
            }
        }

        return resultParams;
    }

    //-------------------------

    async getPageParamsByTemplate(pageId, templateId, options = {}) {
        await this.checkPage(pageId, options);

        const params = await PagesModel.getTemplateParams(templateId);
        const paramNames = {};
        params.forEach(
            (param) =>
                (paramNames[param.id] = {
                    name: param.name,
                    description: param.description,
                    type: param.ParamsType.type,
                })
        );
        const paramIds = params.map((param) => param.id);

        const paramValues = await PagesModel.getPageParams(pageId, paramIds);

        const pageParamsWithValue = paramIds.map((paramId) => ({
            id: paramId,
            value: paramValues[paramId] ?? '',
            name: paramNames[paramId].name ?? '',
            description: paramNames[paramId].description ?? '',
            type: paramNames[paramId].type ?? '',
        }));

        return pageParamsWithValue;
    }

    async getPageParamsByName(pageId, paramName, options = {}) {
        await this.checkPage(pageId, options);
        const params = await this.getPageParams(pageId);
        const fParams = params.filter((el) => el.params === paramName);

        return {
            id: fParams[0].id,
            name: fParams[0].params,
            value: fParams[0].value,
        };
    }

    async changeUriByParent(data, oldPageData) {
        const oldParentData = await this.checkPage(oldPageData.parent);
        const newParentData = await this.checkPage(data.parent);
        const newUri = await this.buildUri(
            oldPageData.uri,
            oldParentData.uri,
            newParentData.uri
        );
        await this.checkPageUri(newUri);
        if (newUri) {
            data.uri = newUri;
        }
        return { data, oldParentData, newParentData };
    }

    // метод используется для хука after в расширении rls-ext-page
    async changeUriInChildrenWithRls(id, oldParentData, newParentData) {
        return this.changeUriInChildren(
            id,
            oldParentData.uri,
            newParentData.uri
        );
    }

    async changeUriInChildren(id, oldParentUri, newParentUri) {
        const children = await this.getPageChildrenIdNested(id);
        const promises = children.map((child) =>
            this.replaceUri(child, oldParentUri, newParentUri)
        );
        await Promise.all(promises);
    }

    async checkParentInChildren(pageData) {
        const dataPages = await PagesModel.getPageWithFamily(pageData.id);
        const children = dataPages.descendants;
        if (Array.isArray(children)) {
            for (const child of children) {
                if (child.id === pageData.parent) {
                    throw new ApiError(
                        400,
                        'Запрещено переносить родительскую страницу в дочернюю!'
                    );
                }
            }
        }
    }

    async editPage(id, data, options = {}) {
        let formattedData = { ...(typeof data === 'object' ? data : {}) };
        formattedData.id = id;

        let result = { result: true };
        const isRoot = id === '00000000-0000-0000-0000-000000000000';

        const oldPageData = await this.checkPage(id, options);

        const isUriChanged =
            formattedData.uri !== undefined &&
            oldPageData.uri !== formattedData.uri;

        // при смене имени, меняется uri
        const formattedName =
            formattedData.name && typeof formattedData.name === 'string'
                ? GlobalService.transliterate(
                      formattedData.name.trim().toLowerCase(),
                      {
                          ext_array: { ' ': '_', _: '_', '-': '-', '.': '.' },
                          onlyLetters: true,
                      }
                  )
                : undefined;
        const isNameChanged =
            formattedName && oldPageData.name.toLowerCase() !== formattedName;
        if (isNameChanged) {
            const prevName = oldPageData.name;
            const prevUri = oldPageData.uri;
            const regExp = new RegExp(`(.*?)(${prevName})$`, 'i');
            // если одновременно меняется uri, используем его для редактирования
            formattedData.uri = isUriChanged
                ? formattedData.uri
                : prevUri.replace(regExp, `$1${formattedName}`);
        }
        formattedData.name = formattedName;

        let oldParentData;
        let newParentData;

        const isParentChanged =
            formattedData.parent && oldPageData.parent !== formattedData.parent;
        if (isParentChanged) {
            await this.checkParentInChildren(formattedData);
            const res = await this.changeUriByParent(
                formattedData,
                oldPageData
            );
            formattedData = res.data;
            oldParentData = res.oldParentData;
            newParentData = res.newParentData;
        }
        const dataWithUrifind =
            formattedData.uri && !isRoot
                ? {
                      ...formattedData,
                      urifind: await this.getUriFind(formattedData.uri),
                  }
                : formattedData;
        const pageData = isRoot
            ? new RootPageDto(dataWithUrifind)
            : new PageDto(dataWithUrifind);
        delete pageData.id;

        const resultData = await PagesModel.updatePage(id, pageData);
        if (resultData) {
            const [, [changedPage]] = resultData;
            if (changedPage) {
                result = new PageDto(changedPage);
            }
        } else {
            throw new ApiError(423, 'Доступ запрещен');
        }

        // изменяем uri у дочерних страниц
        if (isParentChanged) {
            await this.changeUriInChildrenWithRls(
                id,
                oldParentData,
                newParentData
            );
        }

        // изменяем uri у дочерних страниц
        if (isNameChanged || isUriChanged) {
            await this.changeUriInChildren(id, oldPageData.uri, result.uri);
        }

        const pageParamsData = formattedData.params?.map(
            (param) => new PageParamDto(param)
        );
        if (pageParamsData) {
            await PagesModel.updatePageParams(id, pageParamsData);
            // если новые параметры страницы не переданы и шаблон страницы изменился, сбрасываем параметры страницы
        } else if (data.template && data.template !== oldPageData.template) {
            await PagesModel.resetPageParams(id, data.template);
        }

        return result;
    }

    async createPage(data) {
        const page = await PagesModel.createPage({
            content_type: 'application/json',
            ...data,
        });
        return page;
    }

    getUriByDescription(description) {
        return GlobalService.transliterate(description.trim().toLowerCase(), {
            ext_array: { ' ': '_', _: '_', '-': '-', '.': '.' },
            onlyLetters: true,
        });
    }

    async configPage(data) {
        const { parent, description, name, template } = data;
        let { parentUri } = data;

        const pageData = new PageDto(data);
        if (!name && !description) {
            throw ApiError.BadRequest('Отсутствует имя или описание страницы');
        }

        // если name отсутствует, генерируем из description
        const formattedName = this.getUriByDescription(name || description);
        const editedPageData = {
            ...pageData,
            name: formattedName,
        };

        if (
            parentUri === '' &&
            parent !== '00000000-0000-0000-0000-000000000000'
        ) {
            const dataPage = await this.checkPage(parent);
            parentUri = dataPage.uri;
        }

        if (template) {
            const templateData = await TemplatesModel.GetTemplate(template);
            if (!templateData)
                throw ApiError.BadRequest('Такой шаблон не найден');
            editedPageData.template = templateData.id;
        }

        editedPageData.uri =
            parentUri === ''
                ? `${editedPageData.name}`
                : `${parentUri}/${editedPageData.name}`;
        editedPageData.urifind = await this.getUriFind(editedPageData.uri);

        return editedPageData;
    }

    // перегружено в rls-ext-page
    async addPage(data, resetPage = false) {
        const editedPageData = await this.configPage(data);

        let page = await PagesModel.getPageByUri(editedPageData.uri, {
            filter: { where: { markdel: '10' } },
            attributes: {
                include: 'markdel',
            },
        });

        if (page && page.markdel === 1) {
            this.editPage(
                page.id,
                { editedPageData, markdel: 0 },
                { filter: { where: { markdel: '10' } } }
            );
        } else if (page && page.markdel === 0) {
            throw ApiError.BadRequest('Страница с таким uri уже существует');
        } else {
            page = await this.createPage(editedPageData);
        }

        if (data.template && resetPage) {
            await PagesModel.resetPageParams(page.id, data.template);
        }
        return new PageDto(page);
    }

    async addPageWithParams(data, paramsData) {
        const newPage = await this.addPage(data);
        await this.updatePageParams(newPage.id, paramsData);
        return newPage;
    }

    async editPublicPageParamByName(id, paramName, data) {
        let result = { result: false };
        const pagesInfo = await this.getPage(id, { force: true });
        const tParams = await TemplatesService.getTemplateParams(
            pagesInfo.template
        );
        const fParam = tParams.filter((el) => el.name === paramName);
        if (fParam.length > 0) {
            result = await this.editPageParam(id, fParam[0].id, data);
        }
        return result;
    }

    async editPageParam(pageId, templateParamId, data) {
        await TemplatesModel.checkTemplateParam(templateParamId);
        const page = await this.checkPage(pageId);
        const pageParamData = new PageParamDto(data);
        delete pageParamData.id;
        const formattedValue =
            typeof data.value === 'object'
                ? JSON.stringify(data.value)
                : data.value;
        const formattedData = { value: formattedValue };
        const editResult = await PagesModel.editPageParam(
            pageId,
            templateParamId,
            formattedData
        );

        let params = page.PageParams ?? [];
        if (Array.isArray(editResult)) {
            const [, [editedParam]] = editResult;
            params = params.map((param) =>
                param.id === editedParam?.id ? editedParam : param
            );
        } else if (editResult) {
            params.push(editResult);
        }

        const result = {
            ...page,
            PageParams: params,
        };
        return new PageDto(result);
    }

    // расширен в fulltextindex-pages (after)
    // расширено в rls-ext-page (before)
    // не изменять имена параметров
    async editPageParamById(pageParamId, data) {
        const { value } = data;

        const result = await PagesModel.editPageParamByID(pageParamId, {
            value,
        });

        const [, [pageParamData]] = result;

        if (!pageParamData) {
            throw ApiError.BadRequest('Такого параметра шаблона не существует');
        }

        return result;
    }

    async getPage(id, options = {}) {
        return PagesModel.getPage(id, options);
    }

    async getPages(ids, options = {}) {
        return PagesModel.getPages(ids, options);
    }

    /**
     * Получение дочерних элементов страницы
     * @param {string} id UUID страницы
     * @param {*} options
     * @returns
     */
    async getPageChildren(id, options = {}) {
        await this.checkPage(id, options);
        const result = await PagesModel.getPageChildrenWithMeta(id, options);

        return result;
    }

    /**
     * Метод получения дерева дочерних элементов
     * @description
     * Перегрузки:
     * - Добавление данных о Rls (rls-ext-page, getPageTreeAfter)
     * @param {string} id UUID родительского элемента
     * @param {object} options Дополнительные параметры запроса
     * @param {boolean} [options.force] Флаг пропуска загрузки rls по элементам
     * @param {object} [options.where] Фильтры запроса
     * @param {string[]} [options.attributes] Колонки для выборки
     * @returns {Promise<object>} Возвращает дочерние элементы в виде дерева
     */
    async getPageTree(id, options = {}) {
        // Получаем страницу с списком дочерних элементов
        const page = await PagesModel.getPageWithFamily(id, options);
        const children = page?.descendants || [];

        if (!children.length) {
            return [];
        }

        const where =
            options?.where && typeof options.where === 'object'
                ? options.where
                : {};
        const hasMarkDel = where.hasOwnProperty('markdel');
        const hasActive = where.hasOwnProperty('active');

        // Подготавливаем список элементов
        const tree = children.reduce(
            (acc, child) => {
                if (
                    (hasMarkDel && child.markdel !== where.markdel) ||
                    (hasActive && child.active !== where.active)
                ) {
                    return acc;
                }

                acc[child.id] = { ...child, children: [] };
                return acc;
            },
            { [id]: { ...page, children: [] } }
        );

        // Строим иерархию в дереве
        for (const key in tree) {
            const parentId = tree[key].parent;

            if (parentId && tree[parentId]) {
                tree[parentId].children.push(tree[key]);
            }
        }

        return tree[id].children;
    }

    /**
     * Метод получения информации о странице, ее родителях и дочерних элементах
     * @param {string} id UUID страницы
     * @param {object} [options] Дополнительные параметры
     * @param {string[]} [options.attributes] Колонки для выборки
     * @param {object} [options.transaction] Транзакция
     * @returns
     */
    async getPageWithFamily(id, options) {
        return PagesModel.getPageWithFamily(id, options);
    }

    async editPublicPageParamById(paramId, data) {
        const result = await this.editPageParamById(paramId, data);
        return result;
    }

    async getFullPageChildren(parentId, options = {}) {
        let fullChildren = [];
        const children = await this.getPageChildren(parentId, options);
        const userInfos = {};
        for (const index in children) {
            const pageObject = { ...children[index] };

            pageObject.params = [];
            pageObject.paramsValues = {};

            // TODO по хорошему нужно использовать только getPageParams и передавать либо id страницы, либо link
            if (pageObject.link === '00000000-0000-0000-0000-000000000000') {
                pageObject.params = await this.getPageParamsByTemplate(
                    pageObject.id,
                    pageObject.template
                );
                pageObject.params.map((param) => {
                    if (
                        param.name === 'createdUser' &&
                        param.value &&
                        options.withUsers
                    )
                        userInfos[param.value] = null;
                    pageObject.paramsValues[param.name] = param.value;
                });
            } else {
                const pageParams = await this.getPageParams(pageObject.link);
                pageParams.map((param) => {
                    pageObject.params.push({
                        id: param.templateparamsid,
                        value: param.value,
                        name: param.params,
                        type: param.paramtype,
                    });
                    pageObject.paramsValues[param.params] = param.value;
                });
            }
            fullChildren.push(pageObject);
        }

        if (options.withUsers) {
            const users = await UsersModel.getUsers(Object.keys(userInfos));
            users.forEach((user) => {
                const userPlain = user.get({ plain: true });
                userInfos[userPlain.id] = user.UserInfo.name;
            });
            fullChildren.forEach(
                (child) =>
                    (child.createdUser =
                        userInfos[child?.paramsValues?.createdUser])
            );
        }

        if (options.sortBy) {
            fullChildren.sort((row1, row2) => {
                let a = row1[options.sortBy]?.length;
                let b = row2[options.sortBy]?.length;

                if (options.sortBy === 'businessBlock') {
                    a = JSON.parse(row1.paramsValues?.impact || '[]')?.length;
                    b = JSON.parse(row2.paramsValues?.impact || '[]')?.length;
                }

                if (options.sortBy === 'id') {
                    a = Date.parse(row1.paramsValues?.code) || 0;
                    b = Date.parse(row2.paramsValues?.code) || 0;
                }

                if (options.sortBy === 'date') {
                    a = Date.parse(row1.paramsValues?.createdDate) || 0;
                    b = Date.parse(row2.paramsValues?.createdDate) || 0;
                }
                return options.sort === 'asc' ? a - b : b - a;
            });
        }

        if (options?.search) {
            fullChildren = fullChildren.filter((child) => {
                return JSON.stringify(child).includes(options.search);
            });
        }

        if (options.filter?.where) {
            fullChildren = fullChildren.filter((child) => {
                if (options.filter?.where?.initiator)
                    return child.createdUser
                        ?.toLocaleLowerCase()
                        .includes(
                            options.filter?.where?.initiator.toLocaleLowerCase()
                        );
                if (options.filter?.where?.type)
                    return child.paramsValues.type.includes(
                        options.filter?.where?.type
                    );
                if (options.filter?.where?.businessBlock)
                    return JSON.parse(child.paramsValues.impact || '[]')
                        .map((bb) => String(bb).toLocaleLowerCase())
                        ?.includes(
                            options.filter?.where?.businessBlock?.toLocaleLowerCase()
                        );
                return true;
            });
        }

        if (options.limit) {
            const total = fullChildren.length;
            const page = Math.floor(options.offset / options.limit) + 1;
            return {
                children: fullChildren.slice(
                    options.offset || 0,
                    page * options.limit
                ),
                total,
            };
        }

        return { children: fullChildren };
    }

    async getFullListPageParents(id) {
        let fullParents = [];
        const page = await this.getPage(id);
        if (page.parent !== '00000000-0000-0000-0000-000000000000') {
            const parents = await this.getFullListPageParents(page.parent);
            fullParents = [...parents, page];
        } else {
            fullParents.push(page);
        }

        return fullParents;
    }

    async checkPageUri(uri, options) {
        const page = await PagesModel.getPageByUri(uri, options);
        if (page) {
            throw ApiError.BadRequest('Страница с таким uri уже существует');
        }
        return page;
    }

    async getVirtualURLs(uri) {
        // Получим список всех возможных страниц
        let findUri = [];
        const findStarUri = [];
        const uriArray = uri.split('/');
        const templateUri = [];
        templateUri.length = uriArray.length;
        templateUri.fill(':p');

        const lengthArray = uriArray.length;
        const starUri = [];
        for (const key in uriArray) {
            const substr = uriArray[key];
            templateUri[parseInt(key)] = substr;
            findUri.push(templateUri.join('/'));

            if (parseInt(key) !== lengthArray - 1) {
                starUri.push(substr);
                findStarUri.push([...starUri, '*'].join('/'));
            }
        }
        findUri = [...findStarUri, ...findUri];
        findUri.reverse(); // Отсортируем их по наибольшей важности

        return { findUri, uriArray };
    }

    async getParamsFromURL(regexPages, uriArray) {
        let page = false;
        const pageParams = {};
        if (regexPages.length > 0) {
            page = regexPages[0];

            const templateFromPage = page.uri;
            const templateUriArray = templateFromPage.split('/');

            const regexp = /:([\d|\w]+)/gm;
            let matchAll = templateFromPage.matchAll(regexp);
            matchAll = Array.from(matchAll);
            if (matchAll.length > 0) {
                // Есть совпадения, сформируем массив параметров
                matchAll.map((value) => {
                    const name = value[1];
                    const indexParam = templateUriArray.indexOf(value[0]);
                    if (indexParam >= 0) {
                        if (pageParams[name] === undefined) {
                            pageParams[name] = uriArray[indexParam];
                        } else {
                            // TODO не знаю когда сможет пригодится, но возможно можно именовать параметры с одинаковыми именами
                            // Сейчас так не работает
                            // let oldValue = Array.isArray(pageParams[name]) ? pageParams[name]: [pageParams[name]];
                            // oldValue.push(uriArray[indexParam]);
                            // pageParams[name] = oldValue;
                        }
                    }
                });
            }
        }
        return { page, pageParams };
    }

    async getPageFromURL(uri, active = 1) {
        const { findUri, uriArray } = await this.getVirtualURLs(uri);

        const regexForcePages = await PagesModel.getPagesFromURIs(
            findUri,
            1,
            true
        );
        const regexPages = await PagesModel.getPagesFromURIs(findUri, 1);

        let { page, pageParams } = await this.getParamsFromURL(
            regexPages,
            uriArray
        );

        if (page) {
            if (page.link !== '00000000-0000-0000-0000-000000000000') {
                // Если это ссылка, то перечитаем страницу
                page = await PagesModel.GetPage(page.link); // Page.findOne({where: {id: page.link}})
            }
            page = page.get({ raw: true });

            if (page) {
                const template = await TemplatesModel.GetTemplate(
                    page.template
                );

                const templateBody = {
                    form: template ? template.data : '',
                    script: template ? template.script : '',
                };
                const Params = await PagesModel.GetPageParams(page.id);

                // если в шаблоне присутствуют параметры, которые не были записаны в PageParams, добавляем пустой параметр для синхронизации рендера
                const pageParamsHash = Params.reduce((acc, pageParam) => {
                    acc[pageParam.template_param_id] = true;
                    return acc;
                }, {});
                template?.TemplateParams?.forEach((templateParam) => {
                    if (!pageParamsHash[templateParam.id]) {
                        const emptyParam = {
                            id: 'GENERATED_EMPTY_PARAM',
                            page_id: page.id,
                            template_param_id: templateParam.id,
                            value: '',
                            name: templateParam.name,
                            paramtype: templateParam.ParamsType.type,
                        };
                        Params.push(emptyParam);
                    }
                });

                page.Template = templateBody;
                page.PagesParams = Params;
                page.UrlParams = pageParams;
            }
        }

        if (regexForcePages.length > regexPages.length && !page) {
            // Страница заблокирована
            throw ApiError.AccessRestricted('Доступ к странице отсутствует');
        }

        if (!page) {
            throw new ApiError(404, `${MSG_ERROR_EXIST_PAGE}: ${uri}`);
        }

        return page;
    }

    async renderTemplate(id, params) {
        const page = {};

        const template = await TemplatesModel.GetTemplate(id);
        const templateBody = {
            form: template ? template.data : '',
            script: template ? template.script : '',
        };

        page.Template = templateBody;
        page.PagesParams = params;
        // page.UrlParams = pageParams;

        return page;
    }

    async checkPage(id, options) {
        const page = await PagesModel.checkPage(id, options);

        if (!page) {
            throw ApiError.BadRequest(MSG_ERROR_EXIST_PAGE);
        }

        return page;
    }

    // todo определить нужно ли глубокое копирование, доавить удаление старых родительских доступов и установку новых (rls)
    // todo устанавливаем все доступы источника, затем удаляем все доступы родителя источника и устанавливаем все доступы нового родителя
    async copyPage(copyPageId, newName) {
        let result = { result: false };

        const copyPage = await this.getPage(copyPageId);
        const copyPageParams = await this.getPageParams(copyPageId);
        const editParams = copyPageParams.map((param) => {
            delete param.id;
            param.id = param.templateparamsid;
            delete param.templateparamsid;
            return param;
        });
        copyPage.params = editParams;

        const newPage = await this.addPage({
            parentUri: '',
            parent: copyPage.parent,
            description: newName,
        });
        copyPage.id = newPage.id;
        copyPage.uri = newPage.uri;
        copyPage.name = newPage.name;
        copyPage.description = newPage.description;

        try {
            result = await this.editPage(newPage.id, copyPage);
        } catch (e) {
            // todo удалить созданную страницу и выбросить ошибку о невозможности создания
        }

        return result;
    }

    // todo определить нужность рекурсивного изменения прав у удаленных элементов
    async getPageChildrenIdNested(pageId, markdel = [0, 1], transaction) {
        const pageFamily = await PagesModel.getPageWithFamily(pageId, {
            where: { markdel },
            transaction,
        });
        return pageFamily?.descendants ?? [];
    }

    async replaceUri(item, prevParentUri, nextParentUri) {
        const newUri = await this.buildUri(
            item.uri,
            prevParentUri,
            nextParentUri
        );
        const urifind = await this.getUriFind(newUri);
        await PagesModel.updatePage(item.id, {
            uri: newUri,
            urifind,
        });
    }

    async buildUri(uri, prevParentUri, nextParentUri) {
        const pattern =
            nextParentUri === '' ? `${prevParentUri}/` : prevParentUri;
        const regExp = new RegExp(`^${pattern}`);
        const uriForReplace =
            prevParentUri === '' ? `${nextParentUri}/` : nextParentUri;
        return uri.replace(regExp, uriForReplace);
    }

    async getUriFind(uri) {
        return uri.replace(/(:[\d|\w]+)/gm, ':p');
    }

    // TODO позже удалить и переехать на getPageChildrenWithParamsAndUsersWithOptions
    async getPageChildrenWithParamsAndUsers(pageId, active, order) {
        const newOrder = order ?? 'ASC';
        return PagesModel.getPageChildrenWithParamsAndUsers(
            pageId,
            active,
            newOrder
        );
    }

    async getPageChildrenWithParamsAndUsersWithOptions(pageId, options) {
        return PagesModel.getPageChildrenWithParamsAndUsersWithOptions(
            pageId,
            options
        );
    }

    async getPageChildrenWithParams(pageId, active, order, markdel) {
        const newActive = active ?? 1;
        const newOrder = order ?? 'ASC';
        const newMarkdel = markdel ?? 0;
        return PagesModel.getPageChildrenWithParams(
            pageId,
            newActive,
            newOrder,
            newMarkdel
        );
    }

    async restorePage(id) {
        let result;

        const options = {
            filter: {
                where: {
                    markdel: '1',
                },
            },
        };
        const dataForUpdate = { markdel: 0 };

        await this.checkPage(id, options);

        const editedRecords = await PagesModel.updatePage(id, dataForUpdate);
        if (editedRecords) {
            [, [result]] = editedRecords;
        }
        return result;
    }

    async setRanks(parentId, pages) {
        const promiseUpdate = pages.map((page, rank) =>
            PagesModel.updatePage(page.id, { rank })
        );
        return Promise.all(promiseUpdate);
    }

    async createPageByUri(pageData, uri, options = {}) {
        if (!uri) {
            throw ApiError.BadRequest('Отсутствует uri для создания');
        }

        if (!pageData.name && !pageData.description) {
            throw ApiError.BadRequest('Отсутствует имя или описание страницы');
        }

        const dividedUri = uri.split('/').filter((el) => el !== '');

        let currentParentUri = '';
        let currentParent = PAGE_ROOT_ID;

        for (const partUri of dividedUri) {
            const formattedPartUri = GlobalService.transliterateMis(partUri);
            const newUri =
                currentParentUri === ''
                    ? formattedPartUri
                    : `${currentParentUri}/${formattedPartUri}`;

            // данные для создания промежуточных страниц(папок)
            const { betweenTemplate } = options;
            const betweenPageData = {
                ...(betweenTemplate ? { template: betweenTemplate } : {}),
                description: partUri,
                parentUri: currentParentUri,
                parent: currentParent,
                active: betweenTemplate ? 1 : 0,
            };

            if (options.restore) {
                betweenPageData.markdel = 0;
            }

            const currPage = await PagesModel.getPageByUri(newUri);
            const newPage = currPage
                ? await this.editPage(currPage.id, betweenPageData)
                : await this.addPage(betweenPageData);

            currentParent = newPage.id;
            currentParentUri = newUri;
        }

        // данные для создания последней страницы в иерархии
        const targetPageData = {
            ...pageData,
            parent: currentParent,
            parentUri: currentParentUri,
        };

        if (options.restore) {
            targetPageData.markdel = 0;
        }

        const targetPageName = targetPageData.name
            ? targetPageData.name
            : GlobalService.transliterateMis(targetPageData.description);
        const targetPageUri =
            currentParentUri === ''
                ? targetPageName
                : `${currentParentUri}/${targetPageName}`;

        const existedTargetPage = await PagesModel.getPageByUri(targetPageUri);
        // если страницы с таким uri уже есть, обновляем ее данные, в противном случаем создаем
        const resultTargetPage = existedTargetPage
            ? await this.editPage(existedTargetPage.id, targetPageData)
            : await this.addPage(targetPageData);

        // если в шаблоне страницы есть параметр типа fileLink (ссылка на файл) и options.attachedFile = UUID
        // прикрепляем этот UUID к странице
        if (options.attachedFile) {
            await this.attachFileToPage(
                resultTargetPage.id,
                options.attachedFile
            );
        }

        return resultTargetPage;
    }

    async attachFileToPage(pageId, fileId, paramId = null) {
        const page = await this.checkPage(pageId);
        const templateParamsPage = await TemplatesModel.getTemplateParams(
            page.template
        );
        const pageFileLinkParam = paramId
            ? templateParamsPage.find((param) => param.id === paramId)
            : templateParamsPage.find(
                  (param) => param.ParamsType.type === 'filelink'
              );

        if (pageFileLinkParam) {
            const paramData = {
                value: fileId,
            };
            await this.editPageParam(pageId, pageFileLinkParam.id, paramData);
            return page;
        }
        return undefined;
    }

    async updatePageParams(pageId, params) {
        return PagesModel.updatePageParams(pageId, params);
    }

    async getCountPageChildren(pageId, options = {}) {
        const count = await PagesModel.getCountPageChildren(pageId, options);
        return count;
    }

    async getPageChildrenSortedByParamId(parentIds, paramId, options) {
        return PagesModel.getPageChildrenSortedByParamId(
            parentIds,
            paramId,
            options
        );
    }

    async getPageByParamId(paramId, options) {
        return PagesModel.getPageByParamId(paramId, options);
    }

    async checkPageByParamId(paramId) {
        const page = await PagesModel.getPageByParamId(paramId);
        if (!page) {
            throw ApiError.BadRequest(MSG_ERROR_EXIST_PAGE);
        }
        return page;
    }

    async getPagesWithoutChildren(ids, options) {
        return PagesModel.getPagesWithoutChildren(ids, options);
    }
}

module.exports = PagesService;
