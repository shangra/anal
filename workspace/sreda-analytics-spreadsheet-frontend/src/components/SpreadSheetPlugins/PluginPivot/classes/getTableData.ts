// eslint-disable-next-line import/no-unresolved
import PQueue from 'p-queue';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line camelcase
import $api, { $_api } from '../../../../helpers/axios';
import { PIVOT_ACTION } from '../constants';
import { PluginPivot } from '../PluginPivot';
import {
    IFetchOptions,
    PluginPivotArgs,
    PluginPivotDataSettingsParams,
    PluginPivotDataSettingsParamsHeader,
    PluginPivotFilter,
    PluginPivotFilterGroup,
    PluginPivotOptions,
    PluginPivotSort,
} from '../types';

enum TYPES_ITEM_LIST {
    COLUMNS = 'columns',
    ROWS = 'rows',
    VALUES = 'values',
    FILTER = 'filter',
}
export class GetTableData {
    pluginPivot: PluginPivot;

    options?: PluginPivotOptions;

    server: string;

    answerIds: string[] = [];

    queue: PQueue = new PQueue({ concurrency: Infinity });

    abortController: AbortController;

    constructor(pluginPivot: PluginPivot, options?: PluginPivotOptions) {
        this.pluginPivot = pluginPivot;
        this.options = options;
        this.server = options?.server ?? '';
        this.queue = new PQueue({ concurrency: Number(options?.reqLimit) || Infinity });
        this.abortController = new AbortController();
    }

    /**
     * Добавление answerId в массив
     */
    addAnswerId(answerId: string): void {
        if (!this.answerIds.includes(answerId)) {
            this.answerIds.push(answerId);
        }
    }

    /**
     * Удаление  answerId из массива
     */
    deleteAnswerId(answerId: string): void {
        this.answerIds = this.answerIds.filter((el) => el !== answerId);
    }

    /**
     * Сброс всех answerId
     */
    clearAnswerIds(): void {
        this.answerIds = [];
    }

    /**
     * Отмена всех активных запросов в базах
     */
    async cancelAllRequests(): Promise<void> {
        if (this.answerIds.length === 0) return;

        await $api
            .post(`${this.server}pivottables/body/query/cancel`, {
                answerIds: this.answerIds,
            })
            .catch(console.log)
            .finally(() => {
                this.answerIds = [];
            });
    }

    /*
     * Отмена всех активных запросов (текущих + ожидающих в очереди)
     */
    cancelCurrentRequest = (): Promise<void> => {
        // Отменяем все текущие HTTP-запросы
        this.abortController.abort('Загрузка отменена');
        this.abortController = new AbortController();

        return this.cancelAllRequests();
    };

    getWhereParamsRecursive = (
        andArray: PluginPivotFilterGroup[],
        items: PluginPivotArgs[TYPES_ITEM_LIST],
        parentKey?: string,
    ) => {
        for (const item of items) {
            const filters = (item?.filter ?? []).filter(
                (f) => f.value === 0 || f.value || f.from === 0 || f.from || f.to === 0 || f.to,
            );
            const key = [parentKey, item.name].filter(Boolean).join('.');

            const fieldFilters: PluginPivotFilterGroup = {};
            for (let i = 0; i < filters.length; i++) {
                const filter = filters[i];

                const fieldItem: PluginPivotFilter = { [key]: {} };
                if (filter?.filterBy && filter.filterBy !== '') {
                    if (filter.filterBy === '$between') {
                        const between: PluginPivotFilter = {};

                        // обязательно условие для $between - заполнение и from и to
                        // поэтому лучше $gte и $lte
                        if (filter.from || filter.from === 0) {
                            between.$gte = filter.from;
                        }
                        if (filter.to || filter.to === 0) {
                            between.$lte = filter.to;
                        }

                        fieldItem[key] = between;
                    } else if (filter.filterBy !== '$between' && (filter.value === 0 || filter.value)) {
                        let prefix = '';
                        let suffix = '';
                        let filterOperator = filter.filterBy;
                        let filterValue = filter.value;

                        // filterBy: eq,ne,gte,gt,lte,lt,substring,startsWith,endsWith
                        if (['$startsWith', '$iLike', '$notILike', '$endsWith'].includes(filter.filterBy)) {
                            switch (filter.filterBy) {
                                case '$startsWith':
                                    prefix = '%';
                                    filterOperator = '$iLike';
                                    break;
                                case '$endsWith':
                                    suffix = '%';
                                    filterOperator = '$iLike';
                                    break;
                                default:
                                    prefix = '%';
                                    suffix = '%';
                                    break;
                            }
                            filterValue = `${prefix}${filter.value}${suffix}`;
                        }

                        fieldItem[key] = {
                            [filterOperator]: filterValue,
                        };
                    }
                } else if (filter.value === 0 || filter.value) {
                    fieldItem[key] = { $eq: filter.value };
                }

                // Для плоских справочников не нужно передавать level на бек
                if (filter.level != null) {
                    (fieldItem[key] as PluginPivotFilter).__level__ = filter.level;
                }

                if (filter.__level__ != null && typeof filter.__level__ === 'object') {
                    (fieldItem[key] as PluginPivotFilter).__level__ = filter.level ?? filter.__level__;
                }

                const comparison = filter.comparison ?? 'or';
                fieldFilters[`$${comparison}`] ??= [];
                fieldFilters[`$${comparison}`]!.push(fieldItem);
            }

            if (Object.keys(fieldFilters).length) andArray.push(fieldFilters);

            if (item.hasChild && item.child?.length) {
                andArray = this.getWhereParamsRecursive(andArray, item.child, key);
            }
        }

        return andArray;
    };

    getWhereParams = (pivotParams: PluginPivotArgs): PluginPivotFilterGroup => {
        let where: PluginPivotFilterGroup = {};

        const $and: PluginPivotFilterGroup[] = [];
        for (const type of Object.values(TYPES_ITEM_LIST)) {
            if (!pivotParams[type]) continue;

            const result = this.getWhereParamsRecursive($and, pivotParams[type]);

            if (result.length > 0) where = { $and: result };
        }

        return where;
    };

    getOrderParams = (pivotParams: PluginPivotArgs) => {
        const orderData: PluginPivotDataSettingsParams['order'] = {};

        const recursive = (order: PluginPivotSort[], items: PluginPivotArgs[TYPES_ITEM_LIST], parent?: string) => {
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

            recursive(orderData[type]!, pivotParams[type]);
        }

        return orderData;
    };

    getCleanParams = (array: PluginPivotArgs[TYPES_ITEM_LIST]): PluginPivotDataSettingsParamsHeader[] => {
        const allowed = ['id', 'name', 'sqlName', 'label', 'description', 'ref', 'manifest', 'type'] as const;

        const cleanArray: PluginPivotDataSettingsParamsHeader[] = [];
        if (array?.length > 0) {
            array.forEach((item) => {
                const cleanItem = allowed.reduce((acc, cur) => {
                    // @ts-ignore
                    if (item[cur]) acc[cur] = item[cur];

                    return acc;
                }, {} as PluginPivotDataSettingsParamsHeader);

                if (item?.child && item?.child.length > 0) {
                    cleanItem.child = this.getCleanParams(item.child);
                }

                cleanArray.push(cleanItem);
            });
        }
        return cleanArray;
    };

    getLayersParams = (pivotParams: PluginPivotArgs) =>
        this.getCleanParams(pivotParams.layers.filter((layer) => layer.isSelected));

    getBodyForCreatePivot = (pivotParams: PluginPivotArgs): PluginPivotDataSettingsParams => {
        const where = this.getWhereParams(pivotParams);
        const order = this.getOrderParams(pivotParams);
        const columns = this.getCleanParams(pivotParams?.columns);
        const rows = this.getCleanParams(pivotParams?.rows);
        const values = this.getCleanParams(pivotParams?.values);
        const layers = this.getLayersParams(pivotParams);
        const body: PluginPivotDataSettingsParams = {
            columns,
            rows,
            values,
            where,
            order,
            layers,
            totals: {
                indexes: pivotParams.rowsTotal || undefined,
                columns: pivotParams.columnsTotal || undefined,
                totals: (pivotParams.rowsTotal && pivotParams.columnsTotal) || undefined,
            },
            isMask: pivotParams.isMask || false,
            recalculate: pivotParams.recalculate || false,
            showAll: {
                columns: pivotParams.columnsAllValues || false,
                rows: pivotParams.rowsAllValues || false,
            },
        };

        return body;
    };

    /**
     * Метод повторного запроса данных куба с поддержкой отмены
     * @param {string} infoserviceId UUID инфосервиса
     * @param {string} pivotId UUID куба
     * @param {string} [signal] Сигнал отмены
     * @param {string} [server] Сервер
     * @param {number} [max=100] Максимальное число повторений запроса
     * @param {number} [delay=500] Задержка перед выполнением повторного запроса
     * @param {function} [onWait] Колбэк при статусе 'wait'
     * @returns {Promise<{}>}
     */
    static async retryGetRawPivotData(
        infoserviceId: string,
        pivotId: string,
        signal?: AbortSignal,
        server?: string,
        // eslint-disable-next-line default-param-last
        max: number = 100,
        // eslint-disable-next-line default-param-last
        delay: number = 500,
        onWait?: (attempt: number) => void,
    ): Promise<any> {
        if (!infoserviceId) throw new Error('Не передан идентификатор инфосервиса');
        if (!pivotId) throw new Error('Не передан идентификатор статуса построения среза');

        for (let i = 0; i < max; i++) {
            if (signal?.aborted) {
                throw new DOMException('Запрос отменен', 'AbortError');
            }

            // eslint-disable-next-line no-await-in-loop, camelcase
            const response = await $_api.get(`${server}pivottables/body/${infoserviceId}/${pivotId}`, { signal });

            if (response.data?.status === 'ok') {
                return response.data;
            }

            if (response.data?.status === 'wait') {
                onWait?.(i + 1);

                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => {
                    const timeoutId = setTimeout(resolve, delay);
                    if (signal) {
                        signal.addEventListener(
                            'abort',
                            () => {
                                clearTimeout(timeoutId);
                                resolve(null);
                            },
                            { once: true },
                        );
                    }
                });
            }
        }
        throw new Error('Превышено количество попыток получения статуса среза или сервер вернул неподходящий ответ');
    }

    getRawPivotData = async (
        id: string,
        params: PluginPivotDataSettingsParams,
        { sliceTraceId, signal, requestId, ...options }: { sliceTraceId?: string; signal?: AbortSignal; requestId?: string },
    ) => {
        let answerId: string | null = null;

        try {
            // eslint-disable-next-line camelcase
            const response = await $_api.post(
                `${this.server}pivottables/body/new/${id}`,
                { ...params, ...options },
                {
                    params: { sliceTraceId },
                    signal,
                },
            );

            ({ answerId = null } = response.data ?? {});

            if (answerId) this.addAnswerId(answerId);

            if (response.data.status === 'ok') {
                return response.data;
            }

            if (response.data.status === 'wait') {
                return await GetTableData.retryGetRawPivotData(
                    id,
                    response.data.answerId,
                    signal,
                    this.server,
                    1000,
                    2000,
                    (attempt) => {
                        this.pluginPivot.tableAdapter.emitEvent(PIVOT_ACTION.ON_FETCH_WAIT, {
                            attempt,
                            answerId: response.data.answerId,
                            requestId,
                        });
                    },
                );
            }

            throw new Error('Сервер вернул неподходящий ответ');
        } catch (e: any) {
            const { status = -100, data: { name = '', code = '', message = '', stack = '', errors = [], payload = {} } = {} } =
                e?.response || { data: e };

            if (!errors?.length) {
                errors.push({ message: e.toString(), stack: '' });
            }

            // eslint-disable-next-line no-throw-literal
            throw { status, name, code, message, stack, errors, answerId: payload.answerId, payload };
        } finally {
            if (answerId) this.deleteAnswerId(answerId);
        }
    };

    getTableData = (id: string, params: PluginPivotDataSettingsParams, options: IFetchOptions = {}) => {
        const requestId = uuidv4();

        this.pluginPivot.tableAdapter.emitEvent(PIVOT_ACTION.ON_FETCH_START, { options, requestId });

        const { signal } = this.abortController;

        return this.queue.add(
            async ({ signal: queueSignal }) =>
                this.getRawPivotData(id, params, { ...options, signal: queueSignal, requestId })
                    .then((response) => {
                        const data = {
                            answerId: response.answerId,
                            data: response.table,
                            refs: response.refs,
                            refFields: response.refFields,
                            loadedRows: response.table?.data?.length ?? 0,
                            totalRows: response.totalRows ?? 0,
                            isLoadingTable: false,
                            status: response.status,
                        };

                        this.pluginPivot.tableAdapter.emitEvent(PIVOT_ACTION.ON_FETCH_END, { data, requestId });

                        return data;
                    })
                    .catch((e) => {
                        if (e.name !== 'CanceledError' && e.name !== 'AbortError') {
                            this.pluginPivot.tableAdapter.emitEvent('PLUGIN_FETCH_ERROR/EVENT', {
                                title: 'Ошибка формирования куба данных',
                                requestId,
                                ...e,
                            });
                        }

                        this.pluginPivot.tableAdapter.emitEvent(PIVOT_ACTION.ON_FETCH_END, {
                            title: 'Ошибка формирования куба данных',
                            requestId,
                            ...e,
                        });

                        throw e;
                    }),
            { signal },
        );
    };
}
