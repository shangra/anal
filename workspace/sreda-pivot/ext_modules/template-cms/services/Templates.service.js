const { Template, TemplateParam, ParamsType } = sreda.models;
const { Op } = require('sequelize');
const TemplateParamDto = require('../db/dtos/templateParam-dto');
const TemplateDto = require('../db/dtos/template-dto');
const TemplateQueryDto = require('../db/dtos/template-query-dto');
const ApiError = require('../../../core/exceptions/ApiError');
const Extensions = require('../../../core/class/Extensions.class');
const TemplatesModel = require('./model/Templates.model');
const { Sequelize } = require('../../../core/db/connection');

class TemplatesService extends Extensions {
    async getListTypes() {
        const result = [];

        const list = await TemplatesModel.getListTypes();

        for (const key in list) {
            const valueDB = list[key];

            const value = {
                id: valueDB.id,
                value: valueDB.name,
                type: valueDB.type,
            };

            result.push(value);
        }

        return result;
    }

    async addTemplate(name) {
        name = name ?? 'new template';
        return TemplatesModel.AddTemplate(name);
    }

    async delTemplate(id) {
        return TemplatesModel.delTemplate(id);
    }

    async setTemplateParams(id, data) {
        const newData = [];

        for (const key in data) {
            const item = data[key];
            const newitem = {
                id: item.id,
                name: item.name,
                template_id: id,
                params_type_id: item.type,
            };
            newData.push(newitem);
        }

        return TemplatesModel.SetTemplateParams(id, newData);
    }

    async preg_match_all(regexp, str) {
        return [...str.matchAll(regexp)];
    }

    async getParamsFromBody(id) {
        const data = await TemplatesModel.GetTemplateBody(id);

        const result = [];

        // Пока кривовато работает
        // const lpParams = await LitePattern.getParams(data);
        // lpParams.forEach((param) => {
        //     result.push(param.split('.').shift());
        // });

        const re = /\[\[\s*(.+?)\s/gm;
        // const rev = /\[\[\s*(.+?)\|/gm;
        const rep = /\[\[\s*(.+?)[\.|\s]/gm; /// {{\s(.+?)\./mg;
        const ifregexp = /\[%\s*if\s+\(\s*(.+?)[\s|\.|)]/gm;
        const forregexp = /\[%\s*for\s+\(\s*(?<reservparam>.+)\s+of\s+(?<param>.+?)[\.|\s|%|)]/gm;
        const setReserve = /\[%\s*let\s+(?<reservparam>.+?)\s*=/gim;
        const set =
            /\[%\s*let\s+(?<reservparam>.+?)\s*=\s*((?<param>[_a-zа-я]{1}[_a-zа-я0-9]*)([\._a-zа-я0-9]*)\s*)%\]/gim; /// \[%\s*let\s+(?<reservparam>.+?)\s*=\s*(?<param>[_a-zа-я]{1}[_a-zа-я0-9]*)/gim;
        const importP = /\[%\s*import\s+(?<param>[_a-zа-я]{1}[_a-zа-я0-9]*)/gimu;

        const reserveParams = [];
        const str = data;
        let matches = [];

        matches = await this.preg_match_all(setReserve, str);
        for (const key in matches) {
            const match = matches[key];
            const reservparam = match.groups.reservparam.trim();
            reserveParams.push(reservparam);
        }

        matches = await this.preg_match_all(set, str);
        for (const key in matches) {
            const match = matches[key];
            const param = match.groups.param.trim();
            if (param !== '') {
                result.push(param);
            }

            const reservparam = match.groups.reservparam.trim();
            if (param !== '') {
                reserveParams.push(reservparam);
            }
        }

        matches = await this.preg_match_all(forregexp, str);
        for (const key in matches) {
            const match = matches[key];
            const param = match.groups.param.trim();
            if (param !== '') {
                if (!reserveParams.includes(param)) {
                    result.push(param);
                }
            }

            const reservparam = match.groups.reservparam.trim();
            if (param !== '') {
                reserveParams.push(reservparam);
            }
        }

        matches = await this.preg_match_all(re, str);
        for (const key in matches) {
            const match = matches[key];
            if (match[1].indexOf('|') === -1 && match[1].indexOf('.') === -1) {
                const param = match[1].trim();
                if (!reserveParams.includes(param)) {
                    result.push(param);
                }
            }
        }

        matches = await this.preg_match_all(importP, str);
        for (const key in matches) {
            const match = matches[key];
            if (match[1].indexOf('|') === -1 && match[1].indexOf('.') === -1) {
                const param = match[1].trim();
                if (!reserveParams.includes(param)) {
                    result.push(param);
                }
            }
        }

        matches = await this.preg_match_all(rep, str);
        for (const key in matches) {
            const match = matches[key];
            const param = match[1].trim();
            if (!reserveParams.includes(param)) {
                result.push(param);
            }
        }

        matches = await this.preg_match_all(ifregexp, str);
        for (const key in matches) {
            const match = matches[key];
            const param = match[1].trim();
            if (!reserveParams.includes(param)) {
                result.push(param);
            }
        }

        return result;
    }

    async setBodyTemplate(id, content) {
        const result = await TemplatesModel.SetTemplateBody(id, content);

        const newparams = await this.getParamsFromBody(id);
        const nowparams = await TemplatesModel.GetTemplateParams(id);

        const newdata = [];
        for (const key in newparams) {
            const newparam = newparams[key];

            let saveparam = [];
            for (const key2 in nowparams) {
                const nowparam = nowparams[key2];
                if (newparam === nowparam.name) {
                    saveparam = {
                        id: nowparam.id,
                        name: nowparam.name,
                        template_id: id,
                        params_type_id: nowparam.type,
                    };
                }
            }
            if (saveparam.length === 0) {
                saveparam = {
                    name: newparam,
                    template_id: id,
                    params_type_id: 1,
                };
            }

            newdata.push(saveparam);
        }

        const fordel = [];
        for (const key in nowparams) {
            const nowparam = nowparams[key];

            let markdel = true;
            for (const key2 in newdata) {
                const newparam = newdata[key2];
                if (nowparam.name === newparam.name) {
                    markdel = false;
                }
            }

            if (markdel) {
                fordel.push(nowparam.id);
            }
        }

        // Удалить неактивные параметры!!!
        if (fordel.length > 0) {
            await TemplatesModel.MarkDelTemplateParams(fordel);
        }

        const delparams = await TemplatesModel.GetTemplateParams(id, 1);

        const forsaveparams = [];
        for (const key in newdata) {
            const newparam = newdata[key];
            for (const key2 in delparams) {
                const delparam = delparams[key2];
                if (newparam.name === delparam.name) {
                    // этот параметр был ранее, можно его восстановить
                    newparam.id = delparam.id;
                    newparam.markdel = 0;
                }
            }
            forsaveparams.push(newparam);
        }

        await TemplatesModel.SetTemplateParams(id, forsaveparams);

        return result;
    }

    // new api------------------------------

    async getTemplateChildren(id, options = {}) {
        await this.checkTemplate(id, options);
        const formattedOptions = await TemplateQueryDto.normalizeQuery(options.filter ?? {});
        const currentOptions = {
            where: {
                parent: id,
                id: {
                    [Op.ne]: '00000000-0000-0000-0000-000000000000',
                },
            },
            attributes: [
                'code',
                'id',
                'name',
                'description',
                'parent',
                'markdel',
                'createdAt',
                'updatedAt',
                'createdUser',
                'updatedUser',
                [Sequelize.fn('COUNT', Sequelize.col('Template.id')), 'countChildren'],
            ],
            include: [
                {
                    model: Template,
                    attributes: [],
                    required: false,
                },
            ],
            group: [
                'Template.id',
                'Template.code',
                'Template.name',
                'Template.description',
                'Template.parent',
                'Template.markdel',
                'Template.createdAt',
                'Template.updatedAt',
                'Template.createdUser',
                'Template.updatedUser',
            ],
        };
        const extendedOptions = await formattedOptions.getOptions(currentOptions);

        const childrens = await Template.showAll(extendedOptions);

        const result = childrens.map((child) => new TemplateDto(child));
        return result;
    }

    async getTemplateParams(templateId, options = {}) {
        await this.checkTemplate(templateId, options);
        const params = await TemplatesModel.getTemplateParams(templateId);
        return params.map((param) => new TemplateParamDto(param));
    }

    async setTemplateParam(templateId, id, paramsTypeId, paramsDescription) {
        await this.checkTemplate(templateId);
        await TemplatesModel.checkTemplateParam(id);
        await this.checkTemplateParamType(paramsTypeId);
        return TemplateParam.update(
            { params_type_id: paramsTypeId, description: paramsDescription },
            {
                where: {
                    template_id: templateId,
                    id,
                },
            }
        );
    }

    async changeTemplateParams(oldData, newData) {
        const params = await this.getParamsFromBody(newData.id);
        const uniqueParams = [...new Set(params)];
        await TemplateParam.destroy({
            where: {
                template_id: newData.id,
            },
        });

        // todo передалть на promise all
        const promise = uniqueParams.map(async (param) => {
            const templateParam = await TemplateParam.findOne({
                where: {
                    template_id: newData.id,
                    name: param,
                    markdel: {
                        [Op.in]: [0, 1],
                    },
                },
            });
            if (templateParam) {
                templateParam.markdel = 0;
                await templateParam.save();
            } else {
                await TemplateParam.create({
                    template_id: newData.id,
                    // todo определиться брать параметр id c сидов или доставать id по имени из базы
                    params_type_id: 'f9a427f9-956c-4367-a0bd-719fa1f54ba1',
                    name: param,
                });
            }
        });

        await Promise.all(promise);
    }

    async checkParentInChildren(data) {
        const dataPages = await TemplatesModel.getTemplateWithFamily(data.id);
        const children = dataPages.descendants;
        if (Array.isArray(children)) {
            for (const child of children) {
                if (child.id === data.parent) {
                    throw new ApiError(400, 'Запрещено переносить родительский шаблон в дочерний!');
                }
            }
        }
    }

    async setTemplateData(id, data) {
        const oldData = await this.checkTemplate(id);
        if (data.name) {
            await this.checkTemplateName(data.name, oldData.parent, id);
        }

        const templateData = new TemplateDto(data);

        const isParentChanged = templateData.parent && oldData.parent !== templateData.parent;
        if (isParentChanged) {
            // добавляем id для корректной работы метода checkParentInChildren
            const templateDataWithId = { ...templateData, id: oldData.id };
            await this.checkParentInChildren(templateDataWithId);
        }

        delete templateData.id;
        let newData;
        const updatedRecords = await TemplatesModel.editTemplate(id, templateData);
        if (updatedRecords) {
            [, [newData]] = updatedRecords;
        }

        await this.changeTemplateParams(oldData, newData);

        return new TemplateDto(newData);
    }

    async createTemplate(name, parent) {
        await this.checkTemplateName(name, parent);
        const newTemplate = await Template.create({ name, parent });
        return new TemplateDto(newTemplate);
    }

    async checkTemplate(id, options) {
        const template = await TemplatesModel.checkTemplate(id, options);
        if (!template) {
            throw ApiError.BadRequest('Такого шаблона не существует');
        }

        return new TemplateDto(template);
    }

    async checkTemplateName(name, parent, id = null) {
        const template = await Template.findOne({
            where: {
                name,
                parent,
            },
        });
        if (template && template.id !== id) {
            throw ApiError.BadRequest('Такое имя шаблона уже существует');
        }
        return template;
    }

    async checkTemplateParamType(id) {
        const paramType = await ParamsType.findOne({
            where: {
                id,
            },
        });
        if (!paramType) {
            throw ApiError.BadRequest('Такого типа параметра шаблона не существует');
        }
        return paramType;
    }

    async copyTemplate(templateId, newName) {
        const oldTemplate = await this.checkTemplate(templateId);
        const oldTemplateParams = await this.getTemplateParams(templateId);

        const { parent, data, script } = oldTemplate;
        const newTemplate = await this.createTemplate(newName, parent);
        newTemplate.data = data;
        newTemplate.script = script;
        const result = await this.setTemplateData(newTemplate.id, newTemplate);
        const newTemplateParams = await this.getTemplateParams(newTemplate.id);

        const oldTemplateParamsObject = {};
        for (const index in oldTemplateParams) {
            const param = oldTemplateParams[index];
            oldTemplateParamsObject[param.name] = param;
        }

        newTemplateParams.map((param) => {
            const nameParam = param.name;
            const { params_type_id } = oldTemplateParamsObject[nameParam];
            if (params_type_id !== param.params_type_id) {
                this.setTemplateParam(newTemplate.id, param.id, params_type_id);
            }
        });

        return result;
    }

    async delParentPermissionsRls(parentId, childId, table_name) {
        // абстрактный метод, перегружен расширением RlsExtPage
    }

    async addParentPermissionsRls(parentId, childId, table_name) {
        // абстрактный метод, перегружен расширением RlsExtPage
    }

    async getTemplateChildrenIdNested(templateId, markdel = [0, 1], transaction) {
        const templateFamily = await TemplatesModel.getTemplateWithFamily(templateId, {
            transaction,
        });
        return templateFamily?.descendants ?? [];
    }

    async restoreTemplate(id) {
        let result;
        const whereOptions = { filter: { where: { markdel: '10' } } };
        const dataForUpdate = { markdel: 0 };

        await this.checkTemplate(id, whereOptions);

        const updatedRecords = await TemplatesModel.editTemplate(id, dataForUpdate);
        if (updatedRecords) {
            [, [result]] = updatedRecords;
        }
        return result;
    }

    async getAllTemplates(options = {}) {
        const optionsWithLimit = { limit: 10, ...options };
        return TemplatesModel.getAllTemplates(optionsWithLimit);
    }
}

module.exports = TemplatesService;
