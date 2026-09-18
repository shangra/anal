const PagesModel = require('./model/Pages.model');
const GlobalService = require('../../../core/services/Global.service');
const vm = require('vm');
const httpContext = require('../../../core/services/http-context');
const jsx2json = require('./addon/jsx2json');
const path = require('path');
const fs = require('fs');
// const Extensions = require('../../../config/extensions');
const Extensions = require('../../../core/class/Extensions.class');
const LitePattern = require('lite-pattern');
const BabelParseCodeClass = require('./addon/babelParseCode');

const generateServices = () => {
    if (!global.allServices) {
        global.allServices = [];
        global.allServices.push('GlobalService');
        if (global.ext_modules) {
            global.ext_modules.forEach((ext_module) => {
                const servicesPath = `${global.env.PWD}/ext_modules/${ext_module}/services`;
                if (fs.existsSync(servicesPath)) {
                    const filesInDir = fs.readdirSync(servicesPath, {
                        withFileTypes: true,
                    });
                    const names = [];
                    filesInDir.forEach((file) => {
                        if (!file.isDirectory()) {
                            const splitterName = path
                                .parse(file.name)
                                .name.split('.');
                            if (
                                splitterName.length > 1 &&
                                splitterName[1] === 'service'
                            ) {
                                names.push(`${ext_module}/${splitterName[0]}`);
                            }
                        }
                    });

                    if (names) {
                        global.allServices = [...global.allServices, ...names];
                    }
                }
            });
        }
    }
};
generateServices();

function wrapper(value) {
    return Buffer.from(value).toString('base64');
}

class PagesUiService extends Extensions {
    paramHandlers = {};

    async refactorCode(textCode) {
        return `
        result = async () => {
            ${textCode}
        };`;
    }

    async getGlobalParams(page, options, context) {
        return {
            context,
            sessionStorage: httpContext.get('sessionStorage'),
            page: { ...page, options },
            // добавляется перегрузкой метода getPageFromUrl расширением rls-ext-page, если на странице есть системный параметр rls
            rls: page.rls ?? {},
            process: {
                env: global.envdb,
            },
        };
    }

    async ParamJavaScript(value, globalParams = {}, context = {}) {
        const functionText = await this.refactorCode(value);
        const sessionStorage = JSON.parse(
            JSON.stringify(globalParams.sessionStorage)
        );
        const vmContext = {
            context,
            result: null,
            global: {
                sessionStorage,
            },
            process: {
                env: global.envdb,
            },
            page: globalParams.page,
            options: globalParams.page.options,

            require: GlobalService.require,
            import: null,
        };
        vm.createContext(vmContext);
        vm.runInContext(functionText, vmContext);

        return await vmContext.result();
    }

    async ParamJSON(value) {
        let result = {};
        try {
            result = JSON.parse(value);
        } catch (e) {
            console.error(e);
        }
        return result;
    }

    /** *                ** */
    async RenderPage(page, options = {}, context = {}) {
        // todo нужен рефактор, удалить лишнее
        const twigparams = {};
        const { PagesParams } = page;

        const newFormat = !!page.Template?.form;
        const TemplateForm = page.Template?.form ?? page.Template;

        const gParams = await this.getGlobalParams(page, options, context);

        for (const key in PagesParams) {
            const param = PagesParams[key];

            if (param.paramtype === 'javascript') {
                twigparams[param.name] = await this.ParamJavaScript(
                    param.value,
                    gParams,
                    context
                );
            } else if (param.paramtype === 'json') {
                twigparams[param.name] = await this.ParamJSON(param.value);
            } else if (param.paramtype === 'jsx') {
                twigparams[param.name] = param.value; // encodeURIComponent(param["value"]);
            } else if (param.paramtype === 'pages') {
                // Это вложенная страница, надо её отрендерить и передать как переменную
                let value = '';
                const subpage = await PagesModel.GetPageFromId(param.value);
                if (subpage !== false) {
                    const temp_view = await this.RenderPage(
                        subpage,
                        {},
                        context
                    );
                    value = temp_view.generate();
                }
                twigparams[param.name] = value;
            } else if (param.paramtype === 'filelink') {
                // TODO: bulk (?)
                const { body } = await GlobalService.fetchESB(
                    `/files/${param.value}`
                );
                twigparams[param.name] = JSON.stringify(body);
            } else if (param.paramtype === 'js') {
                //
                const { value } = param;
                twigparams[param.name] = `<script>${value}</script>`;
            } else if (param.paramtype === 'system') {
                let gParamData;
                let getGlobalData = true;
                try {
                    if (param.value.trim() !== '') {
                        gParamData = JSON.parse(param.value);
                        getGlobalData = false;
                    }
                } catch (e) {
                    console.log('RenderPage error param: ', param);
                }
                twigparams[param.name] = getGlobalData
                    ? gParams[param.name]
                    : gParamData;
            } else if (this.paramHandlers[param.paramtype]) {
                const paramHandler = this.paramHandlers[param.paramtype];
                const valueText = await paramHandler(param, { page });
                twigparams[param.name] = valueText;
            } else {
                let value = JSON.stringify(param.value.trim());
                value = value.slice(1, value.length - 1);
                twigparams[param.name] = value;
            }
        }

        let pageTemplate = TemplateForm;
        pageTemplate = pageTemplate.replaceAll('"%', '').replaceAll('%"', '');

        const form = await LitePattern.render(
            { main: pageTemplate },
            twigparams,
            {
                require: GlobalService.require,
            }
        );

        // Удаление строк с комментариями
        const formLines = form.split('\n');
        const formLinesWithoutComments = formLines.filter(
            (line) => !line.trim().startsWith('//')
        );
        const formWithoutComments = formLinesWithoutComments.join('\n');

        let result = formWithoutComments;

        // если тип страницы html, возвращаем сгенерированную шаблонизатором строку
        if (page.content_type === 'application/json') {
            let isJSON = false;
            try {
                const jsonObject = JSON.parse(form);
                isJSON = true;
            } catch (e) {
                //
            }

            if (!isJSON) {
                try {
                    // let jsonForm = jsx2json(form, { useEval: true });
                    // if (!Array.isArray(jsonForm)) {
                    //     jsonForm = [jsonForm];
                    // }

                    if (newFormat) {
                        const newForm = await new BabelParseCodeClass().jsxToJs(
                            `<>${formWithoutComments}</>`
                        );

                        const script = await LitePattern.render(
                            { main: page.Template?.script || '' },
                            twigparams,
                            {
                                require: GlobalService.require,
                            }
                        );
                        const TemplateScript = await new BabelParseCodeClass({
                            wrapper,
                        }).scriptParse(script);

                        result = {
                            form: wrapper(newForm),
                            script: TemplateScript,
                        };
                    } else {
                        let jsonForm = jsx2json(form, { useEval: true });
                        if (!Array.isArray(jsonForm)) {
                            jsonForm = [jsonForm];
                        }
                        const buildForm = JSON.stringify(jsonForm);
                        result = buildForm;
                    }
                } catch (e) {
                    console.error('PagesUI jsx2json', e);
                }
            }
        }

        return result;
    }
}

module.exports = PagesUiService;
