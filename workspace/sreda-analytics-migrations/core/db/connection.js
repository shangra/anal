/**
 * @typedef {import('sequelize').Options} Options
 * @typedef {import('sequelize').Sequelize} ISequelize
 */

const { Sequelize } = require('sequelize');
const PatroniSwitcher = require('patroni-switcher');
const fs = require('fs');

const config = require('./config');

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

        const dbConfig = config ?? {};

        /**
         * add ssl certs
         * Inbox: SSL только если заданы DB_SSL_CA/KEY/CERT.
         * Облачный Postgres (ошибка «no encryption») — тот же dialectOptions.ssl,
         * что у PostgresConnector при settings.ssl, без файлов сертификатов.
         */
        if (dbConfig.ca || dbConfig.cert || dbConfig.key) {
            dbConfig.dialectOptions = {
                ssl: {
                    ...Connection.getCerts(dbConfig),
                    require: true,
                    rejectUnauthorized: Connection.sslRejectUnauthorized(),
                },
            };
        } else if (Connection.wantSsl(dbConfig)) {
            dbConfig.dialectOptions = {
                ssl: {
                    require: true,
                    rejectUnauthorized: Connection.sslRejectUnauthorized(),
                },
            };
        }

        if (!dbConfig.use_env_variable && !dbConfig.dialect) {
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

    static sslRejectUnauthorized() {
        return (
            process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' ||
            process.env.REJECT_UNAUTH === 'true'
        );
    }

    static wantSsl(dbConfig) {
        const flag = String(process.env.DB_SSL || process.env.PGSSLMODE || '').toLowerCase();
        const host = String(dbConfig.host || process.env.DB_HOST || '');
        const isLocal = host === '127.0.0.1' || host === 'localhost' || host === '::1';
        const disabled = flag === 'false' || flag === 'disable' || flag === '0' || flag === 'off';
        const forced = flag === 'true' || flag === '1' || flag === 'require' || flag === 'prefer';
        return !disabled && (forced || (!flag && !isLocal));
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
