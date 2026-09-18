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

        /**
         * add ssl certs
         */
        if (config.ca || config.cert || config.key) {
            config.dialectOptions = {
                ssl: {
                    ...Connection.getCerts(config),
                    require: true,
                },
            };
        }

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
