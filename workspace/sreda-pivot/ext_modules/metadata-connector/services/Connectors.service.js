const DefaultMetaObject = require('../../metadata-cmp/services/DefaultMetaObject.service');
const cryptoEnv = require('../../../core/services/crypto');

const MetadataService = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataService();

const ConnectorClass = require('./metadata/Connector.class');

const { mergeDeep } = require('../../utils/services');

/**
 * @class ConnectorsService
 */
class ConnectorsService extends DefaultMetaObject {
    constructor() {
        super(__dirname);

        this.id = 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970';
        this.component = 'Connector';
    }

    async form(id) {
        const form = [
            {
                component: 'MetadataUiKit.Tabs',
                props: {
                    tabs: [
                        {
                            name: 'Основное',
                            content: [
                                {
                                    name: 'dialect',
                                    description: 'Диалект',
                                    type: 'LIST',
                                    list: {},
                                },
                                {
                                    name: 'host',
                                    description: 'Сервер',
                                    type: 'STRING',
                                    template: '127.0.0.1',
                                },
                                {
                                    name: 'port',
                                    description: 'Порт',
                                    type: 'INTEGER',
                                    template: '5432',
                                },
                                {
                                    name: 'database',
                                    description: 'База Данных',
                                    type: 'STRING',
                                    template: 'public',
                                },
                                {
                                    name: 'schema',
                                    description: 'Схема',
                                    type: 'STRING',
                                    template: 'public',
                                    for: [
                                        'dialect.postgres',
                                        'dialect.patroni',
                                        'dialect.greenplum',
                                    ],
                                },
                                {
                                    name: 'user',
                                    description: 'Пользователь',
                                    type: 'STRING',
                                    template: 'admin',
                                },
                                {
                                    name: 'password',
                                    description: 'Пароль',
                                    type: 'STRING',
                                    template: 'admin',
                                },
                                {
                                    name: 'pool',
                                    description: 'Настройки подключений',
                                    type: 'JSON',
                                    template: '{"max":5,"min":0,"idle":1000}',
                                },
                                {
                                    name: 'cluster',
                                    description: 'Кластер',
                                    type: 'JSON',
                                    template:
                                        '[{host:"127.0.0.1", port:"5432"}, {host:"127.0.0.1", port:"5433"}]',
                                    for: ['dialect.patroni'],
                                },
                                {
                                    name: 'connection_string',
                                    description: 'Строка подключения',
                                    type: 'TEXT',
                                    template: '',
                                },
                            ],
                        },
                    ],
                },
            },
            {
                name: 'off',
                description: 'Отключен на тех обслуживание',
                default: false,
                type: 'BOOL',
            },
        ];

        const buttons = [];
        if (id) {
            buttons.push({
                name: 'MetaConnectorTest',
                component: 'MetaConnectorTest',
                props: {
                    type: 'test',
                    id: id,
                    icon: 'bi bi-ethernet',
                    server: sreda.env.ESB_NAME || '',
                    service: `metadata/connectors/${id}/test`,
                    title: 'Проверить подключение',
                },
            });
        }
        return { form, buttons };
    }

    /**
     * @param {string} text
     * @returns
     */
    async crypto(text) {
        const value = process.env.CONNECTOR_SALT || process.env.PWD;
        const algorithm = 'aes-256-ctr';
        return cryptoEnv.encrypt(algorithm, value, text);
    }

    /**
     * @param {string} id
     * @returns
     */
    async metadataItem(id) {
        const form = await super.metadataItem(id);
        form.data.password = '';
        return form;
    }

    async createMetadata(body) {
        let password = body.settings?.password;
        if (password && password !== '') {
            body.settings.password = await this.crypto(body.settings.password);
        }
        return await super.createMetadata(body);
    }

    /**
     * @param {string} id
     * @param {object} body
     * @returns
     */
    async updateMetadata(id, body) {
        let password = body.settings?.password;
        if (password && password !== '') {
            body.settings.password = await this.crypto(body.settings.password);
        } else {
            const standartForm = await super.metadataItem(id);
            body.settings.password = standartForm.data.password;
        }

        return await super.updateMetadata(id, body);
    }

    /**
     * @param {string} id
     * @param {object} [body]
     * @returns
     */
    async patchMetadata(id, body = {}) {
        const meta = await Metadata.getItem(id);

        mergeDeep(meta.manifest, body);

        return super.updateMetadata(id, meta.manifest);
    }

    /**
     * @param {object} body
     */
    async create(body) {
        console.log('create', body);
    }

    /**
     * @param {string} id
     */
    async read(id) {
        console.log('read', id);
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

    /**
     * @param {string} id
     */
    async test(id) {
        try {
            const { connector } = await new ConnectorClass().getConnector(id);

            await connector.querySql('SELECT 1');
        } catch (e) {
            console.error(e);

            return { result: false };
        }

        return { result: true };
    }
}

module.exports = ConnectorsService;
