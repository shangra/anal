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

        Connection.applySsl(config);

        Connection.instance = /** @type {ISequelize} */ (
            config.use_env_variable
                ? new Sequelize(process.env[config.use_env_variable], config)
                : new PatroniSwitcher(
                      config.database,
                      config.username,
                      config.password,
                      config
                  )
        );
        // : new Sequelize(config.database, config.username, config.password, config);

        Object.freeze(this);

        return Connection.instance;
    }

    static applySsl(dbConfig) {
        const flag = String(process.env.DB_SSL || process.env.PGSSLMODE || '').toLowerCase();
        const host = String(dbConfig.host || process.env.DB_HOST || '');
        const isLocal = host === '127.0.0.1' || host === 'localhost' || host === '::1';
        const disabled = flag === 'false' || flag === 'disable' || flag === '0' || flag === 'off';
        const forced = flag === 'true' || flag === '1' || flag === 'require' || flag === 'prefer';
        const wantSsl = !disabled && (forced || (!flag && !isLocal));
        const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

        if (dbConfig.ca || dbConfig.cert || dbConfig.key) {
            dbConfig.dialectOptions = {
                ssl: {
                    ...Connection.getCerts(dbConfig),
                    require: true,
                    rejectUnauthorized,
                },
            };
            return;
        }

        if (wantSsl) {
            dbConfig.dialectOptions = {
                ssl: {
                    require: true,
                    rejectUnauthorized,
                },
            };
        }
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
