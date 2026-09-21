/**
 * @typedef {import('sequelize').Options} Options
 * @typedef {import('sequelize').Sequelize} ISequelize
 */

const { Sequelize } = require('sequelize');
const PatroniSwitcher = require('patroni-switcher');
const fs = require('fs');
const pg = require('pg');

const config = require('./config');

function sslFlag() {
    return String(process.env.DB_SSL || process.env.PGSSLMODE || '').toLowerCase();
}

function sslDisabled() {
    const flag = sslFlag();
    return flag === 'false' || flag === 'disable' || flag === '0' || flag === 'off';
}

function sslForced() {
    const flag = sslFlag();
    return flag === 'true' || flag === '1' || flag === 'require' || flag === 'prefer';
}

function isLocalHost(host) {
    const h = String(host || '');
    return h === '127.0.0.1' || h === 'localhost' || h === '::1';
}

function wantSsl(host) {
    if (sslDisabled()) {
        return false;
    }
    if (sslForced()) {
        return true;
    }
    return !isLocalHost(host);
}

function sslOptions() {
    return {
        require: true,
        rejectUnauthorized:
            process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' ||
            process.env.REJECT_UNAUTH === 'true',
    };
}

function injectClientSsl(config) {
    if (typeof config === 'string') {
        if (!wantSsl() && !sslForced()) {
            return config;
        }
        if (/sslmode=/i.test(config)) {
            return config;
        }
        if (sslDisabled()) {
            return config;
        }
        const sep = config.includes('?') ? '&' : '?';
        return `${config}${sep}sslmode=no-verify`;
    }
    const cfg = { ...(config || {}) };
    if (cfg.ssl || sslDisabled()) {
        return cfg;
    }
    if (!wantSsl(cfg.host)) {
        return cfg;
    }
    cfg.ssl = sslOptions();
    return cfg;
}

function patchPgClient() {
    if (pg.Client && pg.Client.__sredaSslPatched) {
        return;
    }
    const Orig = pg.Client;
    class SredaPgClient extends Orig {
        constructor(clientConfig) {
            super(injectClientSsl(clientConfig));
        }
    }
    SredaPgClient.__sredaSslPatched = true;
    pg.Client = SredaPgClient;
}

/**
 * Класс подключения к базе данных.
 * @class
 */
class Connection {
    /**
     * Инстанс подключения к базе данных.
     * @private
     * @static
     * @type {ISequelize}
     */
    static instance;

    /**
     * Метод создания экземпляра подключения к базе данных.
     * @public
     * @static
     * @returns {ISequelize} Инстанс подключения к базе данных.
     */
    static getInstance() {
        if (Connection.instance) {
            return Connection.instance;
        }

        const dbConfig = { ...(config ?? {}) };
        const host = String(dbConfig.host || process.env.DB_HOST || '');

        patchPgClient();
        dbConfig.dialectModule = pg;

        /**
         * add ssl certs
         */
        if (dbConfig.ca || dbConfig.cert || dbConfig.key) {
            const ssl = {
                ...Connection.getCerts(dbConfig),
                ...sslOptions(),
            };
            dbConfig.ssl = ssl;
            dbConfig.dialectOptions = {
                ...(dbConfig.dialectOptions || {}),
                ssl,
            };
        } else if (wantSsl(host)) {
            process.env.PGSSLMODE = process.env.PGSSLMODE || 'require';
            const ssl = sslOptions();
            dbConfig.ssl = ssl;
            dbConfig.dialectOptions = {
                ...(dbConfig.dialectOptions || {}),
                ssl,
            };
            console.info(`PG SSL enabled for ${host || '(no host)'}`);
        }

        // Конструктор Sequelize не устанавливает соединение, поэтому отсутствие
        // настроек БД не должно валить=require модулей на старте: без диалекта
        // бросается исключение и приложение не стартует вовсе.
        // Ошибка проявится только при реальном запросе к БД.
        if (!dbConfig.use_env_variable && !dbConfig.dialect) {
            console.warn(
                'DB_DIALECT не задан. Использован диалект по умолчанию: postgres'
            );
            dbConfig.dialect = 'postgres';
        }

        Connection.instance = /** @type {ISequelize} */ (
            dbConfig.use_env_variable
                ? new Sequelize(process.env[dbConfig.use_env_variable], dbConfig)
                : new PatroniSwitcher(
                      dbConfig.database,
                      dbConfig.username,
                      dbConfig.password,
                      dbConfig
                  )
        );

        Object.freeze(this);

        return Connection.instance;
    }

    /**
     * Метод получения сертификатов.
     * @private
     * @static
     * @param {{ca: string, cert: string, key: string}} config Объект путей к сертификатам
     * @returns {{ca: string|null, cert: string|null, key: string|null}} Объект, содержащий загруженные сертификаты
     */
    static getCerts({ ca, cert, key }) {
        return {
            ca: Connection.readCert(ca),
            key: Connection.readCert(key),
            cert: Connection.readCert(cert),
        };
    }

    /**
     * Метод чтения данных сертификатов.
     * @private
     * @static
     * @param {string} path Путь до даных сетификата
     * @returns {string|null} Данные сертификата
     */
    static readCert(path) {
        if (!path) {
            return null;
        }

        try {
            return fs.readFileSync(path, 'utf8');
        } catch {
            return null;
        }
    }
}

module.exports = Connection.getInstance();
