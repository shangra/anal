const ApiError = require('../../../core/exceptions/ApiError');
const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const constants = require('../constants');
const RulesClass = require('./metadata/Rules.class');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const FormsService = require('../../metadata-forms/services/Forms.service');
const Metadata = new MetadataClass();

class RulesService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        const name = 'Rules';

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
                                content: this.getFormFields(),
                            },
                        ],
                    },
                },
            ],
        };
    }
    /**
     * Возвращает конфигурацию полей формы в зависимости от типа документа
     * @returns {Array<Object>} Массив объектов с конфигурацией полей формы
     */
    getFormFields() {
        const commonFields = [
            {
                name: 'formelement',
                description: 'Форма документа',
                type: 'REF',
                useParent: false,
                link: {
                    type: 'local',
                    metalink: [new FormsService().id, new FormsService().id],
                },
            },
            {
                name: 'formlist',
                description: 'Форма списка',
                type: 'REF',
                useParent: false,
                link: {
                    type: 'local',
                    metalink: [new FormsService().id, new FormsService().id],
                },
            },
            {
                name: 'formchoice',
                description: 'Форма выбора',
                type: 'REF',
                useParent: false,
                link: {
                    type: 'local',
                    metalink: [new FormsService().id, new FormsService().id],
                },
            },
        ];

        return commonFields;
    }

    async createMetadata(body, transaction) {
        const errors = await this.validate(body);
        if (errors.length > 0) {
            const message = Object.values(errors).join('\n');
            throw ApiError.BadRequest(message);
        }

        return super.createMetadata(body, transaction);
    }

    async updateMetadata(id, body, transaction) {
        const errors = await this.validate(body);
        if (errors.length > 0) {
            const message = Object.values(errors).join('\n');
            throw ApiError.BadRequest(message);
        }

        return super.updateMetadata(id, body, transaction);
    }

    /**
     * @override
     * @param {*} body тело запроса
     * @returns {Promise<string[]>} массив сообщений с ошибками
     */
    async validate(body) {
        const errors = [];

        if (!body.name || body.name.trim() === '') {
            errors.push('Поле "Имя" обязательно для заполнения');
        }

        return errors;
    }

    async getAll() {
        const pages = await Metadata.getMetadataChildren(this.id);
        return pages.map((item) => this._convertToNodeType(item));
    }

    async getChildren(id) {
        const pages = await Metadata.getMetadataChildren(id);
        return pages.map((item) => this._convertToNodeType(item));
    }

    /**
     * Преобразование данных страницы в формат NodeType
     */
    _convertToNodeType(page) {
        return {
            id: page.id,
            title: page.name,
            children: [],
            loading: false,
            hasChildren: false,
            class: 'pages',
            crud: ['c', 'r', 'u', 'd', 'rls'],
        };
    }

    async create(id, body) {
        return new RulesClass({ id }).create(id, body);
    }

    async read(id, options = {}) {
        return new RulesClass({ id }).read(id, options);
    }

    async update(id, body) {
        return new RulesClass({ id }).update(id, body);
    }

    async delete(id, body) {
        return new RulesClass({ id }).delete(id, body);
    }

    // hide children
    async getTreeChildrenV3(children) {
        const unExtandableNode = ['Rules'];
        return children.map((child) =>
            unExtandableNode.includes(child.class)
                ? { ...child, needToLoading: false }
                : child
        );
    }
}

module.exports = RulesService;
