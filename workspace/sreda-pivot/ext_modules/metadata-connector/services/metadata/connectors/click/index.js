const { createClient } = require('@clickhouse/client');

/**
 * @typedef {import('@clickhouse/client').Row<any, "JSONEachRow">} Row
 * @typedef {import('@clickhouse/client').StreamReadable<Row[]>} StreamReadable
 */

class Click {
    constructor(settings) {
        this.client = createClient({
            url: `${settings.url}:${settings.port}`,
            compression: {
                request: true,
                response: true,
            },
            max_open_connections: settings?.pool?.max,
            database: settings.config.database,
            username: settings.basicAuth.username,
            password: settings.basicAuth.password,
            keep_alive: {
                enabled: true,
            },
            clickhouse_settings: {
                async_insert: 1,
            },
            request_timeout: settings.config.session_timeout * 1_000,
        });
    }

    /**
     * @param {string} SQL 
     * @returns {Promise<{ stream: StreamReadable}>}>}
     */
    async stream(SQL) {
        console.log(SQL);

        const res = await this.client.query({ query: SQL, format: 'JSONEachRow' });

        const stream = res.stream();

        return { stream }
    }

    /**
     * @param {string} SQL 
     * @returns {Promise<{ data: object[] }>}
     */
    async query(SQL) {
        console.log(SQL);

        const res = await this.client.query({ query: SQL, format: 'JSONEachRow', });

        const data = await res.json();

        return { data };
    }
}

module.exports = Click;