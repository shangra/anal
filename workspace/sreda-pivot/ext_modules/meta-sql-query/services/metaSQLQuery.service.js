const Extensions = require('../../../core/class/Extensions.class');
const ApiError = require('../../../core/exceptions/ApiError');
const MetadataClass = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataClass();
const { Parser } = require('node-sql-parser');
const ConnectorClass = require('../../metadata-connector/services/metadata/Connector.class');

class metaSQLQueryService extends Extensions {
    async convertAST(ast, options) {
        // WARN:
        // https://www.postgresql.org/docs/current/sql-select.html
        // "PostgreSQL allows INSERT, UPDATE, DELETE, and MERGE to be used as WITH queries. This is not found in the SQL standard."

        // пример рабочего опасного запроса (при этом в корневом ast атрибут type == 'select'):
        // WITH xxx AS (
        //     DELETE FROM tbl WHERE true
        // )
        // SELECT * FROM xxx;

        // однако, node-sql-parser отвалится с ошибкой, ибо такие запросы (на данный момент) поедать не умеет
        // так что можем защиниться только от into, в остальном придётся полагаться на девопсов

        // ast.type         // (ok) permit 'select'; forbid any other, including, but not limited to: 'delete', 'update', 'insert'
        // ast.with         // subqueries
        // ast.options
        // ast.distinct
        // ast.columns      // subqueries
        // ast.into         // (ok) forbid
        // ast.from         // subqueries
        // ast.where        // subqueries
        // ast.groupby      // subqueries
        // ast.having       // subqueries
        // ast.orderby      // subqueries
        // ast.limit        // permit
        // ast.locking_read // permit
        // ast.window       // permit
        // ast.qualify?
        // ast.parentheses_symbol?
        // ast.parentheses?
        // ast.loc?
        // ast.collate      // permit
        // ast._next        // next compound statement
        // ast.set_op       // 'union [distinct]', 'union all', 'intersect', 'except'

        if ('select' !== ast.type) {
            throw new ApiError(403, 'Разрешено использовать только SELECT', []);
        }

        if (null != ast.into?.type) {
            throw new ApiError(403, 'Невозможно использовать SELECT INTO', []);
        }

        // подстановка schema из options
        //@ts-ignore
        if (ast.from)
            ast.from.forEach((from) => {
                let table = from.table;
                if (from.join) {
                    // здесь не всегда так, стоит смотреть from.schema
                    // нужны тесткейсы
                    let tableArr = table.split('.');
                    table = tableArr[tableArr.length - 1];
                } else {
                    table = options.table;
                }

                if (options.schema) {
                    from.table = `${options.schema}"."${table}`;
                } else {
                    from.table = `${options.table}`;
                }
            });

        if (ast.set_op) {
            ast._next = await this.convertAST(ast._next, options);
        }

        return ast;
    }

    async postQuery(id, body) {
        let result = {};
        const sql = body.script;

        const metadataObject = await Metadata.getItem(id);
        const table = metadataObject.manifest.settings.table;

        const connectorRef = metadataObject.manifest.settings.connector;
        const connectorId = typeof connectorRef === 'object' ? connectorRef.value : connectorRef;
        const Connector = new ConnectorClass();
        const { connector, connectorData } = await Connector.getConnector(connectorId);

        const opt = {
            database: 'Postgresql',
        };

        let rsql = '';

        const parser = new Parser();
        try {
            // SELECT * FROM FF WHERE nproductmk = 1040300
            // UNION ALL
            // SELECT * FROM FF WHERE nproductmk = 1040300

            let ast = parser.astify(sql, opt);
            if (Array.isArray(ast)) {
                if (1 == ast.length) {
                    // пусть спокойно используют ";" в конце
                    ast = ast[0];
                } else {
                    throw new ApiError(403, 'Для выполнения принимается только один запрос', []);
                }
            }
            const rast = await this.convertAST(ast, { schema: connector.Model.schema, table });
            rsql = parser.sqlify(rast, opt);
        } catch (err) {
            if (err instanceof ApiError) throw err;
            throw new ApiError(404, 'Ошибка структуры SQL запроса', err);
        }

        try {
            // rsql = `SELECT "TMP".* FROM ( ${rsql} ) AS "TMP" LIMIT 100`;
            rsql = `WITH "tmp" AS (${rsql}) SELECT * FROM "tmp" LIMIT 100`;

            const resultDB = await connector.querySql(rsql);
            result = {
                sql: rsql,
                data: resultDB[0],
            };
        } catch (err) {
            throw new ApiError(404, 'Ошибка выполнения SQL запроса', [rsql]);
        }

        return result;
    }
}

module.exports = metaSQLQueryService;
