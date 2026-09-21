/** GLOBAL * */
const LevelClass = require('../../../metadata-cmp/services/metadata/source/LevelClass.class');

const ConnectorManager = require('./ConnectorManager');

const cryptoEnv = require('../../../../core/services/crypto');
const ApiError = require('../../../../core/exceptions/ApiError');

// Use Postgres connector's AbstractConnector for static methods

const AbstractConnector = require('../connectors/AbstractConnector'); //Postgres;
const ConnectorList = {};
let ConnectorListLoad = false;

class ConnectorClass extends LevelClass {
    constructor(props) {
        super(props);

        this.id = 'cce0463c-2dd3-4ee2-aef0-4b83c9c29970';
        this.component = 'Connector';
        this.props = {
            id: this.id,
            owner_id: '00000000-0000-0000-0000-000000000000',
            class_id: this.id,
            class: this.component,
            name: 'Коннекторы',
            description: 'Коннекторы',
            crud: ['c', 'rls'],
            routes: 'metadata/connectors',
        };
    }

    async loadConnectors(list) {
        // Диалекты с findSQL/generateCte — ими пользуются кубы, отчёты и инфосервисы.
        // AST-коннектор из connector-postgres.findSQL не имеет и ломает весь срез.
        list.postgres = require('./connectors/Postgres');
        list.greenplum = require('./connectors/GreenPlum');
        list.clickhouse = require('./connectors/ClickHouseConnector');
        list.trino = require('./connectors/TrinoConnector');
        list.rest = require('./connectors/RESTConnector');
        ConnectorListLoad = true;
    }

    async getSettings(data) {
        const { settings: _settings } = data.manifest;

        const settings = { ..._settings, dialect: _settings.dialect };

        if (settings.off) {
            throw ApiError.AccessRestricted(
                `В данный момент коннектор ${this.connectorData?.name} отключен`,
                [],
                {
                    description: {
                        short: `В данный момент коннектор ${this.connectorData?.name} отключен`,
                        long: 'Пробовать выполнить запрос снова с интервалом 5-10 минут. Если по истечении 30 минут проблема сохраняется - посмотреть нет ли на главной странице DR-Портала или в Новостях уведомления о наличии проблем и сроках их исправления. Если уведомлений нет, обратиться к ИТ-администратору сопровождения продукта.',
                    },
                }
            );
        }

        const { password = '' } = settings;
        const value = process.env.CONNECTOR_SALT || process.cwd();
        const algorithm = 'aes-256-ctr';
        const envPassword = () => {
            const p = process.env.DB_PASS || process.env.PGPASSWORD;
            return typeof p === 'string' && p.length > 0 ? p : '';
        };
        try {
            settings.password =
                (password
                    ? cryptoEnv.decrypt(algorithm, value, password).trim()
                    : password) || undefined;
        } catch {
            settings.password = undefined;
        }
        if (typeof settings.password !== 'string' || settings.password.length === 0) {
            settings.password = envPassword();
        }
        if (!settings.user) {
            settings.user = process.env.DB_USER;
        }
        if (!settings.host) {
            settings.host = process.env.DB_HOST;
        }
        if (!settings.port && process.env.DB_PORT) {
            settings.port = Number(process.env.DB_PORT) || process.env.DB_PORT;
        }
        if (!settings.database) {
            settings.database = process.env.DB_DATABASE;
        }
        if (!settings.schema && process.env.DB_SCHEMA) {
            settings.schema = process.env.DB_SCHEMA;
        }

        settings.pool =
            typeof settings.pool === 'string' && settings.pool.trim()
                ? JSON.parse(settings.pool)
                : settings.pool;

        return settings;
    }

    /**
     * @param {string} id
     * @param {object} options
     */
    async getConnector(id, options) {
        if (!ConnectorListLoad) {
            await this.loadConnectors(ConnectorList);
        }

        const data = await this.getItem(id, options);
        const hash = AbstractConnector.getHash(data.manifest.settings);

        let c = ConnectorManager.get(id);
        if (!c || c.hash !== hash) {
            await c?.close?.();
            const settings = await this.getSettings(data);
            const Ctor = ConnectorList[settings.dialect];
            if (!Ctor)
                throw new Error(`Неизвестный диалект "${settings.dialect}"`);
            c = new Ctor(settings);
            c.hash = hash;
            ConnectorManager.set(id, c);
        }
        return { connector: c, connectorData: data };
    }
}

module.exports = ConnectorClass;
