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
         */
        if (dbConfig.ca || dbConfig.cert || dbConfig.key) {
            dbConfig.dialectOptions = {
                ssl: {
                    ...Connection.getCerts(dbConfig),
                    require: true,
                },
            };
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
