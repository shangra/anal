// eslint-disable-next-line import/no-unresolved
import PQueue from 'p-queue';

import $api from '../../../../helpers/axios';
import {
    IDataManager,
    IDrillDownFilter,
    IDrillDownRequest,
    IDrillDownResponse,
    IPivotData,
    IPivotFilter,
    IPivotFilterGroup,
    IPivotParams,
    IPivotParamsHeader,
    IPivotTable,
    TPivotSort,
} from '../services/PivotTableService/types';
import { IFetchOptions, INewPluginPivotArgs } from '../types';

enum TYPES_ITEM_LIST {
    COLUMNS = 'columns',
    ROWS = 'rows',
    VALUES = 'values',
    FILTER = 'filter',
}

export type OnFetchStartCallback = (value: any) => void;
export type OnFetchEndCallback = (value: any) => void;
export type OnFetchErrorCallback = (value: any) => void;

export class SredaPivotDataManager implements IDataManager {
    queue: PQueue;

    params: IPivotParams;

    /**
     * When `true`, drill-down sends a single batched request with
     * `systemWhereItems`. When `false` (default), fires separate
     * requests per `systemWhere` — backward-compatible.
     */
    private useSingleDrillRequest = false;

    private onFetchStartCallback?: OnFetchStartCallback;

    private onFetchEndCallback?: OnFetchEndCallback;

    private onFetchErrorCallback?: OnFetchErrorCallback;

    constructor(
        private cubeId: string,
        pivotParams: INewPluginPivotArgs,
        private server?: string,
        reqLimit?: number,
        private options?: IFetchOptions,
    ) {
        const concurrency = Number(reqLimit) || Infinity;

        this.queue = new PQueue({ concurrency });

        this.params = this.getBodyForCreatePivot(pivotParams);
    }

    // ────────────────────────────────────────────────────────────────────
    //  Configuration
    // ────────────────────────────────────────────────────────────────────

    setUseSingleDrillRequest(enabled: boolean): void {
        this.useSingleDrillRequest = enabled;
    }

    setOnFetchStartCallback(callback: OnFetchStartCallback): void {
        this.onFetchStartCallback = callback;
    }

    setOnFetchEndCallback(callback: OnFetchEndCallback): void {
        this.onFetchEndCallback = callback;
    }

    setOnFetchErrorCallback(callback: OnFetchErrorCallback): void {
        this.onFetchErrorCallback = callback;
    }

    // ────────────────────────────────────────────────────────────────────
    //  Where / Order / Params helpers
    // ────────────────────────────────────────────────────────────────────

    getWhereParamsRecursive = (
        andArray: IPivotFilterGroup[],
        items: INewPluginPivotArgs[TYPES_ITEM_LIST],
        parentKey?: string,
    ) => {
        for (const item of items) {
            const filters = (item?.filter ?? []).filter(
                (f) => f.value === 0 || f.value || f.from === 0 || f.from || f.to === 0 || f.to,
            );
            const key = [parentKey, item.name].filter(Boolean).join('.');

            const fieldFilters: IPivotFilterGroup = {};
            for (const filter of filters) {
                const fieldItem: IPivotFilter = { [key]: {} };
                if (filter?.filterBy && filter.filterBy !== '') {
                    if (filter.filterBy === '$between') {
                        const between: IPivotFilter = {};

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

                        if (['$startsWith', '$iLike', '$endsWith'].includes(filter.filterBy)) {
                            filterOperator = '$iLike';
                            switch (filter.filterBy) {
                                case '$startsWith':
                                    suffix = '%';
                                    break;
                                case '$endsWith':
                                    prefix = '%';
                                    break;
                                default:
                                    prefix = '%';
                                    suffix = '%';
                                    break;
                            }
                        }

                        fieldItem[key] = {
                            [filterOperator]: `${prefix}${filter.value}${suffix}`,
                        };
                    }
                } else if (filter.value === 0 || filter.value) {
                    fieldItem[key] = { $eq: filter.value };
                }

                if (typeof filter.level !== 'undefined') {
                    (fieldItem[key] as IPivotFilter).__level__ = filter.level;
                }

                if (filter.__level__ != null && typeof filter.__level__ === 'object') {
                    (fieldItem[key] as IPivotFilter).__level__ = filter.level ?? filter.__level__;
                }

                const comparison = filter.comparison ?? 'or';
                fieldFilters[`$${comparison}`] ??= [];
                (fieldFilters[`$${comparison}`] as IPivotFilterGroup[]).push(fieldItem as unknown as IPivotFilterGroup);
            }

            if (Object.keys(fieldFilters).length) {
                andArray.push(fieldFilters);
            }

            if (item.hasChild && item.child?.length) {
                andArray = this.getWhereParamsRecursive(andArray, item.child, key);
            }
        }

        return andArray;
    };

    getWhereParams = (pivotParams: INewPluginPivotArgs): IPivotFilterGroup => {
        let where: IPivotFilterGroup = {};

        const $and: IPivotFilterGroup[] = [];
        for (const type of Object.values(TYPES_ITEM_LIST)) {
            if (!pivotParams[type]) continue;

            const result = this.getWhereParamsRecursive($and, pivotParams[type]);

            if (result.length > 0) where = { $and: result };
        }

        return where;
    };

    getOrderParams = (pivotParams: INewPluginPivotArgs) => {
        const orderData: IPivotParams['order'] = {};

        const recursive = (order: TPivotSort[], items: INewPluginPivotArgs[TYPES_ITEM_LIST], parent?: string) => {
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

    getCleanParams = (array: INewPluginPivotArgs[TYPES_ITEM_LIST]): IPivotParamsHeader[] => {
        const allowed = ['id', 'name', 'sqlName', 'label', 'description', 'ref', 'manifest', 'type', 'format'] as const;

        const cleanArray: IPivotParamsHeader[] = [];

        if (array?.length > 0) {
            for (const item of array) {
                const cleanItem = allowed.reduce<IPivotParamsHeader>((acc, cur) => {
                    if ((item as any)[cur] != null) {
                        (acc as any)[cur] = (item as any)[cur];
                    }
                    return acc;
                }, {});

                if (item?.child && item.child.length > 0) {
                    cleanItem.child = this.getCleanParams(item.child);
                }

                cleanArray.push(cleanItem);
            }
        }

        return cleanArray;
    };

    getLayersParams = (pivotParams: INewPluginPivotArgs) =>
        this.getCleanParams(pivotParams.layers.filter((layer) => layer.isSelected));

    getBodyForCreatePivot = (pivotParams: INewPluginPivotArgs): IPivotParams => {
        const where = this.getWhereParams(pivotParams);
        const order = this.getOrderParams(pivotParams);
        const columns = this.getCleanParams(pivotParams?.columns);
        const rows = this.getCleanParams(pivotParams?.rows);
        const values = this.getCleanParams(pivotParams?.values);
        const layers = this.getLayersParams(pivotParams);
        const totals = {
            indexes: pivotParams.totals?.indices ?? pivotParams.rowsTotal,
            columns: pivotParams.totals?.columns ?? pivotParams.columnsTotal,
        };

        return {
            columns,
            rows,
            values,
            where,
            order,
            layers,
            totals: {
                ...totals,
                totals: totals.indexes && totals.columns,
            },
            isMask: pivotParams.isMask || false,
        };
    };

    static async poll(cubeId: string, answerId: string, server?: string, max = 1_000, delay = 2_000) {
        if (!cubeId) throw new Error('Не передан идентификатор инфосервиса');
        if (!answerId) throw new Error('Не передан идентификатор статуса построения среза');

        for (let i = 0; i < max; i++) {
            // eslint-disable-next-line no-await-in-loop
            const response = await $api.get(`${server}/metadata/cubes/${cubeId}/cube/${answerId}`);
            if (response.data?.status === 'ok') return response;
            if (response.data?.status === 'wait') {
                // eslint-disable-next-line no-await-in-loop
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, delay);
                });
            }
        }

        throw new Error('Превышено количество попыток получения статуса среза или сервер вернул неподходящий ответ');
    }

    private _fetch = async (id: string, params: IPivotParams, { sliceTraceId, signal, ...options }: IFetchOptions) =>
        $api
            .post(
                `${this.server}/metadata/cubes/${id}/cube`,
                { ...params, ...options },
                {
                    params: { sliceTraceId },
                    signal, // ← AbortSignal для отмены запроса
                },
            )
            .then(({ data }) => {
                if (data.status === 'ok') return data;

                if (data.status === 'wait') {
                    return SredaPivotDataManager.poll(id, data.answerId, this.server).then(({ data: rdata }) => rdata);
                }

                console.error(data);
                throw new Error('Сервер вернул неподходящий ответ');
            })
            .catch((e) => {
                // Обработка ошибки от AbortController
                if (e.name === 'AbortError' || e.message === 'canceled') {
                    console.info('[SredaPivotDataManager] Request cancelled');
                    // eslint-disable-next-line no-throw-literal
                    throw { status: 0, message: 'Request cancelled', type: 'ABORTED' };
                }

                const { status = -100, data: { message = '', stack = '', errors = [], payload = {} } = {} } =
                    e?.response || {};

                if (!errors?.length) {
                    errors.push({ message: e.toString(), stack: '' });
                }

                // eslint-disable-next-line no-throw-literal
                throw {
                    status,
                    message,
                    stack,
                    errors,
                    answerId: payload.answerId,
                    payload,
                };
            });

    fetch = (id: string, params: IPivotParams, options: { signal?: AbortSignal; isDrillDown?: boolean } = {}) => {
        const { signal } = options;

        return this.queue.add(async () => {
            this.onFetchStartCallback?.({ options });
            return this._fetch(id, params, { signal, ...options })
                .then((response) => {
                    const data = {
                        answerId: response.answerId,
                        data: response.table,
                        loadedRows: response.table?.data?.length ?? 0,
                        totalRows: response.totalRows ?? 0,
                        isLoadingTable: false,
                        status: response.status,
                    };

                    this.onFetchEndCallback?.({ data });
                    return data;
                })
                .catch((e) => {
                    this.onFetchErrorCallback?.({
                        title: 'Ошибка формирования куба данных',
                        ...e,
                    });
                    this.onFetchEndCallback?.({ data: e });
                    throw e;
                });
        });
    };

    // ────────────────────────────────────────────────────────────────────
    //  DrillDown — condition builders
    // ────────────────────────────────────────────────────────────────────

    private buildDrillDownSystemWhereItems(
        activeFilters: IDrillDownFilter[],
        targetDimensionName: string,
        targetLevel: number,
    ): IPivotFilter[] {
        // ── 1. Target condition ───────────────────────────────────────────
        const targetFilter = activeFilters
            .filter((f) => f.dimensionName === targetDimensionName)
            .sort((a, b) => b.level - a.level)[0];

        const targetCondition: Record<string, any> = {};
        if (targetFilter) {
            targetCondition[targetDimensionName] = {
                __parent__: targetFilter.value,
                __level__: targetLevel,
            };
        }

        // ── 2. Group cross-axis by dimension ──────────────────────────────
        const crossAxisByDim = new Map<string, IDrillDownFilter[]>();

        for (const filter of activeFilters) {
            if (filter.dimensionName === targetDimensionName) continue;

            if (!crossAxisByDim.has(filter.dimensionName)) {
                crossAxisByDim.set(filter.dimensionName, []);
            }
            crossAxisByDim.get(filter.dimensionName)!.push(filter);
        }

        // ── 3. Build option sets per cross-axis dimension ─────────────────
        const conditionSets: Array<Array<Record<string, any>>> = [];

        for (const [dimName, filters] of crossAxisByDim) {
            const sorted = [...filters].sort((a, b) => a.level - b.level);

            // First option: no condition -> root level data
            const options: Array<Record<string, any>> = [{}];

            for (const filter of sorted) {
                options.push({
                    [dimName]: {
                        __parent__: filter.value,
                        __level__: filter.level,
                    },
                });
            }

            conditionSets.push(options);
        }

        // ── 4. Cartesian product ──────────────────────────────────────────
        const combinations = SredaPivotDataManager.cartesianProduct(conditionSets);

        // ── 5. Merge each combination with the target condition ───────────
        return combinations.map((combo) => {
            const merged: Record<string, any> = { ...targetCondition };
            for (const part of combo) {
                Object.assign(merged, part);
            }
            return merged as unknown as IPivotFilter;
        });
    }

    private static cartesianProduct<T>(arrays: T[][]): T[][] {
        if (arrays.length === 0) return [[]];

        return arrays.reduce<T[][]>((acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])), [[]]);
    }

    private buildRowDeduplicationKey(row: Record<string, any>): string {
        const parts: string[] = [];

        for (const [key, value] of Object.entries(row)) {
            if (key.includes(':->:')) continue;
            if (key === '__no_ref__') continue;

            parts.push(`${key}=${String(value ?? '')}`);
        }

        return parts.sort().join('|');
    }

    private mergeResponseTables(tables: IPivotTable[]): IPivotTable {
        if (tables.length === 0) {
            return { rows: [], refFields: {}, hierarchyFields: {}, viewField: {}, order: [] };
        }

        if (tables.length === 1) {
            return tables[0];
        }

        const merged: IPivotTable = {
            rows: [],
            refFields: {},
            hierarchyFields: {},
            viewField: { ...tables[0].viewField },
            order: [...tables[0].order],
        };

        const seenRowKeys = new Set<string>();

        for (const table of tables) {
            for (const row of table.rows) {
                const key = this.buildRowDeduplicationKey(row);

                if (!seenRowKeys.has(key)) {
                    seenRowKeys.add(key);
                    merged.rows.push(row);
                }
            }
        }

        for (const table of tables) {
            for (const [dimName, refs] of Object.entries(table.refFields)) {
                merged.refFields[dimName] = { ...(merged.refFields[dimName] ?? {}), ...refs };
            }
        }

        for (const table of tables) {
            Object.assign(merged.hierarchyFields, table.hierarchyFields);
        }

        for (const table of tables) {
            Object.assign(merged.viewField, table.viewField);
        }

        return merged;
    }

    // ────────────────────────────────────────────────────────────────────
    //  DrillDown — Single request mode
    // ────────────────────────────────────────────────────────────────────

    /**
     * Sends a batched drill-down request (`systemWhereItems`) alongside
     * a separate base request (no `systemWhere`).
     *
     * Returns drill-down children table and the fresh base table separately.
     */
    private async fetchDrillDownSingle(
        systemWhereItems: IPivotFilter[],
        options?: { signal?: AbortSignal },
    ): Promise<{ drillTable: IPivotTable; baseTable: IPivotTable }> {
        // Base request — always sent, no systemWhere
        const basePromise = this.fetch(
            this.cubeId,
            { ...this.params, where: this.params.where },
            {
                signal: options?.signal,
                ...(this.options ?? {}),
            },
        );

        if (systemWhereItems.length === 0) {
            const baseResponse = await basePromise;
            return { drillTable: baseResponse.data, baseTable: baseResponse.data };
        }

        // Batched drill request
        const drillPromise = this.fetch(
            this.cubeId,
            {
                ...this.params,
                where: this.params.where,
                systemWhere: systemWhereItems,
            },
            { signal: options?.signal, ...(this.options ?? {}) },
        );

        const [baseResponse, drillResponse] = await Promise.all([basePromise, drillPromise]);

        return {
            drillTable: drillResponse.data,
            baseTable: baseResponse.data,
        };
    }

    // ────────────────────────────────────────────────────────────────────
    //  DrillDown — Multi-request mode (backward compatibility)
    // ────────────────────────────────────────────────────────────────────

    /**
     * Sends separate parallel requests, one per `systemWhere` item,
     * **plus one base request without `systemWhere`** to guarantee
     * fresh root-level data.
     *
     * Returns drill-down children table and the fresh base table separately.
     */
    private async fetchDrillDownMultiple(
        systemWhereItems: IPivotFilter[],
        options?: { signal?: AbortSignal },
    ): Promise<{ drillTable: IPivotTable; baseTable: IPivotTable }> {
        // Base request — always sent, no systemWhere
        const basePromise = this.fetch(
            this.cubeId,
            { ...this.params, where: this.params.where },
            {
                signal: options?.signal,
                ...(this.options ?? {}),
            },
        );

        if (systemWhereItems.length === 0) {
            const baseResponse = await basePromise;
            return { drillTable: baseResponse.data, baseTable: baseResponse.data };
        }

        // Drill-specific requests
        const drillPromises = systemWhereItems.map((systemWhere) => {
            const drillParams: IPivotParams = {
                ...this.params,
                where: this.params.where,
                systemWhere,
            };
            return this.fetch(this.cubeId, drillParams, { signal: options?.signal, ...(this.options ?? {}) });
        });

        const [baseResponse, ...drillResponses] = await Promise.all([basePromise, ...drillPromises]);

        const drillTable =
            drillResponses.length === 1
                ? drillResponses[0].data
                : this.mergeResponseTables(drillResponses.map((r) => r.data).filter(Boolean));

        return {
            drillTable,
            baseTable: baseResponse.data,
        };
    }

    // ────────────────────────────────────────────────────────────────────
    //  DrillDown — Public entry point
    // ────────────────────────────────────────────────────────────────────

    /**
     * Fetches DrillDown data.
     *
     * **Always sends one base request without `systemWhere`** alongside
     * the drill-down requests. The base response is returned as
     * `IDrillDownResponse.baseTable` so the controller can refresh
     * root-level data.
     *
     * Strategy:
     * - `useSingleDrillRequest = true` -> 1 base + 1 batched request
     * - `useSingleDrillRequest = false` (default) -> 1 base + N parallel requests
     */
    async fetchDrillDownData(request: IDrillDownRequest, options?: { signal?: AbortSignal }): Promise<IDrillDownResponse> {
        const systemWhereItems = this.buildDrillDownSystemWhereItems(
            request.activeFilters,
            request.dimensionName!,
            Math.max(request.level - 1, 0),
        );

        const { drillTable, baseTable } = this.useSingleDrillRequest
            ? await this.fetchDrillDownSingle(systemWhereItems, options)
            : await this.fetchDrillDownMultiple(systemWhereItems, options);

        return {
            table: drillTable,
            baseTable,
            metadata: {
                dimensionName: request.dimensionName,
                parentNodeId: request.nodeId,
                level: request.level,
            },
        };
    }

    fetchRootData = async (options?: { signal?: AbortSignal }): Promise<IPivotData> =>
        this.fetch(this.cubeId, this.params, { signal: options?.signal, ...(this.options ?? {}) }).then((response) => ({
            params: this.params,
            table: response.data,
        }));
}
