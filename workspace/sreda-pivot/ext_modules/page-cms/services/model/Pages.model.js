const {
    Page,
    PageParam,
    Template,
    ParamsType,
    TemplateParam,
    UserData,
    UAttribute,
    FamilyPage,
} = sreda.models; //require('../../../../db/models');
const { Op, QueryTypes } = require('sequelize');
// const { QueryTypes } = require('sequelize');
// const { Op } = Sequelize;
const PageDto = require('../../db/dtos/page-dto');
const PageQueryDto = require('../../db/dtos/page-query-dto');
const TemplatesModel = require('../../../template-cms/services/model/Templates.model');
// const PageDto = require('../../db/dtos/page-dto');
// const PageQueryDto = require('../../db/dtos/page-query-dto');
// const TemplatesModel = require('../../../template-cms/services/model/Templates.model');

const PAGE_ROOT_ID = '00000000-0000-0000-0000-000000000000';

class PagesModel {
    static async pagesMax(field) {
        return Page.max(field);
    }

    static async GetListTemplates() {
        return Template.findAll({
            attributes: ['id', 'name', ['name', 'value']],
            order: [['id', 'ASC']],
        });
    }

    // TODO перед удалением отрефакторить FilesAndFoldersService.GetFullPagesList
    static async GetPagesTree(id) {
        const sql = `SELECT w.id, w.name, COUNT(wcount.id) AS count_children
                     FROM "${process.env.DB_SCHEMA}"."Pages" AS w
                              LEFT JOIN "${process.env.DB_SCHEMA}"."Pages" AS wcount ON w.id = wcount.parent
                     WHERE w.parent = :id
                       AND w.markdel = 0
                       AND w.active = 1
                     GROUP BY w.id, w.name
                     ORDER BY w.name`;
        return sequelize.query(sql, {
            replacements: { id },
            type: QueryTypes.SELECT,
        });
    }

    // static async AddTemplate(name) {
    //     const template = await Template.create({name})
    //     return {"id": template.id, "name": name};
    // }

    // static async GetTemplateBody(id) {
    //     const template = await Template.findOne({where: {id}});
    //     return template === null ? '' : template.data;
    // }

    // static async GetTemplateParams(id, markdel = 0) {
    //     const sql = `SELECT tp.id, tp.name, tp.params_type_id AS type, pt.name AS typename, pt.type AS paramtype
    //                  FROM "${process.env.DB_SCHEMA}"."TemplateParams" AS tp
    //                           LEFT JOIN "${process.env.DB_SCHEMA}"."ParamsTypes" AS pt ON tp.params_type_id = pt.id
    //                  WHERE tp.template_id = :id
    //                    AND tp.markdel = :markdel
    //                  ORDER BY tp.name`;
    //     const result = await sequelize.query(sql, {replacements: {"id": id, "markdel": markdel}});
    //     return result[0];
    // }

    // static async SetTemplateBody(id, data) {
    //     await Template.update({data}, {where: {id}})
    //     return {"result": true};
    // }

    // static async MarkDelTemplateParams(arrayIds) {
    //     await TemplateParam.update({markdel: 1}, {where: {id: arrayIds}})
    //     return {"result": true};
    // }

    // static async SetTemplateParams(id, data) {
    //     for (const key in data) {
    //         const item = data[key];
    //         if (item["id"] !== undefined) {
    //             const fieldid = item["id"];
    //             delete item["id"];
    //             await TemplateParam.update({...item}, {where: {id: fieldid}})
    //         } else {
    //             await TemplateParam.create({...item})
    //         }
    //     }
    //
    //     return {"result": true};
    // }

    // static async SetTemplateName(id, data) {
    //     await Template.update({...data}, {where: {id}})
    //     return {"result": true};
    // }

    // static async delTemplate(id) {
    //     await Template.destroy({where: {id}})
    //     return {"result": true};
    // }

    /** *********************** Pages  ********************* */

    static async SetPage(id, data) {
        delete data.id;
        return Page.update({ ...data }, { where: { id } });
    }

    static async GetPage(id, force = false) {
        return Page.findOne({ where: { id }, force });
    }

    static async GetPageParamsOptions(options) {
        const pageParams = await PageParam.findAll({
            attributes: ['id', 'page_id', 'template_param_id', 'value'],
            where: options.where,
            include: [
                {
                    model: TemplateParam,
                    attributes: ['name'],
                    required: false,
                    include: [
                        {
                            model: ParamsType,
                            attributes: ['type'],
                            required: false,
                        },
                    ],
                },
            ],
        });

        const result = pageParams.map((value) => {
            const data = value.get({ raw: true });
            data.name = data.TemplateParam.name;
            data.paramtype = data.TemplateParam.ParamsType.type;
            delete data.TemplateParam;
            return data;
        });
        return result;
    }

    static async getPagesByParams(params, options = {}) {
        const includes = Object.entries(params).reduce(
            (acc, [paramName, paramValue]) => {
                if (!paramValue) return acc;

                acc.push({
                    model: PageParam,
                    required: true,
                    include: {
                        model: TemplateParam,
                        where: { name: paramName },
                        required: true,
                    },
                    where: { value: paramValue },
                });

                return acc;
            },
            []
        );

        const pages = await Page.findAll({
            ...options,
            include: includes,
        });

        return pages.map((page) => new PageDto(page.get({ plain: true })));
    }

    static async GetPageParams(id) {
        return PagesModel.GetPageParamsOptions({ where: { page_id: id } });
    }

    static async GetPagesWhereParams(type, value) {
        return PagesModel.GetPageParamsOptions({
            where: { value: `${value}` },
        });
    }

    static async DelPageParams(id) {
        const pageParam = await PageParam.findOne({ where: { page_id: id } });
        if (pageParam) {
            await pageParam.destroy();
        }
        return { result: true };
    }

    static async delPage(id) {
        await Page.destroy({ where: { id } });
        return { result: true };
    }

    static async SetMarkdelPageParams(pageId) {
        return PageParam.update({ markdel: 1 }, { where: { page_id: pageId } });
    }

    static async SetPageParams(data) {
        for (const key in data) {
            const item = data[key];
            if (item.id !== undefined) {
                const { id } = item;
                delete item.id;
                item.markdel = 0;
                await PageParam.update({ ...item }, { where: { id } });
            } else {
                await PageParam.create({ ...item });
            }
        }

        return { result: true };
    }

    static preg_match_all(regexp, str) {
        return [...str.matchAll(regexp)];
    }

    static async GetPageFromId(id) {
        const page = await Page.findOne({ where: { id } });
        if (page) {
            page.Template = await TemplatesModel.GetTemplateBody(page.template);
            page.PagesParams = await PagesModel.GetPageParams(page.id);
        }
        return page;
    }

    //------------------------
    static async getAllPages(options = {}) {
        const filter = options.filter ?? {};
        const formattedOptions = await PageQueryDto.normalizeQuery(filter);
        const currentOptions = {
            order: [['name', 'ASC']],
            raw: true,
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        return Page.findAll(extendedOptions);
    }

    static async getAllPagesSimple(options = {}) {
        return Page.findAll(options);
    }

    static async getRootPages() {
        const pages = await Page.findAll({
            where: {
                parent: PAGE_ROOT_ID,
                id: {
                    [Op.ne]: PAGE_ROOT_ID,
                },
            },
        });
        return pages.map((page) => new PageDto(page));
    }

    static async getPage(id, options = {}) {
        const { force } = options;
        const formattedOptions = await PageQueryDto.normalizeQuery(
            options.filter ?? {}
        );
        const currentOptions = {
            where: {
                id,
            },
            force,
            attributes: {
                include: 'markdel',
            },
            include: [
                {
                    model: PageParam,
                    where: {
                        markdel: 0,
                    },
                    required: false,
                    include: TemplateParam,
                },
                {
                    model: Page,
                    as: 'ParentInfo',
                },
                {
                    model: Page,
                    as: 'PageLink',
                },
                {
                    model: Template,
                },
            ],
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        const page = await Page.findOne(extendedOptions);
        return page ? page.get({ plain: true }) : page;
    }

    static async checkPage(id, options = {}) {
        // удаляем возможные пропсы limit, offset в объекте фильтрации
        // они прокидываются сквозным образом через queryDto и не актуальны для данного сервиса
        const cleanedOptions = await PageQueryDto.cleanCheckOptions(
            options.filter ?? {}
        );

        return this.getPage(id, { filter: cleanedOptions });
    }

    static async getPages(ids, options) {
        const filterOptions = options.filter ?? {};

        const formattedOptions = await PageQueryDto.normalizeQuery(
            filterOptions
        );
        const currentOptions = {
            where: {
                id: ids,
            },
            attributes: {
                include: 'markdel',
            },
            include: [
                {
                    model: PageParam,
                    where: {
                        markdel: 0,
                    },
                    required: false,
                    include: TemplateParam,
                },
            ],
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        const pages = await Page.findAll(extendedOptions);
        return pages ? pages.map((page) => new PageDto(page)) : pages;
    }

    // new api

    static async createPage(data) {
        return Page.create(data);
    }

    static async getTemplateParams(id) {
        const templateId = id ?? PAGE_ROOT_ID;
        return TemplateParam.findAll({
            where: {
                template_id: templateId,
            },
            include: [
                {
                    model: ParamsType,
                    attributes: ['name', 'type'],
                    required: false,
                },
            ],
        });
    }

    static async getPageParams(pageId, params) {
        const pageParams = await PageParam.findAll({
            where: {
                page_id: pageId,
                markdel: {
                    [Op.in]: [1, 0],
                },
                template_param_id: {
                    [Op.in]: params,
                },
            },
            include: TemplateParam,
        });
        const paramValues = {};
        pageParams.forEach((el) => {
            paramValues[el.template_param_id] = el.value;
        });
        return paramValues;
    }

    static async updatePage(id, data) {
        return Page.update(data, {
            where: {
                id,
            },
            returning: true,
        });
    }

    static async updatePageParams(pageId, data) {
        await PageParam.destroy({
            where: {
                page_id: pageId,
            },
        });
        for (const param of data) {
            // TODO переделать на promise.all
            const templateParamId = param.id;
            const { value } = param;
            await TemplatesModel.checkTemplateParam(templateParamId);
            const pageParam = await PageParam.findOne({
                where: {
                    page_id: pageId,
                    template_param_id: templateParamId,
                    markdel: [0, 1],
                },
            });
            if (pageParam) {
                pageParam.value = param.value;
                pageParam.markdel = 0;
                await pageParam.save();
            } else {
                await PageParam.create({
                    value,
                    template_param_id: templateParamId,
                    page_id: pageId,
                });
            }
        }
    }

    static async editPageParam(pageId, templateParamId, data) {
        const pageParam = await PageParam.findOne({
            where: {
                page_id: pageId,
                template_param_id: templateParamId,
                markdel: [0, 1],
            },
        });
        if (pageParam) {
            data.markdel = 0;
            return PageParam.update(data, {
                where: {
                    page_id: pageId,
                    template_param_id: templateParamId,
                },
                returning: true,
            });
        }
        return PageParam.create({
            page_id: pageId,
            template_param_id: templateParamId,
            value: data.value,
        });
    }

    static async editPageParamByID(pageParamId, data) {
        return PageParam.update(data, {
            where: {
                id: pageParamId,
            },
            returning: true,
        });
    }

    static async getPageChildren(id, markdel = 0) {
        return Page.findAll({
            where: {
                parent: id,
                markdel,
            },
            force: true,
        });
    }

    static async getPagesFromURIs(findUri, active = 1, force = false) {
        return Page.findAll({
            where: {
                [Op.and]: [{ urifind: { [Op.in]: findUri } }, { active }],
            },
            force,
        });
    }

    static async getPageChildrenWithParamsAndUsersWithOptions(
        pageId,
        options = {}
    ) {
        const formattedOptions = await PageQueryDto.normalizeQuery(
            options.filter ?? {}
        );

        const currentOptions = {
            where: {
                parent: pageId,
            },
            attributes: {
                include: ['markdel'],
            },
            include: [
                {
                    model: PageParam,
                    include: [TemplateParam],
                },
                {
                    model: UserData,
                    include: [UAttribute],
                },
                {
                    model: Page,
                    as: 'ParentInfo',
                },
            ],
        };

        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );

        const defaultOptions = {
            order: [['createdAt', 'DESC']],
        };
        const optionsWithDefault = {
            ...extendedOptions,
            order: extendedOptions.order
                ? extendedOptions.order
                : defaultOptions.order,
        };

        const pages = await Page.findAll(optionsWithDefault);
        return pages.map((page) => page.get({ plain: true }));
    }

    static async getPageChildrenWithParamsAndUsers(
        pageId,
        active = 1,
        order = 'ASC'
    ) {
        const query = {
            where: {
                parent: pageId,
                active,
            },
            limit: 100,
            attributes: {
                include: ['markdel'],
            },
            include: [
                {
                    model: PageParam,
                    include: [TemplateParam],
                },
                {
                    model: UserData,
                    include: [UAttribute],
                },
                {
                    model: Page,
                    as: 'ParentInfo',
                },
            ],
            order: [
                ['rank', order],
                ['createdAt', order],
            ],
        };

        return Page.findAll(query);
    }

    static async getPageChildrenWithParams(
        pageId,
        active = 1,
        order = 'ASC',
        markdel = [0]
    ) {
        return Page.findAll({
            where: {
                parent: pageId,
                active,
                markdel,
            },
            attributes: {
                include: ['markdel'],
            },
            include: [
                {
                    model: PageParam,
                    include: [TemplateParam],
                    where: { markdel },
                },
            ],
            order: [
                ['rank', order],
                ['createdAt', order],
            ],
        });
    }

    static async getPageByUri(uri, options = {}) {
        const formattedOptions = await PageQueryDto.normalizeQuery(
            options.filter ?? {}
        );
        const currentOptions = {
            where: {
                uri,
            },
            force: options.force,
        };

        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );

        if (options?.attributes) {
            extendedOptions['attributes'] = options?.attributes;
        }

        const page = await Page.findOne(extendedOptions);
        return page ? page.get({ plain: true }) : page;
    }

    static async getPageChildrenWithMeta(id, options) {
        const formattedOptions = await PageQueryDto.normalizeQuery(
            options.filter ?? {}
        );
        const currentOptions = {
            where: {
                parent: id,
                id: {
                    [Op.ne]: PAGE_ROOT_ID,
                },
            },
            attributes: [
                'code',
                'id',
                'name',
                'description',
                'rank',
                'uri',
                'urifind',
                'parent',
                'active',
                'link',
                'content_type',
                'template',
                'markdel',
                'createdAt',
                'updatedAt',
                'createdUser',
                'updatedUser',
            ],
            group: [
                'Page.id',
                'Page.code',
                'Page.name',
                'Page.description',
                'Page.rank',
                'Page.uri',
                'Page.urifind',
                'Page.parent',
                'Page.active',
                'Page.link',
                'Page.content_type',
                'Page.template',
                'Page.markdel',
                'Page.createdAt',
                'Page.updatedAt',
                'Page.createdUser',
                'Page.updatedUser',
            ],
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );

        const defaultOptions = {
            order: [
                ['rank', 'ASC'],
                ['createdAt', 'ASC'],
            ],
        };
        const optionsWithDefault = {
            ...extendedOptions,
            order: extendedOptions.order
                ? extendedOptions.order
                : defaultOptions.order,
        };

        const children = await Page.showAll(optionsWithDefault);

        const result = children.map((child) => ({ ...new PageDto(child) }));

        if (options.withSubChildren) {
            let itemsToAddChildrends = [];

            for (let i = 0; i < result.length; i++) {
                itemsToAddChildrends.push({
                    parentId: result[i].id,
                    resultItem: result[i],
                });
                while (itemsToAddChildrends.length) {
                    const itemToAddChildren = itemsToAddChildrends.pop();
                    const itemChildren = await Page.showAll({
                        ...optionsWithDefault,
                        where: {
                            parent: itemToAddChildren.parentId,
                            id: {
                                [Op.ne]: PAGE_ROOT_ID,
                            },
                        },
                    });

                    itemToAddChildren.resultItem.children = itemChildren.map(
                        (itemChildren) => ({
                            ...itemChildren.get({ plain: true }),
                            children: [],
                        })
                    );

                    itemChildren.forEach((itemChildren, index) => {
                        const resultItem =
                            itemToAddChildren.resultItem.children[index];
                        itemsToAddChildrends.push({
                            parentId: itemChildren.id,
                            resultItem,
                        });
                    });
                }
            }
        }

        return result;
    }

    /**
     * Получение страницы с вложенностью
     * @param {string} pageId UUID страницы
     * @param {object} options Дополнительные параметры
     * @param {object} [options.where] Дополнительные параметры запроса
     * @param {object} [options.transaction] Транзакция
     * @param {string[]} [options.attributes] Колонки для выборки данных
     * @returns
     */
    static async getPageWithFamily(pageId, options = {}) {
        const { where = {}, transaction, attributes } = options;
        const { markdel = [0, 1], active = [0, 1] } = where;

        return FamilyPage.findOne({
            where: {
                ...where,
                id: pageId,
                markdel,
                active,
            },
            attributes,
            transaction,
        });
    }

    static async getCountPageChildren(pageId, options = {}) {
        const filterOptions = options.filter ?? {};
        const formattedOptions = await PageQueryDto.normalizeQuery(
            filterOptions
        );
        const currentOptions = {
            where: {
                parent: pageId,
            },
        };

        const extendedOptions = await PageQueryDto.mergeOptions(
            formattedOptions,
            currentOptions
        );

        const countOptions = await PageQueryDto.cleanCountOptions(
            extendedOptions
        );
        return Page.countFind(countOptions);
    }

    static async getPageChildrenSortedByParamId(parentIds, paramId, options) {
        const { sortDirection = 'DESC' } = options;

        const formattedOptions = await PageQueryDto.normalizeQuery(
            options.filter
        );

        const currentOptions = {
            include: {
                model: PageParam,
                where: {
                    template_param_id: paramId,
                },
                required: false,
            },
            attributes: {
                include: ['createdAt'],
            },
            where: {
                parent: parentIds,
            },
            order: [
                ['PageParams', 'value', sortDirection],
                ['createdAt', sortDirection],
            ],
            subQuery: false,
        };

        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );

        const result = await Page.findAll(extendedOptions);
        return result;
    }

    static async getPageByParamId(paramId, options = {}) {
        const { filter = {} } = options;
        const formattedOptions = await PageQueryDto.normalizeQuery(filter);
        const currentOptions = {
            include: {
                model: PageParam,
                where: {
                    id: paramId,
                },
                required: true,
            },
            where: {
                markdel: [0, 1],
            },
            raw: true,
            nest: true,
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        return Page.findOne(extendedOptions);
    }

    static async resetPageParams(pageId, templateId) {
        await PageParam.destroy({
            where: {
                page_id: pageId,
            },
        });

        const templateParams = await TemplateParam.findAll({
            where: {
                template_id: templateId,
            },
            raw: true,
            nest: true,
        });

        const resetPageParamsPromises = templateParams.map((param) =>
            this.resetPageParam(pageId, param.id)
        );
        await Promise.all(resetPageParamsPromises);
    }

    static async resetPageParam(pageId, templateParamId, value = undefined) {
        const pageParam = await PageParam.findOne({
            where: {
                page_id: pageId,
                template_param_id: templateParamId,
                markdel: [0, 1],
            },
        });
        if (pageParam) {
            pageParam.markdel = 0;
            pageParam.value = value ?? pageParam.value;
            await pageParam.save();
        } else {
            await PageParam.create({
                value: value ?? '',
                template_param_id: templateParamId,
                page_id: pageId,
            });
        }
    }

    static async getPagesWithoutChildren(ids, options = {}) {
        const { markdel = [0, 1], active = [0, 1], filter = {} } = options;
        const formattedOptions = await PageQueryDto.normalizeQuery(filter);
        const currentOptions = {
            where: {
                [Op.and]: [
                    { markdel },
                    { active },
                    { id: ids },
                    { '$children.id$': null },
                ],
            },
            include: [
                {
                    model: Page,
                    as: 'children',
                    required: false,
                },
            ],
            raw: true,
        };
        const extendedOptions = await formattedOptions.getOptions(
            currentOptions
        );
        return Page.findAll(extendedOptions);
    }
}

module.exports = PagesModel;
