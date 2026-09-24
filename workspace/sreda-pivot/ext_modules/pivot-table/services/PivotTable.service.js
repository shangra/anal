const Extensions = require('../../../core/class/Extensions.class');

const { randomUUID } = require('crypto');
const PivotPythonServiceClass = require('./PivotPython.service');

const MemorySave = require('../../../core/services/memory-save');
const CubesClass = require('../../metadata-cubes/services/metadata/Cubes.class');
const ApiError = require('../../../core/exceptions/ApiError');
const MetadataService = require('../../metadata-cmp/services/Metadata.service');
const Metadata = new MetadataService();

const { mergeDeep, sleep } = require('../../utils/services');
const InfoserviceClass = require('../../metadata-infoservice/services/metadata/Infoservice.class');
const { ref_extract } = require('../../metadata-cmp/util');
const httpContext = require('../../../core/services/http-context');

/**
 * @typedef {import("sequelize").FindOptions} SequelizeFindOptions
 */

class PivotTableService extends Extensions {

    TRACE_NAME = 'traceId';

    CANCEL_USER_MESSAGE = 'CancelByUser';

    constructor() {
        super();
        this.numberDefaultParams = [
            { name: 'sum', sqlName: 'SUM', label: 'Сумма', type: 'float' },
            { name: 'len', sqlName: 'COUNT', label: 'Количество', type: 'number' },
            { name: 'distinctLen', sqlName: 'DISTINCT_COUNT', label: 'Количество уникальных', type: 'number' },
            { name: 'mean', sqlName: 'AVG', label: 'Среднее', type: 'float' },
            { name: 'min', sqlName: 'MIN', label: 'Минимум', type: 'float' },
            { name: 'max', sqlName: 'MAX', label: 'Максимум', type: 'float' },
            {
                name: 'FirstChild',
                sqlName: 'FIRST_VALUE',
                label: 'Первый дочерний',
                type: 'float',
                combined: true
            },
            {
                name: 'LastChild',
                sqlName: 'LAST_VALUE',
                label: 'Последний дочерний',
                type: 'float',
                combined: true
            },
            {
                name: 'ACCOUNT',
                sqlName: 'ACCOUNT',
                label: 'Показатели',
                type: 'float',
                combined: true
            }
            // { name: 'FirstNonEmpty', sqlName: 'MAX', label: 'FirstNonEmpty', type: 'number' },
            // { name: 'LastNonEmpty', sqlName: 'MAX', label: 'LastNonEmpty', type: 'number' },
            // { name: 'multiple', label: 'Произведение', type: 'number' },
        ];
    }

    /**
     * Логгер
     * @private
     * 
     * @param {object} meta 
     * @param {string} msg 
     * @returns {Promise<void>}
     */
    async console(msg, meta) {
        // SREDA-overload
    }

    async getAnswerKey(answerId) {
        return `PivotAnswer_${answerId}`;
    }

    async getDefaultChild(array) {
        for (const item of array) {
            if (['number', 'float', 'integer'].includes(item.type)) {
                item.child = this.numberDefaultParams;
                if (item.aggregations.length) {
                    const items = item.aggregations.map((i) => i.aggrFunc.toUpperCase());

                    item.child = item.child.filter(({ sqlName }) => items.includes(sqlName));
                }
            }
        }
        return array;
    }

    async convertParam(obj) {
        let type;
        if (typeof obj.type === 'string') type = obj.type;
        if (typeof obj.type === 'object' && typeof obj.type?.value === 'string') type = obj.type.value;
        if (type === 'number') type = 'float';
        // if (obj.ref) type = 'ref';

        const newObj = {
            id: obj.id,
            description: obj?.description,
            name: obj.field,
            label: obj.name,
            ref: obj.ref,
            typeParam: obj.typeParam,
            type: type?.toLowerCase(),
            aggrFunc: obj.aggrFunc,
            format: obj.format,
            totalsOnoff: obj.totalsOnoff,
            dateDimension: obj.dateDimension,
            accountDimension: obj.accountDimension,
            onoffFilter: obj.onoffFilter,
            applyUnits: obj.applyUnits,
            aggregations: obj.aggregations || []
        };
        return newObj;
    }

    /**
     * @param {string} id
     */
    async getMenuParameters(id, options = { limit: 1 }) {
        const meta = await Metadata.getParentInstance(id, {});
        if (!meta || typeof meta.tableInfo !== 'function') {
            return { params: [], layers: [] };
        }
        const treeObject = await meta.tableInfo(meta, id);
        return this.getCubeParamsForFront(treeObject || {});
    }

    /**
     * @param {string} id
     */
    async getMenuChildParams(id) {
        const meta = await Metadata.getParentInstance(id, {});
        if (!meta || typeof meta.tableInfo !== 'function') {
            return { params: [] };
        }
        const treeObject = await meta.tableInfo(meta, id);
        const result = await this.getParamsForFront(treeObject || {});
        return result;
    }

    async getCubeParamsForFront(treeObject) {
        const infocerviceOwners = new Set();

        const _layers = new Map();
        for (const [infoserviceListGUID, infoserviceList] of Object.entries(treeObject.Infoservices ?? {})) {
            const { value: id } = ref_extract(infoserviceList.ref);
            if (!id) continue;

            const Infoservice = await Metadata.getItem(id);

            if (!Infoservice) continue;

            const layer = structuredClone(infoserviceList);

            try {
                const meta = new InfoserviceClass({ id });
                layer.treeObject = await meta.tableInfo(meta, id);
            } catch (e) {
                layer.treeObject = { Fields: {} };
            }

            layer.onoff = Infoservice?.manifest?.settings?.onoff || false;
            layer.reason = Infoservice?.manifest?.settings?.blockMessage || '';

            /** @deprecated While frontend cannot use direct property `ref` */
            layer.manifest = { settings: { ref: layer.ref } };

            _layers.set(infoserviceListGUID, layer);
        }

        const paramsArray = [];
        for (const fieldName of Object.keys(treeObject.Measures ?? {})) {
            const measure = treeObject.Measures[fieldName];
            const { id, name, description, aggrFunc, groupTag, infoservice_owner = [] } = measure;

            const fio = ref_extract(infoservice_owner[0]);
            const iTree = fio.value && _layers.get(fio.value)?.treeObject;

            const field = mergeDeep(
                {},
                treeObject?.Fields?.[fieldName] || {},
                iTree?.Fields?.[fieldName] || {}
            );

            field.id = id;
            field.name = name;
            field.description = description;
            field.aggrFunc = aggrFunc;
            field.typeParam = 'Measure';

            try {
                const param = await this.convertParam(field);
                param.groupTag = groupTag;
                paramsArray.push(param);
            } catch {
                continue;
            }

            infoservice_owner.forEach(i => infocerviceOwners.add(i?.value || i));
        }

        for (const fieldName of Object.keys(treeObject.Dimensions ?? {})) {
            const dimension = treeObject.Dimensions[fieldName];
            const { id, name, description, groupTag, infoservice_owner = [] } = dimension;

            const fio = ref_extract(infoservice_owner[0]);
            const iTree = fio.value && _layers.get(fio.value)?.treeObject;

            const guideField = iTree?.Fields?.[fieldName];

            const field = mergeDeep(
                {},
                treeObject?.Fields?.[fieldName] || {},
                guideField || {},
            );

            field.id = id;
            field.name = name;
            field.description = description;
            field.typeParam = 'Dimension';

            try {
                const param = await this.convertParam(field);
                param.groupTag = groupTag;
                paramsArray.push(param);
            } catch {
                continue;
            }

            infoservice_owner.forEach(i => infocerviceOwners.add(i?.value || i));
        }

        const params = await this.getDefaultChild(paramsArray);

        const layers = [];
        for (const [, layer] of _layers.entries()) {
            delete layer.treeObject;
            layers.push(layer);
        }

        return { params, layers };
    }

    async getParamsForFront(treeObject) {
        const paramsArray = [];
        for (const Field of Object.values(treeObject?.Fields || {})) {
            try {
                paramsArray.push(await this.convertParam(Field));
            } catch {
                continue;
            }
        }
        const params = await this.getDefaultChild(paramsArray);
        return { params };
    }

    sqlFunc(func) {
        return this.numberDefaultParams.find((i) => i.name === func)?.sqlName || func;
    }

    /**
     * @param {string} id
     * @param {SequelizeFindOptions} params
     * @param {object} options
     */
    async get(id, params, options) {
        const answerId = randomUUID();
        httpContext.set('answer-id', answerId);

        // Генерируется в UI, для отслеживания подзапросов среза
        httpContext.set('slice-trace-id', options.sliceTraceId);

        const traceId = httpContext.get('trace-id');

        let result = { answerId, status: 'wait', params, table: {}, totalRows: 0, traceId };

        const answerKey = await this.getAnswerKey(answerId);
        await MemorySave.set(answerKey, result, { isLocal: false, ttl: sreda.env?.PIVOT_ANSWER_TTL || 1000 * 60 * 5 });

        result = (await Promise.race([this._get(result, id, params, options), sleep(1_000)])) ?? result;

        if (result?.status === 'error') {
            throw ApiError.ServerError('Ошибка при формировании среза', [result.errors], { answerId });
        }

        return result;
    }

    /**
     * @protected
     *
     * @param {string} id
     * @param {object} params
     * @param {object} options
     */
    async _get(result, id, params, options) {
        if (!(params.rows.length > 0 && params.values.length > 0)) {
            return { ...result, return: 'ok' };
        }

        try {
            const json = await this.prepare(params);

            const table = await this.table(id, json);

            let pivoted;
            if (options.answerType === 'pivot') {
                pivoted = await this.pivot(table, json, params);
            }

            await this.console('Закончили формировать таблицу!');

            result = {
                ...result,
                status: 'ok',
                table: pivoted || table,
                refs: table.refs,
                refFields: table.refFields
            };
        } catch (e) {
            if (CubesClass.isRecoverableQueryError(e)) {
                result = {
                    ...result,
                    status: 'ok',
                    table: {
                        data: [],
                        columns: [],
                    },
                    refs: {},
                    refFields: {},
                    warnings: [e.message || String(e)],
                };
            } else {
                result = {
                    ...result,
                    status: 'error',
                    message: e.message,
                    stack: e.stack,
                    errors: [],
                    payload: {
                        answerId: result.answerId
                    }
                };
            }
        } finally {
            const answerKey = await this.getAnswerKey(result.answerId);
            await MemorySave.set(answerKey, result, { isLocal: false, ttl: sreda.env?.PIVOT_ANSWER_TTL || 1000 * 60 * 5 });
        }

        if (result.status === 'error') {
            result.status = 500;
            throw result;
        }

        return result;
    }

    async prepare(params) {
        const json = {
            settings: {
                columns: [],
                index: [],
                values: [],
                aggfunc: {},
                totals: {},
                where: params.where,
                order: Object.values(params.order ?? []).flat(1),
                fields: {},
                isMask: false,
            },
            data: []
        };

        if (params.totals) {
            json.settings.totals = params.totals;
        }

        if (params.isMask) {
            json.settings.isMask = params.isMask;
        }

        if (params.columns.length > 0) {
            //TODO убрать костылек, когда реализуем сортировку по значениям и слоям
            params.columns = params.columns.filter((item) => item.type !== 'static')
            const usedStatics = params.columns.filter((item) => item.type === 'static').map(i => i.name);
            for (const column of params.columns) {
                if (column.type === 'static') {
                    json.settings.columns.push(column.name);
                } else {
                    // Убираем статичные
                    const usedNonStatics = json.settings.columns.filter(col => !usedStatics.includes(col));

                    if (usedNonStatics.length > 0) continue;

                    json.settings.columns.push(column.name);

                    const children = [];
                    (column.child || []).forEach((column) => {
                        column.name && children.push(column.name);
                    });

                    if (children.length) {
                        json.settings.fields[column.name] ||= {};
                        json.settings.fields[column.name].children = children;
                    }
                }
            }
        }

        if (params.rows.length > 0) {
            //TODO убрать костылек, когда реализуем сортировку по значениям и слоям
            params.rows = params.rows.filter((item) => item.type !== 'static');
            const usedStatics = params.rows.filter((item) => item.type === 'static').map(i => i.name);
            for (const row of params.rows) {
                if (row.type === 'static') {
                    json.settings.index.push(row.name);
                } else {
                    // Убираем статичные
                    const usedNonStatics = json.settings.index.filter(r => !usedStatics.includes(r));

                    if (usedNonStatics.length > 0) continue;

                    json.settings.index.push(row.name);

                    const children = [];
                    (row.child || []).forEach((column) => {
                        column.name && children.push(column.name);
                    });

                    if (children.length) {
                        json.settings.fields[row.name] ||= {};
                        json.settings.fields[row.name].children = children;
                    }
                }
            }

            // const row = params.rows[0];
            // json.settings.index.push(row.name);

            // const children = [];
            // (row.child || []).forEach((row) => {
            //     row.name && children.push(row.name);
            // });

            // if (children.length) {
            //     json.settings.fields[row.name] ||= {};
            //     json.settings.fields[row.name].children = children;
            // }
        }

        for (let i = 0; i < params.values.length; i++) {
            if (!params.values[i].child?.length) {
                throw ApiError.BadRequest('Не указан тип агрегации для меры');
            }

            const value = params.values[i];
            json.settings.values.push(value.name);

            for (let j = 0; j < value.child.length; j++) {
                const aggregation = value.child[j];
                const layers = params.layers ?? aggregation.layers;
                for (let l = 0; l < layers.length; l++) {
                    const layer = structuredClone(layers[l]);
                    json.settings.aggfunc[value.name] ||= [];
                    json.settings.aggfunc[value.name].push({
                        name: this.sqlFunc(aggregation.name),
                        layer
                    });
                }
            }
        }

        return json;
    }

    async table(id, json) {
        await this.console(`Формируем таблицу`);

        return new CubesClass({ id }).cube(id, json);
    }

    /**
     * @param {object} table
     * @param {object} json
     * @param {object} params
     * @returns
     */
    async pivot(table, json, params) {
        await this.console(`Пивотируем таблицу`, { query: { rows: table.rows } });

        // json = JSON.parse(JSON.stringify(json));

        json.settings = { ...json.settings, values: [], aggfunc: {} };

        for (let i = 0; i < params.values.length; i++) {
            const value = params.values[i];
            for (let j = 0; j < value.child.length; j++) {
                const aggregation = value.child[j];
                const layers = params.layers ?? aggregation.layers;
                for (let l = 0; l < layers.length; l++) {
                    const layer = layers[l];
                    const name = `${value.name}:->:${layer.name}:->:${this.sqlFunc(aggregation.name).toUpperCase()}`;
                    json.settings.values.push(name);
                    json.settings.aggfunc[name] ||= [];
                    json.settings.aggfunc[name].push(aggregation.name);
                }
            }
        }

        json.data = table?.rows || [];

        const hierarchyFields = table?.hierarchyFields || {};

        let pivoted = {
            columns: [],
            index: [],
            data: []
        };
        if (json.data.length > 0) {
            const PivotPythonService = new PivotPythonServiceClass();
            pivoted = await PivotPythonService.get(json, table);
            pivoted.totals = table.totals;
        }

        const aggregate = {};
        this.numberDefaultParams.forEach((aggr) => {
            aggregate[aggr.sqlName] = aggr;
        });

        pivoted.settings = {
            params,
            index: {},
            columns: {}
        };
        if (params.rows.length > 0 && hierarchyFields[params.rows[0].name]?.hierarchy) {
            pivoted.settings.index = { ...pivoted.settings.index, hierarchy: true };
        }
        if (params.columns.length > 0 && hierarchyFields[params.columns[0].name]?.hierarchy) {
            pivoted.settings.columns = { ...pivoted.settings.columns, hierarchy: true };
        }

        if (params.rows.length !== json.settings.index.length) {
            pivoted.settings.index = { ...pivoted.settings.index, open: true };
        }
        if (params.columns.length !== json.settings.columns.length) {
            pivoted.settings.columns = { ...pivoted.settings.columns, open: true };
        }

        return pivoted;
    }

    async getTableDataResults(id, answerId, options) {
        const answerKey = await this.getAnswerKey(answerId);

        const result = await MemorySave.get(answerKey, { isLocal: false });
        if (!result) {
            throw ApiError.BadRequest(
                'Не найден статус построения среза. Попробуйте еще раз.',
                [],
                {
                    answerId,
                    description: {
                        short: 'Возникает в случае, когда время выполнения построение среза превышает установленный порог для Среды',
                        long: 'Пробовать выполнить запрос снова с интервалом 5-10 минут. Если по истечении 10 минут проблема сохраняется - максимально уменьшить выборку данных фильтрами. Если на потенциально небольшом срезе проблема сохраняется - обратиться к ИТ-администратору сопровождению продукта.'
                    }
                }
            );
        }

        if (result.status === 'error') {
            result.status = 500;
            throw result;
        }

        // if (result.status !== 'wait') {
        //     await MemorySave.del(answerKey, { isLocal: false });
        // }

        return result;
    }

    /**
     * Отменяет активные запросы по массиву answerIds
     * @param {Object} params
     * @param {string[]} params.answerIds - массив идентификаторов ответов
     * @returns {Promise<Array|null>}
     */
    async queryCancel(params) {
        const { answerIds } = params;

        const allCancelResults = [];

        for (const answerId of answerIds) {
            try {
                const data = await this.getAnswerData(answerId);

                if (!data) {
                    allCancelResults.push({
                        answerId,
                        status: 'not_found',
                        message: `No data found for answerId: ${answerId}`
                    });
                    continue;
                }

                const connectors = await this.getConnectors(data.layers);
                const activeQueries = await this.getActiveQueriesByTraceId(connectors, data.traceId);
                const cancelResult = await this.cancelActiveQueries(activeQueries);

                allCancelResults.push({
                    answerId,
                    status: 'cancelled',
                    result: cancelResult
                });

                console.log(`Cancel results for ${answerId}:`, cancelResult);
            } catch (error) {
                console.log(`Error cancelling queries for answerId ${answerId}:`, error);
                allCancelResults.push({
                    answerId,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return allCancelResults;
    }

    /**
     * Получает данные из кэша по answerId
     * @param {string} answerId
     * @returns {Promise<Object|null>} { traceId, layers }
     */
    async getAnswerData(answerId) {
        if (!answerId) return null;

        const answerKey = await this.getAnswerKey(answerId)
        try {
            const answerData = await MemorySave.get(answerKey);

            if (answerData && answerData.params) {
                return {
                    traceId: answerData.traceId,
                    layers: this.getLayers(answerData)
                };
            }
        } catch (error) {
            console.log(`Error getting data for key ${answerKey}:`, error);
        }
        // }

        console.log(`No data found for answerId: ${answerId}`);
        return null;
    }

    /**
     * Извлекает слои из данных ответа
     * @param {Object} answerData
     * @returns {Array<Object>} [{ id, ref }]
     */
    getLayers(answerData) {
        const layers = answerData?.params?.layers;
        return layers.map((layer) => ({
            id: layer.id,
            ref: layer.ref
        }));
    }

    /**
     * Получает коннекторы GreenPlum для слоев
     * @param {Array<Object>} layers - [{ id, ref }]
     * @returns {Promise<Array<Object>>}
     */
    async getConnectors(layers) {
        const connectors = (await Promise.all(
            layers.map(async (layer) => {
                try {
                    const meta = await Metadata.getParentInstance(layer.ref);
                    const item = await meta.getItem(layer.ref);
                    const { connector } = await meta.getConnector(item);

                    return connector;
                } catch (error) {
                    console.log('Error for layer', layer.ref, error);
                    return null;
                }
            })
        ));

        return connectors;
    }

    /**
     * Получает активные запросы по traceId
     * @param {Array<Object>} connectors
     * @param {string} traceId
     * @returns {Promise<Array<Object>>} [{ connector, queries, error? }]
     */
    async getActiveQueriesByTraceId(connectors, traceId) {
        const allResults = [];

        for (const connector of connectors) {
            try {
                const result = await connector.getActiveQueriesByTrace(this.TRACE_NAME, traceId)
                allResults.push({
                    connector,
                    queries: result
                });
            } catch (error) {
                console.log('Error for connector:', error);
                allResults.push({
                    connector,
                    queries: [],
                    error
                });
            }
        }

        return allResults;
    }

    /**
     * Отменяет список активных запросов
     * @param {Array<Object>} activeQueries - [{ connector, queries: [{ pid }] }]
     * @returns {Promise<Array>}
     */
    async cancelActiveQueries(activeQueries) {
        const cancelPromises = [];

        activeQueries.forEach(({ connector, queries = [] }) => {
            queries.forEach(({ pid } = {}) => {
                if (pid) {
                    cancelPromises.push(
                        connector.cancelActiveQuery(pid, this.CANCEL_USER_MESSAGE)
                    );
                }
            });
        });

        return Promise.all(cancelPromises);
    }

}

module.exports = PivotTableService;
