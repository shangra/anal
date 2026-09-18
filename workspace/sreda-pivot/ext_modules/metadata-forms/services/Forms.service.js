const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const MetadataService = require('../../metadata-cmp/services/Metadata.service');

const PagesUiServiceClass = wrapper('../../page-cms/services/PagesUi.service');
const PagesUiService = new PagesUiServiceClass();

const TemplatesServiceClass = wrapper('../../template-cms/services/Templates.service');
const TemplatesService = new TemplatesServiceClass();

const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();
class FormsService extends DefaultMetaObject {
    //
    constructor() {
        super(__dirname);

        this.id = '20901b97-d1cf-4472-a27b-b0442e436c9a';
        this.component = 'Forms';
    }

    async form(id) {
        return {
            form: [
                {
                    component: 'MetadataUiKit.Tabs',
                    props: {
                        tabs: [
                            {
                                name: 'Основное',
                                content: [
                                    {
                                        name: 'linkTemplate',
                                        description: 'UUID на шаблон формы',
                                        type: 'STRING',
                                    },
                                ],
                            },
                            {
                                name: 'Шаблон формы',
                                content: [
                                    {
                                        component: 'FullscreenViewer',
                                        props: {
                                            style: { height: '500px' },
                                        },
                                        children: [
                                            {
                                                component: 'MetadataUiKit.CodeArea',
                                                props: {
                                                    key: 'codetemplate',
                                                    name: 'codetemplate',
                                                    showToolbar: false,
                                                    subKey: 'form',
                                                },
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                name: 'Код на клиенте',
                                content: [
                                    {
                                        component: 'FullscreenViewer',
                                        props: {
                                            style: { height: '500px' },
                                        },
                                        children: [
                                            {
                                                component: 'MetadataUiKit.CodeArea',
                                                props: {
                                                    key: 'codeclient',
                                                    name: 'codeclient',
                                                    showToolbar: false,
                                                    subKey: 'form',
                                                },
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                name: 'Код на сервере',
                                content: [
                                    {
                                        component: 'FullscreenViewer',
                                        props: {
                                            style: { height: '500px' },
                                        },
                                        children: [
                                            {
                                                component: 'MetadataUiKit.CodeArea',
                                                props: {
                                                    key: 'codeserver',
                                                    name: 'codeserver',
                                                    showToolbar: false,
                                                    subKey: 'form',
                                                },
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        };
    }

    // async metadataItem(id) {
    //     const form = await super.metadataItem(id);
    //     form.data.password = '';
    //     return form;
    // }
    //
    // async createMetadata(body) {
    //     let password = body.settings?.password;
    //     if (password && password !== '') {
    //         body.settings.password = await this.crypto(body.settings.password);
    //     }
    //     return await super.createMetadata(body);
    // }
    //
    // async updateMetadata(id, body) {
    //     let password = body.settings?.password;
    //     if (password && password !== '') {
    //         body.settings.password = await this.crypto(body.settings.password);
    //     } else {
    //         const standartForm = await super.metadataItem(id);
    //         body.settings.password = standartForm.data.password;
    //     }
    //     return await super.updateMetadata(id, body);
    // }

    /**
     * @param {object} body
     */
    async create(body) {
        console.log('create', body);
    }

    /**
     * @param {string} id
     * @param {object} options
     * @returns
     */
    async read(id, options = {}) {
        const metaObject = await this.metadataItem(id);
        const formGuid =
            metaObject.data[`form${options.type}`]?.value ?? metaObject.data[`form${options.type}`];

        let formTemplate;
        let formScript;

        if (formGuid) {
            const entityMeta = await Metadata.getMetadata(metaObject.data.id);
            ({ formTemplate, formScript } = await this.#loadFormTemplate(formGuid, entityMeta));
        } else {
            const entityMeta = await Metadata.getMetadata(metaObject.data.id);
            const parentId = entityMeta.class_id;
            const classMeta = await this.metadataItem(parentId);
            const formGuidParent =
                classMeta.data[`form${options.type}`]?.value ??
                classMeta.data[`form${options.type}`];

            ({ formTemplate, formScript } = await this.#loadFormTemplate(
                formGuidParent,
                entityMeta
            ));
        }

        const inputArray = ['', '', ''];
        const tabularPartsArray = ['', ''];

        // linkTemplate;
        // Body Template
        // {
        //     "content_type": "Application/json"
        //     "Template" : "",
        //     "PagesParams": [],
        //     "UrlParams" : []
        // }

        const page = {
            content_type: 'application/json',
            Template: { form: formTemplate, script: formScript },
            PagesParams: {
                metaOwner: { name: 'metaOwner', paramtype: 'string', value: id },
                options: { name: 'options', paramtype: 'json', value: JSON.stringify(options) },
            },
            UrlParams: [],
        };

        const result = await PagesUiService.RenderPage(page, { object: id });
        // const script = template.script;
        // const result = { form: JSON.parse(form), script: Buffer.from(script).toString('base64') };

        return result;
    }

    async #loadFormTemplate(formGuid, entityMeta) {
        const metaForm = await this.metadataItem(formGuid);
        if (!metaForm?.data) {
            throw new Error(`Form with GUID ${formGuid} not found or has no data`);
        }

        const { linkTemplate, codeclient = '', codetemplate = '' } = metaForm.data;

        let inputList = [];
        let tabularPartList = [];

        if (entityMeta?.treeObject?.Fields && typeof entityMeta.treeObject.Fields === 'object') {
            try {
                const fields = Object.values(entityMeta.treeObject.Fields);
                if (Array.isArray(fields)) {
                    inputList = this.#_getElementInputs(fields);
                }
            } catch (error) {
                console.warn('Error processing Fields:', error.message);
            }
        }

        if (
            entityMeta?.treeObject?.TabularParts &&
            typeof entityMeta.treeObject.TabularParts === 'object'
        ) {
            try {
                const tabularParts = Object.values(entityMeta.treeObject.TabularParts);
                if (Array.isArray(tabularParts)) {
                    tabularPartList = this.#_getElementTabularPart(tabularParts);
                }
            } catch (error) {
                console.warn('Error processing TabularParts:', error.message);
            }
        }

        if (linkTemplate) {
            const template = await TemplatesService.checkTemplate(linkTemplate);
            if (!template?.data) {
                throw new Error(`Template with GUID ${linkTemplate} not found or has no data`);
            }

            return {
                formTemplate: template.data,
                formScript: template.script || '',
            };
        } else {
            if (!codetemplate) {
                console.warn('No codetemplate provided, using empty template');
            }

            const inputListDeclaration = `const fieldsList = ${JSON.stringify(inputList)};`;
            const tabularDeclaration = `const tabularPartList = ${JSON.stringify(
                tabularPartList
            )};`;

            const formScript = `${inputListDeclaration}\n${tabularDeclaration}\n${
                codeclient || ''
            }`;

            return {
                formTemplate: codetemplate || '',
                formScript: formScript,
            };
        }
    }

    /**
     * @param {string} id
     * @param {object} body
     */
    async update(id, body) {
        console.log('update', id, body);
    }

    /**
     * @param {string} id
     */
    async delete(id) {
        console.log('delete', id);
    }

    #_getElementInputs(fields) {
        if (!Array.isArray(fields)) {
            return [];
        }

        const inputs = [];
        fields.forEach((field) => {
            if (field.show) {
                inputs.push(`${field.name}`);
            }
        });
        return inputs;
    }

    #_getElementTabularPart(tabularParts) {
        if (!Array.isArray(tabularParts)) {
            return [];
        }
        const tabulars = [];
        tabularParts.forEach((tab) => {
            tabulars.push(`${tab.name}`);
        });

        return tabulars;
    }
}

module.exports = FormsService;
