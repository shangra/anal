const { Template, ParamsType, TemplateParam, FamilyTemplate } = sreda.models;
const TemplateDto = require('../../db/dtos/template-dto');
const ApiError = require('../../../../core/exceptions/ApiError');
const TemplateQueryDto = require('../../db/dtos/template-query-dto');
const sequelize = require('../../../../core/db/connection');

class TemplatesModel {
    /** *********************** Templates  ********************* */

    static async getListTypes() {
        return ParamsType.findAll({ attributes: ['id', 'name', 'type'] });
    }

    static async GetListTemplates() {
        return Template.findAll({
            attributes: ['id', 'name', ['name', 'value']],
            order: [['id', 'ASC']],
        });
    }

    static async AddTemplate(name) {
        const template = await Template.create({ name });
        return { id: template.id, name };
    }

    static async GetTemplateBody(id) {
        const template = await Template.findOne({ where: { id } });
        return template === null ? '' : template.data;
    }

    static async GetTemplate(id) {
        const template = await Template.findOne({
            where: {
                id,
            },
            include: [
                {
                    model: TemplateParam,
                    where: {
                        markdel: 0,
                    },
                    required: false,
                    include: [
                        {
                            model: ParamsType,
                            attributes: ['name', 'type'],
                        },
                    ],
                },
            ],
        });
        return template?.get({ plain: true });
    }

    static async GetTemplateParams(id, markdel = 0) {
        const sql = `SELECT tp.id, tp.name, tp.params_type_id AS type, pt.name AS typename, pt.type AS paramtype
                     FROM "${sreda.env.DB_SCHEMA}"."TemplateParams" AS tp
                              LEFT JOIN "${sreda.env.DB_SCHEMA}"."ParamsTypes" AS pt ON tp.params_type_id = pt.id
                     WHERE tp.template_id = :id
                       AND tp.markdel = :markdel
                     ORDER BY tp.name`;
        const result = await sequelize.query(sql, { replacements: { id, markdel } });
        return result[0];
    }

    static async SetTemplateBody(id, data) {
        await Template.update({ data }, { where: { id } });
        return { result: true };
    }

    static async MarkDelTemplateParams(arrayIds) {
        await TemplateParam.update({ markdel: 1 }, { where: { id: arrayIds } });
        return { result: true };
    }

    static async SetTemplateParams(id, data) {
        for (const key in data) {
            const item = data[key];
            if (item.id !== undefined) {
                const fieldid = item.id;
                delete item.id;
                await TemplateParam.update({ ...item }, { where: { id: fieldid } });
            } else {
                await TemplateParam.create({ ...item });
            }
        }

        return { result: true };
    }

    static async SetTemplateName(id, data) {
        await Template.update({ ...data }, { where: { id } });
        return { result: true };
    }

    static async DelTemplateParams() {
        // this.delete("TemplatesParams", {"templateid": id});
        await TemplateParams.destroy({ where: { template_id } });
        return { result: true };
    }

    static async delTemplate(id) {
        await Template.destroy({ where: { id } });
        return { result: true };
    }

    static async getAllTemplates(options = {}) {
        const formattedOptions = await TemplateQueryDto.normalizeQuery(options.filter ?? {});
        const currentOptions = {
            order: [['name', 'ASC']],
        };
        const extendedOptions = await formattedOptions.getOptions(currentOptions);

        const templates = await Template.showAll(extendedOptions);
        return templates.map((template) => new TemplateDto(template));
    }

    static async getTemplateParams(id, options = {}) {
        const templateId = id ?? '00000000-0000-0000-0000-000000000000';
        const formattedOptions = await TemplateQueryDto.normalizeQuery(options.filter ?? {});
        const currentOptions = {
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
            order: [['name', 'ASC']],
        };
        const extendedOptions = await formattedOptions.getOptions(currentOptions);

        const params = await TemplateParam.findAll(extendedOptions);
        return params.map((param) => param.get({ plain: true }));
    }

    static async checkTemplateParam(id) {
        const templateParam = await TemplateParam.findOne({
            where: {
                id,
            },
        });
        if (!templateParam) {
            throw ApiError.BadRequest('Такого параметра шаблона не существует');
        }
        return templateParam;
    }

    static async getTemplateChildren(id, markdel = 0) {
        return Template.findAll({
            where: {
                parent: id,
                markdel,
            },
            force: true,
        });
    }

    static async editTemplate(id, data) {
        return Template.update(data, {
            where: { id },
            returning: true,
        });
    }

    static async getTemplateWithFamily(templateId, options = {}) {
        const { transaction } = options;
        return FamilyTemplate.findOne({
            where: {
                id: templateId,
            },
            transaction,
        });
    }

    static async getTemplate(id, options = {}) {
        const formattedOptions = await TemplateQueryDto.normalizeQuery(options.filter ?? {});
        const currentOptions = {
            where: {
                id,
            },
            attributes: {
                include: 'markdel',
            },
            include: [
                {
                    model: Template,
                    as: 'ParentInfo',
                },
            ],
        };
        const extendedOptions = await formattedOptions.getOptions(currentOptions);

        const template = await Template.findOne(extendedOptions);
        return template ? template.get({ plain: true }) : template;
    }

    static async checkTemplate(id, options = {}) {
        // удаляем возможные пропсы limit, offset в объекте фильтрации
        // они прокидываются сквозным образом через queryDto и не актуальны для данного сервиса
        const cleanedOptions = await TemplateQueryDto.cleanCheckOptions(options.filter ?? {});

        return this.getTemplate(id, { filter: cleanedOptions });
    }
}

module.exports = TemplatesModel;
