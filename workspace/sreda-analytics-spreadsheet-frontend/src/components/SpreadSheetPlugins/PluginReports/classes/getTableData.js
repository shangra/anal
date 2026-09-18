import { v4 as uuidv4 } from 'uuid';

import $api from '../../../../helpers/axios';
import { AVOID_RESTRICTIONS_OF_SOVA, MAX_REPORT_ROW, REPORTS_ACTION } from '../constants';
import { mergeObjects } from '../utils';

const TYPES_ITEM_LIST = ['columns', 'rows', 'values', 'filter'];

export class GetTableData {
    pluginPivot;

    options;

    server;

    answerIds;

    constructor(pluginPivot, options) {
        this.pluginPivot = pluginPivot;
        this.options = options;
        this.server = options?.server ?? '';
        this.answerIds = [];
    }

    setState = (_state) => {
        // console.log('GetTableData state', state);
    };

    addAnswerId(answerId) {
        if (this.answerIds.includes(answerId)) return;
        this.answerIds.push(answerId);
    }

    /**
     * Отмена активных запросов в базе
     */
    async cancelAllRequests() {
        try {
            if (!this.answerIds.length) return;

            await $api.post(`${this.server}pivottables/body/query/cancel`, {
                answerIds: this.answerIds,
            });

            this.answerIds = [];
        } catch (e) {
            console.log(e);
        }
    }

    getWhereParamsRecursive = (andArray, items, prefixKey = '') => {
        if (items) {
            for (const item of items) {
                const notEmptyFilters = item?.filter?.filter(
                    (filter) => filter.value === 0 || filter.value || filter.from || filter.to,
                );
                if (notEmptyFilters && notEmptyFilters.length > 0) {
                    const fieldFilters = { $or: [] };
                    notEmptyFilters.forEach((filter) => {
                        const key = prefixKey.length ? `${prefixKey}.${item.name}` : item.name;
                        const fieldItem = { [key]: {} };

                        if (filter?.filterBy && filter.filterBy !== '') {
                            if (filter.filterBy === '$between') {
                                // обязательно условие для $between - заполнение и from и to
                                // поэтому лучше $gte и $lte
                                if (filter.from || filter.from === 0) {
                                    fieldItem[key].$gte = filter.from;
                                }
                                if (filter.to) {
                                    fieldItem[key].$lte = filter.to;
                                }
                            } else if (filter.filterBy !== '$between' && (filter.value === 0 || filter.value)) {
                                let prefix = '';
                                let suffix = '';
                                let filterOperator = filter.filterBy;

                                // filterBy: eq,ne,gte,gt,lte,lt,substring,startsWith,endsWith
                                if (['$startsWith', '$notILike', '$iLike', '$endsWith'].includes(filter.filterBy)) {
                                    switch (filter.filterBy) {
                                        case '$startsWith':
                                            suffix = '%';
                                            filterOperator = '$iLike';
                                            break;
                                        case '$endsWith':
                                            prefix = '%';
                                            filterOperator = '$iLike';
                                            break;
                                        default:
                                            prefix = '%';
                                            suffix = '%';
                                            break;
                                    }
                                }

                                fieldItem[key] = {
                                    [`${filterOperator}`]: `${prefix}${filter.value}${suffix}`,
                                };
                            }
                        } else if (filter.value === 0 || filter.value) {
                            fieldItem[key] = { $eq: filter.value };
                        }

                        if (filter.level != null) {
                            fieldItem[key].__level__ = filter.level;
                        }

                        if (filter.__level__ != null && typeof filter.__level__ === 'object') {
                            fieldItem[key].__level__ = filter.level ?? filter.__level__;
                        }

                        fieldFilters.$or.push(fieldItem);
                    });
                    andArray.push(fieldFilters);
                }
                if (item.hasChild) {
                    const childPrefix = prefixKey.length ? `${prefixKey}.${item.name}` : item.name;
                    andArray = this.getWhereParamsRecursive(andArray, item.child, childPrefix);
                }
            }
        }
        return andArray;
    };

    getWhereParams = (pivotParams) => {
        let where = {}; // { $and: [] };
        const $and = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const type of TYPES_ITEM_LIST) {
            const res = this.getWhereParamsRecursive($and, pivotParams[type]);
            if (res.length > 0) {
                where = {
                    $and: res,
                };
            }
        }
        return where;
    };

    getOrderParams = (pivotParams) => {
        const orderData = {};

        const recursive = (order, items, parent) => {
            if (!items) return;

            for (const item of items) {
                if (item.sort && item.sort.order) {
                    const field = parent ? `${parent}.${item.sort.field}` : item.sort.field;

                    order.push([field, item.sort.order]);
                }

                if (item.hasChild) recursive(order, item.child, item.name);
            }
        };

        for (const type of Object.values(TYPES_ITEM_LIST)) {
            orderData[type] = [];

            recursive(orderData[type], pivotParams[type]);
        }

        return orderData;
    };

    getCleanParams = (array) => {
        const allowed = ['name', 'sqlName', 'label', 'description', 'ref', 'manifest', 'type'];

        const cleanArray = [];
        if (array?.length > 0) {
            array.forEach((item) => {
                const cleanItem = allowed.reduce((acc, cur) => {
                    if (item[cur]) acc[cur] = item[cur];

                    return acc;
                }, {});

                if (item?.child && item?.child.length > 0) {
                    cleanItem.child = this.getCleanParams(item.child);
                }

                cleanArray.push(cleanItem);
            });
        }
        return cleanArray;
    };

    getLayersParams = (layers) =>
        layers
            .filter((layer) => layer.isSelected)
            .map((layer) => ({
                name: layer.name,
                description: layer.description,
                ref: layer.ref || layer.manifest?.settings?.ref,
            }));

    getBodyForCreatePivot = async (pivotParams) => {
        const where = this.getWhereParams(pivotParams);
        const order = this.getOrderParams(pivotParams);
        const columns = this.getCleanParams(pivotParams?.columns);
        const rows = this.getCleanParams(pivotParams?.rows);
        const values = this.getCleanParams(pivotParams?.values);
        const layers = this.getLayersParams(pivotParams.layers);
        const body = {
            columns,
            rows,
            values,
            where,
            order,
            offset: pivotParams.offset,
            layers,
            isMask: pivotParams.isMask || false,
        };
        this.setState({ pivotParams: body });
        return body;
    };

    /**
     * Метод повторного запроса данных куба.
     * @param {string} infoserviceId UUID инфосервиса
     * @param {string} pivotId UUID куба
     * @param {string} server Сервер
     * @param {number} [max=1_000] Максимальное число повторений запроса
     * @param {number} [delay=2_000] Задержка перед выполнением повторного запроса
     * @param {AbortSignal} signal Сигнал отмены
     * @param {function} [onWait] Колбэк при статусе 'wait'
     * @returns {Promise<{}>}
     */
    static async retryGetRawReportData(infoserviceId, pivotId, server, max = 1_000, delay = 2_000, signal, onWait) {
        if (!infoserviceId) throw new Error('Не передан идентификатор инфосервиса');

        if (!pivotId) throw new Error('Не передан идентификатор статуса построения среза');

        for (let i = 0; i < max; i++) {
            if (signal?.aborted) {
                throw new DOMException('Запрос отменен', 'AbortError');
            }

            /* eslint-disable no-await-in-loop */
            const response = await $api.get(`${server}reports/body/${infoserviceId}/${pivotId}`, {
                signal,
            });

            if (response.data?.status === 'ok') {
                return response;
            }

            if (response.data?.status === 'wait') {
                onWait?.(i + 1);

                await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(resolve, delay);
                    if (signal) {
                        signal.addEventListener(
                            'abort',
                            () => {
                                clearTimeout(timeoutId);
                                reject(new DOMException('Запрос отменен', 'AbortError'));
                            },
                            { once: true },
                        );
                    }
                });
            }
            /* eslint-enable no-await-in-loop */
        }

        throw new Error('Превышено количество попыток получения статуса среза или сервер вернул неподходящий ответ');
    }

    getRawReportData = async (id, params, { signal, requestId, ...options }) => {
        try {
            const response = await $api.post(
                `${this.server}reports/body/${id}`,
                { ...params, ...options },
                {
                    signal,
                },
            );

            const { data } = response;

            this.addAnswerId(response.data?.answerId);

            if (data.status === 'ok') {
                return data;
            }

            if (data.status === 'wait') {
                this.pluginPivot.tableAdapter.emitEvent(REPORTS_ACTION.ON_FETCH_WAIT, {
                    attempt: 1,
                    answerId: data.answerId,
                    requestId,
                });

                const retryResult = await GetTableData.retryGetRawReportData(
                    id,
                    data.answerId,
                    this.server,
                    1000,
                    2000,
                    signal,
                    (attempt) => {
                        this.pluginPivot.tableAdapter.emitEvent(REPORTS_ACTION.ON_FETCH_WAIT, {
                            attempt,
                            answerId: data.answerId,
                            requestId,
                        });
                    },
                );
                return retryResult.data;
            }

            throw new Error('Сервер вернул неподходящий ответ');
        } catch (e) {
            if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED' || e?.isAborted) {
                // eslint-disable-next-line no-throw-literal
                throw {
                    status: -1,
                    message: 'Запрос был отменен',
                    isAborted: true,
                    name: 'AbortError',
                };
            }

            const { status = -100, data: { message = '', stack = '', errors = [], payload = {} } = {} } = e?.response || {};

            if (!errors?.length) {
                errors.push({ message: e.toString(), stack: '' });
            }

            // eslint-disable-next-line no-throw-literal
            throw { status, message, errors, stack, answerId: payload.answerId, payload };
        }
    };

    getTableData = (body, infoserviceId, options) => {
        let queue = MAX_REPORT_ROW;
        let actualOffset = body.offset;
        const requests = [];
        const { signal } = options || {};

        while (queue > 0) {
            const requestId = uuidv4();

            this.pluginPivot.tableAdapter.emitEvent(REPORTS_ACTION.ON_FETCH_START, { options, requestId });
            if (signal.aborted) {
                const error = new Error('Запрос был отменен пользователем');
                error.isAborted = true;
                error.name = 'AbortError';

                this.pluginPivot.tableAdapter.emitEvent(REPORTS_ACTION.ON_FETCH_END, {
                    data: error,
                    requestId,
                    isAborted: true,
                });

                throw error;
            }

            requests.push(
                this.getRawReportData(
                    this.tableId ?? infoserviceId,
                    { ...body, offset: actualOffset, limit: AVOID_RESTRICTIONS_OF_SOVA },
                    { ...options, signal, requestId },
                )
                    .then((res) => {
                        this.pluginPivot.tableAdapter.emitEvent(REPORTS_ACTION.ON_FETCH_END, {
                            data: { answerId: res.answerId },
                            requestId,
                        });

                        return res;
                    })
                    .catch((e) => {
                        if (e?.isAborted || e?.name === 'AbortError') {
                            this.pluginPivot.tableAdapter.emitEvent(REPORTS_ACTION.ON_FETCH_END, {
                                data: e,
                                requestId,
                                isAborted: true,
                            });
                            throw e;
                        }

                        this.pluginPivot.tableAdapter.emitEvent(REPORTS_ACTION.ON_FETCH_ERROR, {
                            title: 'Ошибка формирования отчета',
                            requestId,
                            ...e,
                        });

                        this.pluginPivot.tableAdapter.emitEvent(REPORTS_ACTION.ON_FETCH_END, { data: e, requestId });

                        throw e;
                    }),
            );
            actualOffset += AVOID_RESTRICTIONS_OF_SOVA;
            queue -= 5_000;
        }

        return Promise.all(requests)
            .then((res) => {
                const result = {
                    refs: {},
                    refFields: {},
                    table: {},
                    loadedRows: 0,
                    treeObject: res[0].treeObject,
                    totalRows: res[0].totalRows ?? 0,
                    isLoadingTable: false,
                    params: res[res.length - 1].params ?? {
                        columns: [],
                    },
                };

                const data = res.reduce((acc, item) => acc.concat(item.table?.data ?? []), []);

                const { columns = [] } = res[0].table ?? {};

                result.table = { columns, data };
                result.loadedRows = data.length ?? 0;

                body.columns.forEach((column) => {
                    const refsArray = res.map((item) => item.refs?.[column.name] ?? {});
                    result.refs[column.name] = mergeObjects(...refsArray);
                    const refFieldsArray = res.map((item) => item.refFields?.[column.name] ?? {});
                    result.refFields[column.name] = mergeObjects(...refFieldsArray);
                });

                return result;
            })
            .catch((error) => {
                throw error;
            });
    };

    main = async (tableId, params, options) => {
        this.tableId = tableId;
        const { signal, ...restParams } = params;
        const body = await this.getBodyForCreatePivot(restParams);

        return this.getTableData(body, undefined, { signal, ...options });
    };
}
