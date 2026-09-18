const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');

const PagesUiServiceClass = wrapper('../../page-cms/services/PagesUi.service');
const PagesUiService = new PagesUiServiceClass();

const TemplatesServiceClass = wrapper('../../template-cms/services/Templates.service');
const TemplatesService = new TemplatesServiceClass();
const constants = require('../constants');

class FormsService extends DefaultMetaObject {
    //
    constructor() {
        super(__dirname);

        const name = 'Forms';

        this.id = constants[name].id;
        this.component = constants[name].component;
    }

    async form() {
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

    async create(body) {
        console.log('create', body);
    }

    async read(id, options = {}) {
        console.log('create', id, options);
    }

    async update(id, body) {
        console.log('update', id, body);
    }

    async delete(id) {
        console.log('delete', id);
    }
}

module.exports = FormsService;
