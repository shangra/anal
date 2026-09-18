const { QueryTypes } = require('sequelize');

const Postgres = require('./Postgres');

const GlobalService = require('../../../../../core/services/Global.service');

/**
 * @typedef {import('../Connector.class').Ifrom} Ifrom
 */

class GreenPlum extends Postgres {

    name = 'GreenPlum';

    /**
     * @public
     * 
     * @param {string} query 
     * @param {string} prefix 
     * @param {boolean} [ifExist]
     * 
     * @returns {{ sql: string, name: string }}
     */
    volatile(query, prefix, ifExist = false) {
        const lq = query.replaceAll(';', '');
        const md5 = GlobalService.md5(lq);
        const id = `${prefix}${md5}`;

        let sql = `drop table if exists ${id}; CREATE TEMP TABLE ${id} ON COMMIT DROP AS (${lq}) DISTRIBUTED randomly; analyze ${id};`;

        if (ifExist) {
            sql = `DO $$
DECLARE 
    table_exists BOOLEAN;
BEGIN
    table_exists := (to_regclass('pg_temp_' || pg_backend_pid() || '.${id}') IS NOT NULL);

    IF NOT table_exists THEN 
     -- Сначала создайте простую таблицу для теста
        CREATE TEMP TABLE ${id} ON COMMIT DROP AS (${lq}) DISTRIBUTED RANDOMLY;
        ANALYZE ${id};
    END IF;
END $$;`
        }

        return { sql, name: id };
    }

    /**
     * @potected
     * 
     * @param {*} SQL 
     * @param {*} inputOptions 
     * @returns 
     */
    async setQueryTags(SQL, inputOptions) {
        return super.setQueryTags(SQL, inputOptions);
    }

    /**
     * @protected
     *
     * @param {string | { query: string, bind: any[] }} SQL
     * @param {{ type?: string, transaction?: object, tags?: Record<string, string>, timeOut?: number }} [options]
     */
    async query(SQL, options) {
        options = options ?? {};

        let requestSql = SQL;
        if (options.type === QueryTypes.SELECT)
            requestSql = await this.setQueryTags(SQL, options);

        return this.connector.query(requestSql, options).catch((e) => {
            console.error(e);

            switch (e.name) {
                case 'SequelizeConnectionAcquireTimeoutError':
                    e.message = 'Нет доступных соединений с базой данных.';
                    break;
                case 'SequelizeConnectionRefusedError':
                    e.message = 'В соединении с базой данных отказано.';
                    break;
                case 'SequelizeConnectionTimedOutError':
                    e.message = 'Истекло время попытки соединения с базой данных.';
                    break;
                case 'SequelizeTimeoutError':
                    e.message = 'Истекло время выполнения запроса к базе данных.';
                    break;
            }

            if (e.original) {
                switch (e.original.code) {
                    case '57014':
                        e.message = 'Превышено предельное допустимое время выполнения запроса.';
                        break;
                    case '53300':
                        e.message = 'Превышено количество допустимых соединений с базой данных.';
                        break;
                }
            }

            throw e;
        });
    }
}

module.exports = GreenPlum;
