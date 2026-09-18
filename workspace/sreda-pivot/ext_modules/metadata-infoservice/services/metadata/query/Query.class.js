const { mergeDeep } = require('../../../../utils/services/functions');

class QueryBuilderClass {
    constructor({ connector, meta, select, account, logger }) {
        this.connector = connector;
        this.meta = meta;
        this.select = select;
        this.account = account;
        this.logger = logger;
    }

    async query({ id, options, treeObject, from }) {
        const refsToParse = {};

        const { mappedOptions, additionalRefs, additionalRefsFields } = await this.account.matrix({
            options,
            treeObject,
            metaClass: this.meta,
        });

        const promise = mappedOptions.map(async (options) =>
            this.getRefData({ refsToParse, options, from, id })
        );

        const arr = await Promise.all(promise);

        const count = arr[0]?.count || -1;
        const rows = arr.map(({ rows }) => rows).flat();

        return {
            rows,
            count,
            refsToParse,
            additionalRefs,
            additionalRefsFields,
        };
    }

    async getRefData({ options, from, refsToParse, id }) {
        const {
            limit,
            offset,
            order,
            sql,
            refsToParse: selRefs,
        } = await this.generateSql({ options, from });

        mergeDeep(refsToParse, selRefs || {});

        const option = {
            attributes: ['*'],
            limit,
            offset,
            order,
            tags: options.tags,
            timeOut: options.timeOut,
        };

        /** @type {Promise<object[]> | []} */
        const promiseRows = this.getData(this.connector, sql, option, id);

        /** @type {Promise<number> | number} */
        const promiseCount = !options.withOutCount
            ? this.countData(this.connector, sql, option, id)
            : -1;

        const rows = await promiseRows;
        const count = await promiseCount;

        return { rows, count };
    }

    /**
     * Метод для перегрузки выборки из бд
     *
     * @param {Object} from - Запрос для orm
     *
     * @private
     */
    async getData(connector, from, options, id) {
        // NOTE запрос формируется дважды и логируется не тот, что выполняется (несмотря на то, что они де-факто должны быть одинаковые)
        this.logger.console(`Запрос к данным инфосервиса`, {
            query: await connector.findSQL(from, options),
        });
        return await connector.findAll(from, { ...options });
    }

    /**
     * метод для перегрузки выборки из бд
     * @private
     */
    async countData(connector, from, options, id) {
        return await connector.count(from, { ...options });
    }

    async generateSql({ options, from }) {
        const { refsToParse, levels, limit, offset, order } = await this.select.query(options);

        let sql = from;
        for (const level of levels) {
            sql = await this.connector.generateWithSql({
                from: sql,
                withOptions: level.withOptions,
                attributes: level.attributes,
                options: level,
            });
        }

        return { limit, offset, order, sql, refsToParse };
    }
}

module.exports = QueryBuilderClass;
